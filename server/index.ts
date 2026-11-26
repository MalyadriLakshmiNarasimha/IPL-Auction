import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager, AUCTION_TERMINATED_ERROR, ALL_MANAGERS_EXITED_REASON, ALL_MANAGERS_EXITED_MESSAGE } from './room';
import { initDatabase, initDatabaseWithRetry, validateProductionEnv, getPersistedResults } from './db';
import { applyCorsHeaders, isAllowedOrigin, getAllowedOrigins } from './cors';
import { ClientToServerEvents, ServerToClientEvents, Reaction, ChatMessage } from '../src/shared/types';
import { MAX_ROOM_PARTICIPANTS } from '../src/shared/constants';
import {
  validateSessionToken,
  AUTH_COOKIE_NAME,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSetCookieHeader,
  getClearCookieHeader,
  checkAuthRateLimit,
  resetAuthRateLimit,
} from '../src/lib/auth';
import { db, prisma, checkMySqlConnection } from '../src/lib/db';
import { getPlayerById } from '../src/shared/player-data';
import { getPklPlayerById, getPklPlayerStats } from '../src/shared/pkl-player-data';
import { getIplCareerStats, getIplSeasonStats, resolvePlayerId } from '../src/shared/player-career-data';
import { parseCookie } from 'cookie';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

const server = http.createServer(async (req, res) => {
  // Centralized CORS policy enforcement
  const isPreflight = applyCorsHeaders(req, res);
  if (isPreflight) {
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // Helper to extract session token from Authorization header or HTTP-only cookie
  const extractToken = (): string => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    if (req.headers.cookie) {
      const parsed = parseCookie(req.headers.cookie);
      return parsed[AUTH_COOKIE_NAME] || '';
    }
    return '';
  };

  // Helper to parse JSON body
  const parseJsonBody = (): Promise<any> => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  };

  // Lightweight development-only HTTP API failure monitor
  if (process.env.NODE_ENV === 'development') {
    const origWriteHead = res.writeHead.bind(res);
    res.writeHead = ((statusCode: number, ...rest: any[]) => {
      if (statusCode >= 400) {
        console.warn(`[DEV-MONITOR][SERVER-API] ${req.method || 'GET'} ${url.pathname} -> HTTP ${statusCode}`);
      }
      return origWriteHead(statusCode, ...rest);
    }) as any;
  }

  // Health check: pings DB and returns 200 (connected) or 503 (disconnected)
  if (url.pathname === '/health') {
    const isConnected = await checkMySqlConnection(true);
    if (isConnected) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', db: 'connected', time: Date.now() }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'degraded', db: 'disconnected', error: 'Database connection failed', time: Date.now() }));
    }
    return;
  }

  // --- Authentication Endpoints ---

  // Register
  if (url.pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await parseJsonBody();
      const { name, email, password } = body;

      if (!name || typeof name !== 'string' || !email || typeof email !== 'string' || !password || typeof password !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Name, email, and password are required.' }));
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      if (cleanPassword(password).length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Password must be at least 6 characters.' }));
        return;
      }

      const existing = await db.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'An account with this email already exists.' }));
        return;
      }

      const password_hash = await hashPassword(password);
      const user = await db.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          password_hash,
        },
      });

      const { sessionToken } = await createSession(user.id);
      res.setHeader('Set-Cookie', getSetCookieHeader(sessionToken));
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        user: { id: user.id, name: user.name, email: user.email },
      }));
      return;
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Registration failed' }));
      return;
    }
  }

  // Login
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const rateCheck = checkAuthRateLimit(`login_${ip}`, 5, 60000);
      if (!rateCheck.allowed) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Too many failed login attempts. Please wait 1 minute.' }));
        return;
      }

      const body = await parseJsonBody();
      const { email, password } = body;

      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email and password are required.' }));
        return;
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const user = await db.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password.' }));
        return;
      }

      const isValid = await verifyPassword(String(password), user.password_hash);
      if (!isValid) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password.' }));
        return;
      }

      resetAuthRateLimit(`login_${ip}`);
      const { sessionToken } = await createSession(user.id);

      res.setHeader('Set-Cookie', getSetCookieHeader(sessionToken));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        user: { id: user.id, name: user.name, email: user.email },
      }));
      return;
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Login failed' }));
      return;
    }
  }

  // Logout
  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = extractToken();
    if (token) {
      try {
        await destroySession(token);
      } catch { }
    }
    res.setHeader('Set-Cookie', getClearCookieHeader());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Me (Session status)
  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const token = extractToken();
    if (!token) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: false, user: null }));
      return;
    }

    try {
      const sessionData = await validateSessionToken(token);
      if (!sessionData || !sessionData.user) {
        res.setHeader('Set-Cookie', getClearCookieHeader());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: false, user: null }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        authenticated: true,
        user: sessionData.user,
      }));
      return;
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: false, error: err.message }));
      return;
    }
  }

  // --- Room Endpoints ---

  // Create room endpoint (Protected: requires authenticated user)
  if (url.pathname === '/api/rooms' && req.method === 'POST') {
    // 1. Authenticate user from header or cookie
    const token = extractToken();
    let authenticatedUser: { id: string; name: string; email: string } | null = null;
    if (token) {
      const sessionData = await validateSessionToken(token);
      if (sessionData) {
        authenticatedUser = sessionData.user;
      }
    }

    try {
      const parsed = await parseJsonBody();

      // Allow bot simulation ONLY in test or explicit local non-production bot test mode
      const allowBotAuth = process.env.NODE_ENV === 'test' || (process.env.NODE_ENV !== 'production' && process.env.ALLOW_BOT_SIMULATION === 'true');
      const isBotTest = allowBotAuth && typeof parsed.host_session_id === 'string' && parsed.host_session_id.startsWith('bot-');
      if (!authenticatedUser && !isBotTest) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required to create a room.' }));
        return;
      }

      const hostId = authenticatedUser ? authenticatedUser.id : parsed.host_session_id;
      const hostName = authenticatedUser ? authenticatedUser.name : (parsed.host_display_name || 'Host');
      const sportType = parsed.sport_type === 'PKL' ? 'PKL' : 'IPL';
      const roomName = typeof parsed.room_name === 'string' && parsed.room_name.trim().length > 0
        ? parsed.room_name.trim().slice(0, 50)
        : (sportType === 'PKL' ? 'PKL Auction Room' : 'IPL Auction Room');

      // Generate unique 6-character room code (uppercase letters/numbers without confusing chars 0/O, 1/I)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      let attempts = 0;
      do {
        code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        attempts++;
      } while ((roomManager.getRoom(code) || await db.room.findUnique({ where: { room_code: code } }).catch(() => null)) && attempts < 10);

      // Persist room in database FIRST so FK constraints on commentary/participants succeed cleanly
      try {
        if (isBotTest) {
          try {
            await (prisma as any).user.upsert({
              where: { id: hostId },
              update: { name: hostName },
              create: {
                id: hostId,
                email: `${hostId}@test.local`,
                name: hostName,
                password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN',
              },
            });
          } catch {}
        }

        await db.room.create({
          data: {
            room_code: code,
            name: roomName,
            host_user_id: hostId,
            status: 'lobby',
            sport_type: sportType,
          },
        });
      } catch (dbErr: any) {
        if (process.env.NODE_ENV !== 'test') {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Database unavailable: unable to persist room' }));
          return;
        }
      }

      const room = roomManager.createRoom(
        code,
        roomName,
        hostId,
        hostName,
        sportType
      );

      // Save initial snapshot & host participant record so My Rooms reflects room immediately
      roomManager.saveRoomSnapshot(code, 'room_created').catch(() => {});
      if (authenticatedUser) {
        db.roomParticipant.upsert({
          where: { room_code_session_id: { room_code: code, session_id: hostId } },
          create: {
            room_code: code,
            user_id: hostId,
            session_id: hostId,
            display_name: hostName,
            is_host: true,
            is_spectator: false,
          },
          update: { user_id: hostId, display_name: hostName, is_host: true },
        }).catch(() => {});
      }

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ room_code: code, room_name: room.name }));
      return;
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // Check room status endpoint
  if (url.pathname.startsWith('/api/rooms/') && req.method === 'GET') {
    const parts = url.pathname.split('/');
    const code = parts[parts.length - 1].toUpperCase();
    const room = roomManager.getRoom(code);

    if (room) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          exists: true,
          room_code: room.room_code,
          name: room.name,
          status: room.status || 'live',
          phase: room.auction_state.phase,
          sport_type: room.settings.sport_type || 'IPL',
          participants_count: room.participants.size,
          termination_reason: room.termination_reason ?? null,
          terminated_at: room.terminated_at ?? null,
          terminated_by_system: Boolean(room.terminated_by_system),
        })
      );
      return;
    }

    try {
      const dbRoom: any = await db.room.findUnique({ where: { room_code: code } });
      if (dbRoom) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            exists: true,
            room_code: dbRoom.room_code,
            name: dbRoom.name,
            status: dbRoom.status,
            phase: dbRoom.status === 'terminated' ? 'terminated' : dbRoom.status === 'completed' ? 'completed' : 'lobby',
            sport_type: dbRoom.sport_type || 'IPL',
            participants_count: 1,
            termination_reason: dbRoom.termination_reason ?? null,
            terminated_at: dbRoom.terminated_at ? new Date(dbRoom.terminated_at).getTime() : null,
            terminated_by_system: Boolean(dbRoom.terminated_by_system),
          })
        );
        return;
      }
    } catch {}

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ exists: false, error: 'Room not found' }));
    return;
  }

  // Get persisted results permalink
  if (url.pathname.startsWith('/api/results/') && req.method === 'GET') {
    const parts = url.pathname.split('/');
    const code = parts[parts.length - 1].toUpperCase();

    getPersistedResults(code).then(results => {
      if (results) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Results not found for room ' + code }));
      }
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to retrieve results' }));
    });
    return;
  }

  // Get player statistics endpoint
  if (url.pathname.startsWith('/api/players/') && url.pathname.endsWith('/stats') && req.method === 'GET') {
    const parts = url.pathname.split('/');
    // e.g. /api/players/:id/stats -> parts: ['', 'api', 'players', ':id', 'stats']
    const rawId = decodeURIComponent(parts[3] || '').trim();
    if (!rawId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing player identifier', status: 'MAPPING_ERROR' }));
      return;
    }

    const resolvedId = resolvePlayerId(rawId) || rawId;
    const player = getPlayerById(resolvedId);

    if (!player) {
      const pklPlayer = getPklPlayerById(rawId);
      if (pklPlayer) {
        const pklStats = getPklPlayerStats(pklPlayer.id);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        });
        res.end(
          JSON.stringify({
            player_id: pklPlayer.id,
            canonical_name: pklPlayer.name,
            role: pklPlayer.role,
            position_detail: pklPlayer.position_detail,
            nationality: pklPlayer.nationality || pklPlayer.country,
            team: pklPlayer.team,
            sport: 'PKL',
            status: pklStats?.data_status || 'VERIFIED_S12',
            career: pklStats?.career || null,
            season_12: pklStats?.season_12 || null,
            stats_2026: pklPlayer.stats_2026,
          })
        );
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Player '${rawId}' not found in database registry`, status: 'MAPPING_ERROR' }));
      return;
    }

    const career = getIplCareerStats(resolvedId);
    const season = getIplSeasonStats(resolvedId);

    const overallStatus =
      career.status === 'GENUINE_IPL_DEBUTANT'
        ? 'GENUINE_IPL_DEBUTANT'
        : career.status || 'VERIFIED';

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    });
    res.end(
      JSON.stringify({
        player_id: player.id,
        canonical_name: player.name,
        role: player.role,
        nationality: player.nationality || player.country,
        team: player.team,
        status: overallStatus,
        career,
        season_2026: season,
      })
    );
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// Helper for password length check
function cleanPassword(pw: any): string {
  return typeof pw === 'string' ? pw : '';
}

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: (origin, callback) => {
      // Check origin against centralized allowed origins
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin not allowed: ${origin}`), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

export const roomManager = new RoomManager(io);

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    const cookieHeader = socket.handshake.headers.cookie || (socket.request as any)?.headers?.cookie;
    if (!token && cookieHeader) {
      const parsed = parseCookie(cookieHeader);
      token = parsed[AUTH_COOKIE_NAME];
    }

    const allowBotAuth = process.env.NODE_ENV === 'test' || (process.env.NODE_ENV !== 'production' && process.env.ALLOW_BOT_SIMULATION === 'true');

    if (!token) {
      // In automated test runs with bots, accept bot-auth tokens strictly outside production
      if (allowBotAuth && socket.handshake.auth?.isBotTest && socket.handshake.auth?.botUser) {
        (socket as any).user = socket.handshake.auth.botUser;
        return next();
      }
      return next(new Error('Authentication required: Missing session token'));
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      // Allow bot simulation test tokens strictly outside production
      if (allowBotAuth && token.startsWith('bot_token_')) {
        const botId = token.replace('bot_token_', '');
        (socket as any).user = {
          id: botId,
          name: socket.handshake.auth?.displayName || `Bot ${botId}`,
          email: `${botId}@bot.local`,
        };
        return next();
      }
      return next(new Error('Authentication required: Invalid or expired session'));
    }

    (socket as any).user = sessionData.user;
    next();
  } catch (err: any) {
    return next(new Error(`Authentication failed: ${err.message}`));
  }
});

// Rate limiting maps
const chatRateLimit = new Map<string, number>();
const reactionRateLimit = new Map<string, { count: number; resetAt: number }>();

io.on('connection', socket => {
  const user = (socket as any).user;
  if (!user) {
    socket.disconnect(true);
    return;
  }

  const userId = user.id;
  const userName = user.name;
  let boundRoomCode: string | null = null;

  // Join personal user room for private events (bid_rejected, errors, etc.)
  socket.join(userId);

  socket.on('room_join', async data => {
    if (!data || !data.room_code || typeof data.room_code !== 'string') {
      socket.emit('error_message', { message: 'Invalid or missing room code.' });
      return;
    }
    const { room_code } = data;
    boundRoomCode = room_code.toUpperCase();

    if (roomManager.isRoomRestoring(boundRoomCode)) {
      socket.emit('error_message', { message: 'Room is currently restoring from persistence snapshot. Please retry in a moment.' });
      return;
    }

    // Auto-hydrate room from MySQL if not yet in memory
    let room = roomManager.getRoom(boundRoomCode);
    if (!room) {
      try {
        const dbRoom: any = await db.room.findUnique({ where: { room_code: boundRoomCode } });
        if (dbRoom) {
          const restored = await roomManager.restoreRoomFromSnapshot(boundRoomCode);
          if (restored) {
            room = restored;
          } else {
            room = roomManager.createRoom(
              dbRoom.room_code,
              dbRoom.name,
              dbRoom.host_user_id,
              'Host',
              dbRoom.sport_type === 'PKL' ? 'PKL' : 'IPL'
            );
          }

          // Ensure DB terminated status is authoritative even if snapshot was missing/older
          if (dbRoom.status === 'terminated' && !roomManager.isRoomTerminated(room)) {
            room.status = 'terminated';
            room.termination_reason = dbRoom.termination_reason || ALL_MANAGERS_EXITED_REASON;
            room.terminated_at = dbRoom.terminated_at ? new Date(dbRoom.terminated_at).getTime() : Date.now();
            room.terminated_by_system = dbRoom.terminated_by_system ?? true;
            room.auction_state.phase = 'terminated';
            room.auction_state.status = 'terminated';
            room.auction_state.termination_reason = room.termination_reason;
            room.auction_state.terminated_at = room.terminated_at;
            room.auction_state.terminated_by_system = room.terminated_by_system;
            room.auction_state.termination_message = ALL_MANAGERS_EXITED_MESSAGE;
          }
        }
      } catch (err: any) {
        console.warn(`[SERVER room_join] Database lookup error for ${boundRoomCode}:`, err.message);
      }
    }

    if (room && roomManager.isRoomTerminated(room)) {
      roomManager.joinRoom(boundRoomCode, userId, userName, socket.id, data.is_spectator || false);
      return;
    }

    socket.join(boundRoomCode);
    const joinedRoom = roomManager.joinRoom(boundRoomCode, userId, userName, socket.id, data.is_spectator || false);
    if (!joinedRoom) {
      socket.emit('error_message', { message: `Room not found or maximum limit reached (${MAX_ROOM_PARTICIPANTS}).` });
    }
  });

  const rejectIfTerminated = (roomCode?: string): boolean => {
    if (!roomCode) return false;
    const room = roomManager.getRoom(roomCode);
    if (room && roomManager.isRoomTerminated(room)) {
      socket.emit('error_message', {
        code: AUCTION_TERMINATED_ERROR,
        message: `${AUCTION_TERMINATED_ERROR}: ${room.auction_state.termination_message || ALL_MANAGERS_EXITED_MESSAGE}`,
      });
      return true;
    }
    return false;
  };

  socket.on('set_team_name', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const result = roomManager.setTeamName(data.room_code, userId, data.team_name, data.team_color);
    if (!result.success) {
      socket.emit('error_message', { message: result.reason || 'Failed to update team name.' });
    }
  });

  socket.on('announcement_completed', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.handleClientAnnouncementCompleted(data.room_code, userId, data.player_id);
  });

  socket.on('franchise_pick', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const success = roomManager.pickFranchise(data.room_code, userId, data.franchise);
    if (!success) {
      socket.emit('error_message', { message: 'Franchise or color already taken by another participant.' });
    }
  });

  socket.on('settings_update', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.updateSettings(data.room_code, userId, data.settings);
  });

  socket.on('start_auction', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.startAuction(data.room_code, userId);
  });

  socket.on('place_bid', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const bidAmount = (data.increment ?? (data as any).amount) || 0;
    roomManager.placeBid(
      data.room_code,
      userId,
      bidAmount,
      Boolean((data as any).is_explicit_amount || (data as any).is_custom)
    );
  });

  socket.on('withdraw_bid', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.withdrawBid(data.room_code, userId);
  });

  socket.on('pass_player', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.passPlayer(data.room_code, userId);
  });

  socket.on('host_pause', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.pauseAuction(data.room_code, userId);
  });

  socket.on('host_resume', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.resumeAuction(data.room_code, userId);
  });

  socket.on('host_skip', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.skipPlayer(data.room_code, userId);
  });

  socket.on('host_end_auction', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.endAuctionEarly(data.room_code, userId);
  });

  socket.on('host_kick', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.kickParticipant(data.room_code, userId, data.target_participant_id);
  });

  socket.on('host_transfer', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.transferHost(data.room_code, userId, data.new_host_participant_id);
  });

  socket.on('request_sync', data => {
    if (!data?.room_code) return;
    const room = roomManager.getRoom(data.room_code);
    if (room && room.participants.has(userId)) {
      if (roomManager.isRoomTerminated(room)) {
        socket.emit('auction_terminated', {
          roomCode: room.room_code,
          reason: room.termination_reason || ALL_MANAGERS_EXITED_REASON,
          terminatedAt: room.terminated_at || Date.now(),
          message: room.auction_state.termination_message || ALL_MANAGERS_EXITED_MESSAGE,
          sportType: room.settings.sport_type,
          participants: Array.from(room.participants.values()),
        });
        return;
      }
      roomManager.broadcastState(room);
    }
  });

  socket.on('request_next_player', data => {
    const targetRoomCode = data?.room_code || boundRoomCode;
    if (!targetRoomCode) return;
    if (rejectIfTerminated(targetRoomCode)) return;
    roomManager.requestNextPlayer(targetRoomCode, userId);
  });

  socket.on('room_leave', data => {
    const targetRoomCode = data?.room_code || boundRoomCode;
    if (!targetRoomCode) return;
    roomManager.leaveRoom(targetRoomCode, userId, socket.id);
    socket.leave(targetRoomCode);
  });

  // Stage Transitions
  socket.on('stage_change', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    const ok = roomManager.transitionStage(data.room_code, userId, data.stage, data.duration_seconds);
    if (!ok && data.stage === 'trading_window') {
      socket.emit('error_message', {
        message: 'Trade Round unlocks only once after Round 1 and Round 2 are both completed.',
      });
    }
  });

  // Spectator Toggle
  socket.on('toggle_spectator', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.setSpectatorMode(data.room_code, userId, data.is_spectator);
  });

  // Unsold Pool Configuration
  socket.on('unsold_pool_configure', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    const ok = roomManager.configureUnsoldPool(data.room_code, userId, data.player_ids, data.order_type);
    if (!ok) {
      socket.emit('error_message', {
        message: 'Cannot configure Round 2 unsold pool while Round 1 is still active or after Round 2 completion.',
      });
    }
  });

  // Player Trading Window Events
  socket.on('trade_propose', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const res = roomManager.proposeTrade(
      data.room_code,
      userId,
      data.target_participant_id,
      data.offered_player_id,
      data.requested_player_id
    );

    if (!res.success) {
      socket.emit('error_message', { message: res.error || 'Failed to propose trade.' });
    }
  });

  socket.on('trade_respond', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const res = roomManager.respondTrade(
      data.room_code,
      userId,
      data.trade_id,
      data.action,
      data.counter_player_id
    );

    if (!res.success) {
      socket.emit('error_message', { message: res.error || 'Failed to respond to trade.' });
    }
  });

  socket.on('trade_cancel', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.cancelTrade(data.room_code, userId, data.trade_id);
  });

  // Playing XI Selection Events
  socket.on('playing_xi_save_draft', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.savePlayingXIDraft(data.room_code, userId, data.submission);
  });

  socket.on('playing_xi_submit', data => {
    if (!data?.room_code) return;
    if (rejectIfTerminated(data.room_code)) return;
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const res = roomManager.submitPlayingXI(data.room_code, userId, data.submission);
    if (!res.success) {
      socket.emit('error_message', { message: res.error || 'Invalid Playing XI submission.' });
    }
  });

  // Rate-limited Chat
  socket.on('send_chat', data => {
    if (!data?.room_code || !data?.message) return;
    const now = Date.now();
    const lastChat = chatRateLimit.get(userId) || 0;
    if (now - lastChat < 500) {
      return; // Rate limited (max 1 msg per 500ms)
    }
    chatRateLimit.set(userId, now);

    const room = roomManager.getRoom(data.room_code);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (!participant) return;

    const cleanMessage = data.message.trim().slice(0, 160);
    if (!cleanMessage) return;

    const chatMsg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      participant_id: participant.id,
      display_name: participant.display_name,
      franchise_short_code: participant.franchise?.short_code,
      franchise_color: participant.franchise?.color,
      message: cleanMessage,
      timestamp: Date.now(),
    };

    roomManager.addChatMessage(data.room_code, chatMsg);
  });

  // Rate-limited Reactions
  socket.on('send_reaction', data => {
    if (!data?.room_code || !data?.emoji) return;
    const now = Date.now();
    const userLimit = reactionRateLimit.get(userId);

    if (userLimit && now < userLimit.resetAt) {
      if (userLimit.count >= 4) {
        return; // Max 4 reactions per second
      }
      userLimit.count++;
    } else {
      reactionRateLimit.set(userId, { count: 1, resetAt: now + 1000 });
    }

    const room = roomManager.getRoom(data.room_code);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (!participant) return;

    const reaction: Reaction = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      participant_id: participant.id,
      display_name: participant.display_name,
      franchise_color: participant.team_color || participant.franchise?.color || '#DCC477',
      emoji: data.emoji,
      timestamp: Date.now(),
    };

    roomManager.addReaction(data.room_code, reaction);
  });

  socket.on('disconnect', (reason) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DEV-MONITOR][SOCKET] Disconnected user=${userId} room=${boundRoomCode || 'none'} reason=${reason}`);
    }
    roomManager.handleDisconnect(socket.id);
  });
});

export async function startServer(port = PORT): Promise<http.Server> {
  // 1. Validate environment in production (no hardcoded secret fallbacks)
  validateProductionEnv();

  // 2. Bind port immediately so Render / edge proxies find an active listening server
  await new Promise<void>((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`[IPL-AUCTION SERVER] Authoritative Server running on port ${port}`);
      resolve();
    });
  });

  // 3. Initialize database with retry backoff and restore active rooms
  try {
    const dbConnected = await initDatabaseWithRetry(process.env.NODE_ENV === 'production' ? 5 : 2, 500);
    if (dbConnected) {
      try {
        await roomManager.restoreAllActiveRoomsFromDb();
      } catch (restoreErr: any) {
        console.error('[SERVER] Error restoring active rooms on boot:', restoreErr);
      }
    }
  } catch (err: any) {
    console.error('[SERVER] Error during DB init on boot:', err.message);
  }

  return server;
}

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  console.log(`[SERVER] Received ${signal}. Performing graceful shutdown...`);
  roomManager.stopPeriodicSnapshotLoop();
  try {
    await roomManager.snapshotAllActiveRooms();
    console.log('[SERVER] Active rooms successfully snapshotted before shutdown.');
  } catch (err) {
    console.error('[SERVER] Error saving snapshots during shutdown:', err);
  }
  server.close(() => {
    console.log('[SERVER] Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (process.env.NODE_ENV === 'development') {
  process.on('uncaughtException', (err) => {
    console.error('[DEV-MONITOR][UNCAUGHT_EXCEPTION]', err.message);
  });
  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.error('[DEV-MONITOR][UNHANDLED_REJECTION]', msg);
  });
}

// Auto-start if running index.ts directly
if (process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'))) {
  startServer();
}

export { server, io };
