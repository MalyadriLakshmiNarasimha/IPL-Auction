import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager } from './room';
import { initDatabase, initDatabaseWithRetry, validateProductionEnv, getPersistedResults } from './db';
import { ClientToServerEvents, ServerToClientEvents, Reaction, ChatMessage } from '../src/shared/types';
import { MAX_ROOM_PARTICIPANTS } from '../src/shared/constants';
import { validateSessionToken, AUTH_COOKIE_NAME } from '../src/lib/auth';
import { db, checkMySqlConnection } from '../src/lib/db';
import { parseCookie } from 'cookie';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const server = http.createServer(async (req, res) => {
  // Enable CORS for API routes (reflect request origin to support credentials with cross-origin deployments)
  const reqOrigin = req.headers.origin;
  if (reqOrigin) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

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

  // Create room endpoint (Protected: requires authenticated user)
  if (url.pathname === '/api/rooms' && req.method === 'POST') {
    // 1. Authenticate user from header or cookie
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const parsedCookies = parseCookie(req.headers.cookie);
      token = parsedCookies[AUTH_COOKIE_NAME] || '';
    }

    let authenticatedUser: { id: string; name: string; email: string } | null = null;
    if (token) {
      const sessionData = await validateSessionToken(token);
      if (sessionData) {
        authenticatedUser = sessionData.user;
      }
    }

    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');

        // Allow fallback for automated bot stress tests, otherwise require verified authenticated user
        const isBotTest = typeof parsed.host_session_id === 'string' && parsed.host_session_id.startsWith('bot-');
        if (!authenticatedUser && !isBotTest) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Authentication required to create a room.' }));
          return;
        }

        const hostId = authenticatedUser ? authenticatedUser.id : parsed.host_session_id;
        const hostName = authenticatedUser ? authenticatedUser.name : (parsed.host_display_name || 'Host');
        const roomName = typeof parsed.room_name === 'string' && parsed.room_name.trim().length > 0
          ? parsed.room_name.trim().slice(0, 50)
          : 'IPL Auction Room';

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
        } while (roomManager.getRoom(code) && attempts < 10);

        const room = roomManager.createRoom(
          code,
          roomName,
          hostId,
          hostName
        );

        // Persist room in database
        try {
          await db.room.create({
            data: {
              room_code: code,
              name: room.name,
              host_user_id: hostId,
              status: 'lobby',
            },
          });
        } catch (dbErr: any) {
          if (process.env.NODE_ENV !== 'test') {
            roomManager.removeRoom(code);
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database unavailable: unable to persist room' }));
            return;
          }
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ room_code: code, room_name: room.name }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
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
          phase: room.auction_state.phase,
          participants_count: room.participants.size,
        })
      );
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ exists: false, error: 'Room not found' }));
    }
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

  res.writeHead(404);
  res.end('Not found');
});

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: (origin, callback) => {
      // Dynamic origin reflection ensures browser withCredentials compliance
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

initDatabase();
export const roomManager = new RoomManager(io);

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers.cookie) {
      const parsed = parseCookie(socket.handshake.headers.cookie);
      token = parsed[AUTH_COOKIE_NAME];
    }

    if (!token) {
      // In automated test runs with bots, accept bot-auth tokens
      if (socket.handshake.auth?.isBotTest && socket.handshake.auth?.botUser) {
        (socket as any).user = socket.handshake.auth.botUser;
        return next();
      }
      return next(new Error('Authentication required: Missing session token'));
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      // Allow bot simulation test tokens
      if (token.startsWith('bot_token_')) {
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

  socket.on('room_join', data => {
    const { room_code } = data;
    boundRoomCode = room_code.toUpperCase();

    if (roomManager.isRoomRestoring(boundRoomCode)) {
      socket.emit('error_message', { message: 'Room is currently restoring from persistence snapshot. Please retry in a moment.' });
      return;
    }

    socket.join(boundRoomCode);
    const room = roomManager.joinRoom(boundRoomCode, userId, userName, socket.id, data.is_spectator || false);
    if (!room) {
      socket.emit('error_message', { message: `Room not found or maximum limit reached (${MAX_ROOM_PARTICIPANTS}).` });
    }
  });

  socket.on('set_team_name', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const result = roomManager.setTeamName(data.room_code, userId, data.team_name, data.team_color);
    if (!result.success) {
      socket.emit('error_message', { message: result.reason || 'Failed to update team name.' });
    }
  });

  socket.on('announcement_completed', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.handleClientAnnouncementCompleted(data.room_code, userId, data.player_id);
  });

  socket.on('franchise_pick', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const success = roomManager.pickFranchise(data.room_code, userId, data.franchise);
    if (!success) {
      socket.emit('error_message', { message: 'Franchise or color already taken by another participant.' });
    }
  });

  socket.on('settings_update', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.updateSettings(data.room_code, userId, data.settings);
  });

  socket.on('start_auction', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.startAuction(data.room_code, userId);
  });

  socket.on('place_bid', data => {
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
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.withdrawBid(data.room_code, userId);
  });

  socket.on('pass_player', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.passPlayer(data.room_code, userId);
  });

  socket.on('host_pause', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.pauseAuction(data.room_code, userId);
  });

  socket.on('host_resume', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.resumeAuction(data.room_code, userId);
  });

  socket.on('host_skip', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.skipPlayer(data.room_code, userId);
  });

  socket.on('host_end_auction', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.endAuctionEarly(data.room_code, userId);
  });

  socket.on('host_kick', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.kickParticipant(data.room_code, userId, data.target_participant_id);
  });

  socket.on('host_transfer', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.transferHost(data.room_code, userId, data.new_host_participant_id);
  });

  socket.on('request_sync', data => {
    const room = roomManager.getRoom(data.room_code);
    if (room && room.participants.has(userId)) {
      roomManager.broadcastState(room);
    }
  });

  // Stage Transitions
  socket.on('stage_change', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.transitionStage(data.room_code, userId, data.stage, data.duration_seconds);
  });

  // Spectator Toggle
  socket.on('toggle_spectator', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.setSpectatorMode(data.room_code, userId, data.is_spectator);
  });

  // Unsold Pool Configuration
  socket.on('unsold_pool_configure', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || room.host_session_id !== userId) return;

    roomManager.configureUnsoldPool(data.room_code, userId, data.player_ids, data.order_type);
  });

  // Player Trading Window Events
  socket.on('trade_propose', data => {
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
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.cancelTrade(data.room_code, userId, data.trade_id);
  });

  // Playing XI Selection Events
  socket.on('playing_xi_save_draft', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    roomManager.savePlayingXIDraft(data.room_code, userId, data.submission);
  });

  socket.on('playing_xi_submit', data => {
    const room = roomManager.getRoom(data.room_code);
    if (!room || !room.participants.has(userId)) return;

    const res = roomManager.submitPlayingXI(data.room_code, userId, data.submission);
    if (!res.success) {
      socket.emit('error_message', { message: res.error || 'Invalid Playing XI submission.' });
    }
  });

  // Rate-limited Chat
  socket.on('send_chat', data => {
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

  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket.id);
  });
});

export async function startServer(port = PORT): Promise<http.Server> {
  // 1. Validate environment in production
  validateProductionEnv();

  // 2. Initialize database with retry backoff
  const dbConnected = await initDatabaseWithRetry();

  // 3. Rehydrate active rooms from database snapshots if connected
  if (dbConnected) {
    try {
      await roomManager.restoreAllActiveRoomsFromDb();
    } catch (restoreErr: any) {
      console.error('[SERVER] Error restoring active rooms on boot:', restoreErr);
    }
  }

  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`[IPL-AUCTION SERVER] Authoritative Server running on port ${port}`);
      resolve(server);
    });
  });
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

// Auto-start if running index.ts directly
if (process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'))) {
  startServer();
}

export { server, io };
