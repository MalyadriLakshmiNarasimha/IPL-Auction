import {
  AuctionPhase,
  AuctionResults,
  AuctionState,
  Bid,
  ChatMessage,
  CommentaryEvent,
  FranchiseIdentity,
  OrderType,
  Participant,
  Player,
  PlayingXIScoreBreakdown,
  PlayingXISubmission,
  Reaction,
  RoomSettings,
  TradeOffer,
  TradeTransaction,
  WorkflowStage,
} from '../src/shared/types';
import { ALL_PLAYERS, getPlayerById } from '../src/shared/player-data';
import {
  generateCategoryWiseSequence,
  fisherYatesShuffle,
  getPlayerCategory,
  PlayerAuctionCategory,
} from '../src/shared/player-sequence';
import { buildPlayerIntroduction } from '../src/shared/voice-templates';
import { DEFAULT_ROOM_SETTINGS, MIN_RESERVE_PER_SLOT, formatCurrency, getMinAuctionParticipants, MAX_ROOM_PARTICIPANTS } from '../src/shared/constants';
import { validateBid, validateAuctionStart } from '../src/shared/validation';
import { validateTeamName, deriveTeamShortCode, normalizeTeamName } from '../src/shared/team-validation';
import {
  calculatePlayingXIScore,
  computeAuctionResults,
  computeParticipantMetrics,
} from '../src/shared/scoring';
import {
  persistResults,
  persistRoomSnapshot,
  loadLatestRoomSnapshot,
  loadAllActiveRoomCodes,
  recordBidEvent,
  SerializedRoomState,
} from './db';
import { db, prisma } from '../src/lib/db';
import { Server as SocketIOServer } from 'socket.io';

export interface RoomRecord {
  room_code: string;
  name: string;
  host_session_id: string;
  host_disconnect_time: number | null;
  settings: RoomSettings;
  participants: Map<string, Participant>;
  chat_messages: ChatMessage[];
  auction_state: AuctionState;
  pool: Player[];
  unsold_pool: Player[];
  all_completed_bids: {
    player_id: string;
    player: Player;
    bids_count: number;
    final_price: number;
    winner_id: string;
  }[];
  results: AuctionResults | null;
  timer_handle: NodeJS.Timeout | null;
  next_player_handle: NodeJS.Timeout | null;
  announcement_timeout_handle: NodeJS.Timeout | null;
  client_announcement_completions: Set<string>;
  is_processing_bid: boolean;
  current_player_passes: Set<string>;
  is_processing_unsold: boolean;
  closing_warning_bid_key?: string | null;

  // New Workflow State Additions
  stage: WorkflowStage;
  pending_trades: Map<string, TradeOffer>;
  completed_trades: TradeTransaction[];
  playing_xi_submissions: Map<string, PlayingXISubmission>;
  commentary_events: CommentaryEvent[];
}

export class RoomManager {
  private rooms: Map<string, RoomRecord> = new Map();
  private io: SocketIOServer;
  private periodicSnapshotHandle: NodeJS.Timeout | null = null;
  private restoringRooms: Set<string> = new Set();
  private snapshotQueue: Map<string, Promise<boolean>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.startPeriodicSnapshotLoop();
  }

  private startPeriodicSnapshotLoop() {
    if (this.periodicSnapshotHandle) clearInterval(this.periodicSnapshotHandle);
    this.periodicSnapshotHandle = setInterval(async () => {
      for (const room of this.rooms.values()) {
        if (room.auction_state.phase === 'bidding' || room.stage === 'trading_window') {
          await this.saveRoomSnapshot(room.room_code, 'periodic_loop');
        }
      }
    }, 5000);
  }

  public stopPeriodicSnapshotLoop() {
    if (this.periodicSnapshotHandle) {
      clearInterval(this.periodicSnapshotHandle);
      this.periodicSnapshotHandle = null;
    }
  }

  public isRoomRestoring(roomCode: string): boolean {
    return this.restoringRooms.has(roomCode.toUpperCase());
  }

  public getRoom(roomCode: string): RoomRecord | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  public getEligibleBidders(room: RoomRecord): Participant[] {
    return Array.from(room.participants.values()).filter(p => {
      const hasTeam = Boolean(p.team_name || p.franchise);
      const notSpectator = !p.is_spectator && p.role !== 'spectator';
      const hasSquadSlot = p.squad.length < room.settings.squad_size;
      return hasTeam && notSpectator && hasSquadSlot;
    });
  }

  public removeRoom(roomCode: string): void {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (room && room.timer_handle) {
      clearInterval(room.timer_handle);
    }
    this.rooms.delete(code);
  }

  public createRoom(roomCode: string, name: string, hostSessionId: string, hostDisplayName: string): RoomRecord {
    const code = roomCode.toUpperCase();
    const settings: RoomSettings = {
      ...DEFAULT_ROOM_SETTINGS,
      selected_player_ids: ALL_PLAYERS.map(p => p.id),
    };

    const hostParticipant: Participant = {
      id: hostSessionId,
      room_code: code,
      display_name: hostDisplayName,
      is_host: true,
      is_connected: true,
      is_spectator: false,
      role: 'host',
      last_active: Date.now(),
      franchise: null,
      purse_remaining: settings.purse,
      squad: [],
      has_withdrawn_current: false,
      amount_spent: 0,
      avg_purchase_price: 0,
      spent_by_role: { BAT: 0, BOWL: 0, AR: 0, WK: 0 },
      role_counts: { BAT: 0, BOWL: 0, AR: 0, WK: 0, overseas: 0 },
      squad_shortages: [],
      squad_excesses: [],
    };

    const participants = new Map<string, Participant>();
    participants.set(hostSessionId, hostParticipant);

    const initialAuctionState: AuctionState = {
      room_code: code,
      phase: 'lobby',
      stage: 'lobby',
      round_number: 1,
      current_player_index: 0,
      current_player: null,
      current_bid: 0,
      current_bidder_id: null,
      timer_seconds: settings.timer_seconds,
      timer_ends_at: 0,
      server_time: Date.now(),
      bids: [],
      withdrawn_participant_ids: [],
      pass_count: 0,
      total_eligible_passers: 0,
      passed_participant_ids: [],
      total_pool_count: settings.selected_player_ids.length,
      remaining_pool_count: settings.selected_player_ids.length,
      sold_count: 0,
      unsold_count: 0,
      is_paused: false,
    };

    const record: RoomRecord = {
      room_code: code,
      name,
      host_session_id: hostSessionId,
      host_disconnect_time: null,
      settings,
      participants,
      chat_messages: [],
      auction_state: initialAuctionState,
      pool: [],
      unsold_pool: [],
      all_completed_bids: [],
      results: null,
      timer_handle: null,
      next_player_handle: null,
      announcement_timeout_handle: null,
      client_announcement_completions: new Set(),
      is_processing_bid: false,
      current_player_passes: new Set(),
      is_processing_unsold: false,
      closing_warning_bid_key: null,
      stage: 'lobby',
      pending_trades: new Map(),
      completed_trades: [],
      playing_xi_submissions: new Map(),
      commentary_events: [],
    };

    this.rooms.set(code, record);
    this.addCommentary(record, `Auction room ${code} created. Welcome managers and spectators!`, 'stage');
    return record;
  }

  public joinRoom(
    roomCode: string,
    sessionId: string,
    displayName: string,
    socketId: string,
    isSpectator: boolean = false
  ): RoomRecord | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    let participant = room.participants.get(sessionId);
    if (participant) {
      participant.is_connected = true;
      participant.socket_id = socketId;
      participant.last_active = Date.now();
      if (participant.display_name !== displayName && displayName.trim().length > 0) {
        participant.display_name = displayName;
      }
      if (participant.id === room.host_session_id) {
        room.host_disconnect_time = null;
      }
    } else {
      if (room.participants.size >= MAX_ROOM_PARTICIPANTS) {
        return null;
      }
      const isHost = room.participants.size === 0;
      participant = {
        id: sessionId,
        socket_id: socketId,
        room_code: room.room_code,
        display_name: displayName || `Manager ${room.participants.size + 1}`,
        is_host: isHost,
        is_connected: true,
        is_spectator: isSpectator && !isHost,
        role: isHost ? 'host' : isSpectator ? 'spectator' : 'manager',
        last_active: Date.now(),
        franchise: null,
        purse_remaining: room.settings.purse,
        squad: [],
        has_withdrawn_current: false,
        amount_spent: 0,
        avg_purchase_price: 0,
        spent_by_role: { BAT: 0, BOWL: 0, AR: 0, WK: 0 },
        role_counts: { BAT: 0, BOWL: 0, AR: 0, WK: 0, overseas: 0 },
        squad_shortages: [],
        squad_excesses: [],
      };
    if (participant.is_host) {
        room.host_session_id = sessionId;
      }
      room.participants.set(sessionId, participant);
    }

    // Persist participant join in MySQL database
    db.roomParticipant.upsert({
      where: {
        room_code_session_id: {
          room_code: room.room_code,
          session_id: sessionId,
        },
      },
      create: {
        room_code: room.room_code,
        session_id: sessionId,
        display_name: participant.display_name,
        franchise_id: participant.franchise?.id || null,
        franchise_name: participant.franchise?.name || null,
        franchise_code: participant.franchise?.short_code || null,
        franchise_color: participant.franchise?.color || null,
        is_host: participant.is_host,
        is_spectator: participant.is_spectator,
      },
      update: {
        display_name: participant.display_name,
        is_spectator: participant.is_spectator,
      },
    }).catch(() => {});

    this.refreshParticipantMetrics(room);
    this.broadcastState(room);
    return room;
  }

  public setSpectatorMode(roomCode: string, sessionId: string, isSpectator: boolean): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    const participant = room.participants.get(sessionId);
    if (!participant || participant.is_host) return false;

    participant.is_spectator = isSpectator;
    participant.role = isSpectator ? 'spectator' : 'manager';
    if (isSpectator) {
      participant.franchise = null;
    }

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  public handleDisconnect(socketId: string) {
    for (const room of this.rooms.values()) {
      for (const p of room.participants.values()) {
        if (p.socket_id === socketId) {
          p.is_connected = false;
          p.last_active = Date.now();
          if (p.id === room.host_session_id) {
            room.host_disconnect_time = Date.now();
          }
          this.broadcastState(room);
          break;
        }
      }
    }
  }

  public pickFranchise(roomCode: string, sessionId: string, franchise: FranchiseIdentity): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    // Lock franchise selection once the auction starts
    if (room.auction_state.phase !== 'lobby') {
      return false;
    }

    const participant = room.participants.get(sessionId);
    if (!participant || participant.is_spectator) return false;

    // Prevent duplicate franchise selection within the same room
    for (const [id, p] of room.participants.entries()) {
      if (id !== sessionId && p.franchise) {
        if (
          p.franchise.id?.toLowerCase() === franchise.id?.toLowerCase() ||
          p.franchise.color.toLowerCase() === franchise.color.toLowerCase() ||
          p.franchise.short_code.toUpperCase() === franchise.short_code.toUpperCase()
        ) {
          return false;
        }
      }
    }

    participant.franchise = franchise;
    participant.team_name = franchise.name;
    participant.team_name_normalized = normalizeTeamName(franchise.name);
    participant.team_short_code = franchise.short_code;
    participant.team_color = franchise.color;
    this.refreshParticipantMetrics(room);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'franchise_picked').catch(() => {});

    // Synchronize & persist franchise selection in MySQL
    db.roomParticipant.upsert({
      where: {
        room_code_session_id: {
          room_code: room.room_code,
          session_id: sessionId,
        },
      },
      create: {
        room_code: room.room_code,
        session_id: sessionId,
        display_name: participant.display_name,
        team_name: franchise.name,
        team_name_normalized: normalizeTeamName(franchise.name),
        team_short_code: franchise.short_code,
        team_color: franchise.color,
        franchise_id: franchise.id,
        franchise_name: franchise.name,
        franchise_code: franchise.short_code,
        franchise_color: franchise.color,
        is_host: participant.is_host,
        is_spectator: false,
      },
      update: {
        team_name: franchise.name,
        team_name_normalized: normalizeTeamName(franchise.name),
        team_short_code: franchise.short_code,
        team_color: franchise.color,
        franchise_id: franchise.id,
        franchise_name: franchise.name,
        franchise_code: franchise.short_code,
        franchise_color: franchise.color,
        is_spectator: false,
      },
    }).catch(() => {});

    return true;
  }

  public setTeamName(
    roomCode: string,
    sessionId: string,
    teamName: string,
    teamColor?: string
  ): { success: boolean; reason?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, reason: 'Room not found.' };

    if (room.auction_state.phase !== 'lobby') {
      return { success: false, reason: 'Team name is locked once the auction starts.' };
    }

    const participant = room.participants.get(sessionId);
    if (!participant) return { success: false, reason: 'Participant not found.' };
    if (participant.is_spectator) return { success: false, reason: 'Spectators cannot set a team name.' };

    const existingNames = Array.from(room.participants.values())
      .filter(p => p.id !== sessionId && (p.team_name || p.franchise?.name))
      .map(p => (p.team_name || p.franchise!.name));

    const currentName = participant.team_name || participant.franchise?.name || null;
    const validation = validateTeamName(teamName, existingNames, currentName);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    const trimmed = teamName.trim().replace(/\s+/g, ' ');
    const shortCode = validation.shortCode || deriveTeamShortCode(trimmed);
    const color = teamColor || participant.team_color || participant.franchise?.color || '#F9CD05';

    participant.team_name = trimmed;
    participant.team_name_normalized = validation.normalized;
    participant.team_short_code = shortCode;
    participant.team_color = color;

    // Assign to franchise object for backwards compatibility across all views
    participant.franchise = {
      id: `custom_${sessionId}`,
      name: trimmed,
      short_code: shortCode,
      color,
    };

    this.refreshParticipantMetrics(room);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'team_name_set').catch(() => {});

    db.roomParticipant.upsert({
      where: {
        room_code_session_id: {
          room_code: room.room_code.toUpperCase(),
          session_id: sessionId,
        },
      },
      create: {
        room_code: room.room_code.toUpperCase(),
        session_id: sessionId,
        display_name: participant.display_name,
        team_name: trimmed,
        team_name_normalized: validation.normalized,
        team_short_code: shortCode,
        team_color: color,
        franchise_id: `custom_${sessionId}`,
        franchise_name: trimmed,
        franchise_code: shortCode,
        franchise_color: color,
        is_host: participant.is_host,
        is_spectator: false,
      },
      update: {
        team_name: trimmed,
        team_name_normalized: validation.normalized,
        team_short_code: shortCode,
        team_color: color,
        franchise_id: `custom_${sessionId}`,
        franchise_name: trimmed,
        franchise_code: shortCode,
        franchise_color: color,
        display_name: participant.display_name,
      },
    }).catch(() => {});

    this.io.to(room.room_code).emit('team_name_updated', {
      session_id: sessionId,
      team_name: trimmed,
      team_short_code: shortCode,
      team_color: color,
    });

    return { success: true };
  }

  public updateSettings(roomCode: string, sessionId: string, newSettings: Partial<RoomSettings>): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (room.auction_state.phase !== 'lobby') return false;

    room.settings = {
      ...room.settings,
      ...newSettings,
    };

    if (newSettings.purse) {
      for (const p of room.participants.values()) {
        p.purse_remaining = newSettings.purse;
      }
    }

    room.auction_state.timer_seconds = room.settings.timer_seconds;
    room.auction_state.total_pool_count = room.settings.selected_player_ids.length;
    room.auction_state.remaining_pool_count = room.settings.selected_player_ids.length;

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  public addCommentary(room: RoomRecord, text: string, type: CommentaryEvent['type']) {
    const event: CommentaryEvent = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      room_code: room.room_code,
      text,
      type,
      timestamp: Date.now(),
    };
    room.commentary_events.push(event);
    if (room.commentary_events.length > 50) {
      room.commentary_events.shift();
    }
    this.io.to(room.room_code).emit('commentary_broadcast', event);

    // Persist commentary event to database
    db.commentaryLog.create({
      data: {
        room_code: room.room_code,
        text,
        event_type: type,
      },
    }).catch(() => {});
  }

  public refreshParticipantMetrics(room: RoomRecord) {
    for (const p of room.participants.values()) {
      if (p.franchise) {
        const metrics = computeParticipantMetrics(p, room.settings);
        p.amount_spent = metrics.amount_spent;
        p.avg_purchase_price = metrics.avg_purchase_price;
        p.spent_by_role = metrics.spent_by_role;
        p.role_counts = metrics.role_counts;
        p.squad_shortages = metrics.squad_shortages;
        p.squad_excesses = metrics.squad_excesses;
      }
    }
  }

  public startAuction(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (room.auction_state.phase !== 'lobby') return false;

    const hostParticipant = room.participants.get(sessionId);
    const startValidation = validateAuctionStart(
      hostParticipant,
      Array.from(room.participants.values()),
      room.settings,
      ALL_PLAYERS.length
    );

    if (!startValidation.valid) {
      this.io.to(room.room_code).emit('error_message', {
        message: startValidation.reason || 'Cannot start auction.',
      });
      return false;
    }

    const selectedIds = new Set(room.settings.selected_player_ids);
    let selectedPlayers = ALL_PLAYERS.filter(p => selectedIds.has(p.id));
    if (selectedPlayers.length === 0) {
      selectedPlayers = [...ALL_PLAYERS];
    }

    this.sortPool(selectedPlayers, room.settings.order_type);

    room.pool = selectedPlayers;
    room.unsold_pool = [];
    room.auction_state.total_pool_count = room.pool.length;
    room.auction_state.remaining_pool_count = room.pool.length;
    room.auction_state.phase = 'starting';
    room.auction_state.stage = 'main_auction';
    room.stage = 'main_auction';
    room.auction_state.round_number = 1;
    room.auction_state.current_player_index = -1;

    db.room.updateMany({
      where: { room_code: room.room_code },
      data: { status: 'live' },
    }).catch(() => {});

    this.addCommentary(room, `🚀 LIVE MAIN AUCTION has officially begun! ${room.pool.length} players on the board.`, 'stage');
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'auction_started').catch(() => {});

    this.scheduleNextPlayer(room, 2500);

    return true;
  }

  private scheduleNextPlayer(room: RoomRecord, delayMs: number) {
    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }
    if (room.auction_state.phase === 'completed' || room.stage === 'championship_recap') {
      return;
    }
    room.next_player_handle = setTimeout(() => {
      room.next_player_handle = null;
      this.nextPlayer(room);
    }, delayMs);
  }

  private sortPool(pool: Player[], orderType: OrderType) {
    if (orderType === 'role') {
      // Authoritative Category Sequence:
      // 1. BATTERS -> 2. BOWLERS -> 3. ALL-ROUNDERS -> 4. WICKET KEEPERS
      // Unbiased Fisher-Yates shuffle within each category across all franchises.
      const sequenced = generateCategoryWiseSequence(pool);
      pool.splice(0, pool.length, ...sequenced);
    } else if (orderType === 'base_price') {
      pool.sort((a, b) => b.base_price - a.base_price);
    } else {
      const shuffled = fisherYatesShuffle(pool);
      pool.splice(0, pool.length, ...shuffled);
    }
  }

  public nextPlayer(room: RoomRecord) {
    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }

    if (room.auction_state.phase === 'completed' || room.stage === 'championship_recap') {
      return;
    }

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }

    const activeParticipants = Array.from(room.participants.values()).filter(
      p => !p.is_spectator && (p.franchise !== null || Boolean(p.team_name))
    );
    const allSquadsFull =
      activeParticipants.length > 0 &&
      activeParticipants.every(p => p.squad.length >= room.settings.squad_size);

    if (allSquadsFull || room.pool.length === 0) {
      if (
        room.auction_state.round_number === 1 &&
        room.settings.accelerated_round &&
        room.unsold_pool.length > 0 &&
        !allSquadsFull
      ) {
        room.auction_state.round_number = 2;
        room.auction_state.phase = 'unsold_round';
        room.auction_state.stage = 'unsold_auction';
        room.stage = 'unsold_auction';
        room.pool = [...room.unsold_pool];
        room.unsold_pool = [];
        room.auction_state.remaining_pool_count = room.pool.length;
        this.addCommentary(room, `⚡ ROUND 2: UNSOLD PLAYER AUCTION is underway! ${room.pool.length} re-entering players.`, 'stage');
        this.broadcastState(room);

        this.scheduleNextPlayer(room, 3000);
        return;
      }

      // Transition to Stage 3: Trading Window
      this.transitionStage(room.room_code, room.host_session_id, 'trading_window', 180);
      return;
    }

    const nextPlayer = room.pool.shift()!;
    const category = getPlayerCategory(nextPlayer);
    room.auction_state.current_player_index++;
    room.auction_state.current_player = nextPlayer;
    room.auction_state.current_category = category;
    room.auction_state.current_bid = 0;
    room.auction_state.current_bidder_id = null;
    room.auction_state.bids = [];
    room.auction_state.withdrawn_participant_ids = [];
    room.auction_state.passed_participant_ids = [];
    room.auction_state.pass_count = 0;
    room.auction_state.total_eligible_passers = this.getEligibleBidders(room).length;
    room.auction_state.remaining_pool_count = room.pool.length;
    room.auction_state.is_paused = false;
    room.current_player_passes.clear();
    room.is_processing_unsold = false;

    for (const p of room.participants.values()) {
      p.has_withdrawn_current = false;
    }

    // Sequence Step 1 & 2: Set Phase to ANNOUNCING
    room.auction_state.phase = 'announcing';
    room.auction_state.timer_ends_at = 0; // Timer does NOT run during announcement!
    room.client_announcement_completions = new Set();
    room.closing_warning_bid_key = null;

    if (room.announcement_timeout_handle) {
      clearTimeout(room.announcement_timeout_handle);
      room.announcement_timeout_handle = null;
    }

    const announcementText = buildPlayerIntroduction(nextPlayer);
    const wordCount = announcementText.split(/\s+/).length;
    // Optimized for natural 1.10x speech rate: eliminates unnecessary delays
    const announcementDurationMs = Math.max(3200, Math.min(5800, Math.round((wordCount / 2.7) * 1000) + 500));

    room.auction_state.announcement_text = announcementText;
    room.auction_state.announcement_duration_ms = announcementDurationMs;
    room.auction_state.announcement_started_at = Date.now();
    room.auction_state.announcement_ends_at = Date.now() + announcementDurationMs;

    this.addCommentary(room, announcementText, 'bid');

    this.io.to(room.room_code).emit('next_player', {
      player: nextPlayer,
      auction_state: this.getPublicState(room),
    });

    this.saveRoomSnapshot(room.room_code, 'next_player').catch(() => {});

    // Authoritative Server-Side Sequence: Bidding starts when announcement finishes
    room.announcement_timeout_handle = setTimeout(() => {
      this.startBiddingPhase(room);
    }, announcementDurationMs);
  }

  public startBiddingPhase(room: RoomRecord) {
    if (room.announcement_timeout_handle) {
      clearTimeout(room.announcement_timeout_handle);
      room.announcement_timeout_handle = null;
    }

    if (room.auction_state.phase !== 'announcing' || room.auction_state.is_paused) {
      return;
    }

    room.auction_state.phase = 'bidding';
    room.auction_state.total_eligible_passers = this.getEligibleBidders(room).length;
    room.auction_state.bidding_started_at = Date.now();
    const durationMs = room.settings.timer_seconds * 1000;
    room.auction_state.timer_ends_at = Date.now() + durationMs;

    this.io.to(room.room_code).emit('bidding_started', {
      player: room.auction_state.current_player!,
      timer_ends_at: room.auction_state.timer_ends_at,
      timer_seconds: room.settings.timer_seconds,
      auction_state: this.getPublicState(room),
    });

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'bidding_started').catch(() => {});
    this.startTimerLoop(room);
  }

  public handleClientAnnouncementCompleted(roomCode: string, sessionId: string, playerId: string) {
    const room = this.getRoom(roomCode);
    if (!room || room.auction_state.phase !== 'announcing' || room.auction_state.is_paused) return;
    if (room.auction_state.current_player?.id !== playerId) return;

    room.client_announcement_completions.add(sessionId);

    // If all active managers finished playback, we can start bidding after a short 400ms buffer
    const activeManagers = Array.from(room.participants.values()).filter(p => !p.is_spectator);
    const allCompleted =
      activeManagers.length > 0 &&
      activeManagers.every(p => room.client_announcement_completions.has(p.id));

    if (allCompleted) {
      if (room.announcement_timeout_handle) {
        clearTimeout(room.announcement_timeout_handle);
        room.announcement_timeout_handle = setTimeout(() => {
          this.startBiddingPhase(room);
        }, 400);
      }
    }
  }

  private startTimerLoop(room: RoomRecord) {
    if (room.timer_handle) {
      clearInterval(room.timer_handle);
    }

    room.timer_handle = setInterval(() => {
      const now = Date.now();

      if (room.host_disconnect_time && now - room.host_disconnect_time > 60000 && !room.auction_state.is_paused) {
        this.pauseAuction(room.room_code, room.host_session_id, true);
        this.io.to(room.room_code).emit('error_message', {
          message: 'Host has been disconnected for over 60 seconds. Auction automatically paused.',
        });
      }

      if (room.auction_state.is_paused) {
        return;
      }

      const remainingMs = Math.max(0, room.auction_state.timer_ends_at - now);
      const remainingSec = Math.ceil(remainingMs / 1000);

      this.io.to(room.room_code).emit('timer_tick', {
        timer_remaining: remainingSec,
        server_time: now,
      });

      // Final 5-second closing warning broadcast
      if (
        room.auction_state.phase === 'bidding' &&
        !room.auction_state.is_paused &&
        remainingSec === 5
      ) {
        const bidderId = room.auction_state.current_bidder_id;
        const bidder = bidderId ? room.participants.get(bidderId) : null;
        const currentBidKey = `${room.auction_state.current_player?.id || ''}_${room.auction_state.current_bid}_${bidderId || 'nobid'}`;

        if (room.closing_warning_bid_key !== currentBidKey) {
          room.closing_warning_bid_key = currentBidKey;
          this.io.to(room.room_code).emit('auction_closing_warning', {
            timer_remaining: 5,
            highest_bidder_team: bidder?.team_name || bidder?.franchise?.name || null,
            highest_bidder_short_code: bidder?.team_short_code || bidder?.franchise?.short_code || null,
            current_bid: room.auction_state.current_bid,
            player_name: room.auction_state.current_player?.name || null,
          });
        }
      }

      if (remainingMs <= 0) {
        clearInterval(room.timer_handle!);
        room.timer_handle = null;
        this.handleTimerExpired(room);
      }
    }, 200);
  }

  public placeBid(roomCode: string, sessionId: string, incrementOrAmount: number, isExplicitAmount: boolean = false): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    if (room.is_processing_bid) return false;
    room.is_processing_bid = true;

    try {
      const participant = room.participants.get(sessionId);
      const recipient = participant?.socket_id || sessionId;

      if (!participant || participant.is_spectator || participant.role === 'spectator') {
        this.io.to(recipient).emit('bid_rejected', { reason: 'Spectators cannot place bids.' });
        return false;
      }

      if (!participant.team_name && !participant.franchise) {
        this.io.to(recipient).emit('bid_rejected', { reason: 'Must set a team name to place bids.' });
        return false;
      }

      const validation = validateBid(participant, room.auction_state, room.settings, incrementOrAmount, isExplicitAmount);
      if (!validation.valid || !validation.expectedAmount) {
        this.io.to(recipient).emit('bid_rejected', { reason: validation.reason || 'Invalid bid.' });
        return false;
      }

      const newBidAmount = validation.expectedAmount;
      const player = room.auction_state.current_player!;

      const teamName = participant.team_name || participant.franchise?.name || participant.display_name;
      const teamShortCode = participant.team_short_code || participant.franchise?.short_code || deriveTeamShortCode(teamName);
      const teamColor = participant.team_color || participant.franchise?.color || '#F9CD05';

      const bidRecord: Bid = {
        id: `bid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        player_id: player.id,
        participant_id: participant.id,
        team_name: teamName,
        franchise_name: teamName,
        franchise_short_code: teamShortCode,
        franchise_color: teamColor,
        amount: newBidAmount,
        timestamp: Date.now(),
      };

      const previousBidderId = room.auction_state.current_bidder_id;
      room.auction_state.current_bid = newBidAmount;
      room.auction_state.current_bidder_id = participant.id;
      room.auction_state.bids.unshift(bidRecord);
      if (room.auction_state.bids.length > 10) {
        room.auction_state.bids.pop();
      }

      // Record bid event with sequence number in MySQL
      const bidSeq = room.auction_state.bids.length;
      recordBidEvent(
        room.room_code,
        player.id,
        bidSeq,
        participant.id,
        newBidAmount
      ).catch(() => {});

      const durationMs = room.settings.timer_seconds * 1000;
      room.auction_state.timer_ends_at = Date.now() + durationMs;
      room.closing_warning_bid_key = null;

      // Commentary generation
      const participantCode = participant.team_short_code || participant.franchise?.short_code || 'Bidder';
      if (room.auction_state.bids.length >= 4 && previousBidderId && previousBidderId !== participant.id) {
        const prevParticipant = room.participants.get(previousBidderId);
        const prevCode = prevParticipant?.team_short_code || prevParticipant?.franchise?.short_code || 'opponent';
        this.addCommentary(
          room,
          `🔥 BIDDING BATTLE! ${participantCode} fires back with ${formatCurrency(newBidAmount)} against ${prevCode}!`,
          'bidding_war'
        );
      } else {
        this.addCommentary(
          room,
          `${participantCode} raised the bid to ${formatCurrency(newBidAmount)}`,
          'bid'
        );
      }

      this.io.to(room.room_code).emit('bid_success', {
        bid: bidRecord,
        auction_state: this.getPublicState(room),
      });

      return true;
    } finally {
      room.is_processing_bid = false;
    }
  }

  public withdrawBid(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    // Follow pause policy without unintended transition
    if (room.auction_state.is_paused) {
      return false;
    }

    if (room.auction_state.phase !== 'bidding') return false;

    const participant = room.participants.get(sessionId);
    if (!participant) return false;

    const recipient = participant.socket_id || sessionId;

    // Reject spectator passes
    if (participant.is_spectator || participant.role === 'spectator') {
      this.io.to(recipient).emit('error_message', { message: 'Spectators cannot pass or bid.' });
      return false;
    }

    // Cannot pass while holding the highest bid
    if (room.auction_state.current_bidder_id === sessionId) {
      this.io.to(recipient).emit('error_message', { message: 'Cannot pass while holding the highest bid.' });
      return false;
    }

    // Duplicate pass protection
    if (room.current_player_passes.has(sessionId)) {
      return true;
    }

    participant.has_withdrawn_current = true;
    room.current_player_passes.add(sessionId);

    if (!room.auction_state.withdrawn_participant_ids.includes(sessionId)) {
      room.auction_state.withdrawn_participant_ids.push(sessionId);
    }
    room.auction_state.passed_participant_ids = Array.from(room.current_player_passes);
    room.auction_state.pass_count = room.current_player_passes.size;

    const eligibleBidders = this.getEligibleBidders(room);
    room.auction_state.total_eligible_passers = eligibleBidders.length;

    // Broadcast updated pass telemetry immediately
    this.io.to(room.room_code).emit('pass_updated', {
      pass_count: room.auction_state.pass_count,
      total_eligible: room.auction_state.total_eligible_passers,
      passed_participant_ids: room.auction_state.passed_participant_ids,
    });

    this.io.to(room.room_code).emit('withdraw_success', { participant_id: sessionId });

    // 1. INSTANT UNSOLD — UNANIMOUS PASS CONDITION (no active bids)
    if (
      room.auction_state.current_bid === 0 &&
      room.auction_state.phase === 'bidding' &&
      !room.auction_state.is_paused &&
      room.current_player_passes.size >= eligibleBidders.length &&
      eligibleBidders.length > 0
    ) {
      // Atomic guard to prevent race conditions from simultaneous final passes
      if (room.is_processing_unsold) return true;
      room.is_processing_unsold = true;

      // Invalidate and clear countdown timer immediately!
      if (room.timer_handle) {
        clearInterval(room.timer_handle);
        room.timer_handle = null;
      }

      const player = room.auction_state.current_player;
      this.addCommentary(
        room,
        `⚡ UNANIMOUS PASS (${room.current_player_passes.size}/${eligibleBidders.length})! ${player?.name || 'Player'} is immediately UNSOLD.`,
        'unsold'
      );

      // Process unsold transition via standard handleTimerExpired to ensure persistent DB state
      this.handleTimerExpired(room);
      return true;
    }

    // 2. ALL OTHER PARTICIPANTS WITHDRAWN (when valid bid exists)
    if (room.auction_state.current_bidder_id && room.auction_state.current_bid > 0) {
      const remainingNonWithdrawn = eligibleBidders.filter(
        p => !p.has_withdrawn_current && p.id !== room.auction_state.current_bidder_id
      );

      if (remainingNonWithdrawn.length === 0 && eligibleBidders.length >= 2) {
        if (room.timer_handle) {
          clearInterval(room.timer_handle);
          room.timer_handle = null;
        }
        this.handleTimerExpired(room);
        return true;
      }
    }

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  public passPlayer(roomCode: string, sessionId: string): boolean {
    return this.withdrawBid(roomCode, sessionId);
  }

  private handleTimerExpired(room: RoomRecord) {
    const player = room.auction_state.current_player;
    if (!player) return;

    if (room.auction_state.current_bidder_id && room.auction_state.current_bid > 0) {
      const winner = room.participants.get(room.auction_state.current_bidder_id)!;
      const finalPrice = room.auction_state.current_bid;

      winner.purse_remaining -= finalPrice;
      winner.squad.push({
        player_id: player.id,
        player,
        bought_for: finalPrice,
        timestamp: Date.now(),
      });

      room.auction_state.phase = 'sold';
      room.auction_state.sold_count++;

      room.all_completed_bids.push({
        player_id: player.id,
        player,
        bids_count: room.auction_state.bids.length,
        final_price: finalPrice,
        winner_id: winner.id,
      });

      this.refreshParticipantMetrics(room);

      const isRecord = room.all_completed_bids.every(b => finalPrice >= b.final_price);
      if (isRecord && finalPrice >= 15_00_00_000) {
        this.addCommentary(
          room,
          `💰 RECORD SIGNING! ${player.name} signs with ${winner.team_short_code || winner.franchise?.short_code || 'Team'} for ${formatCurrency(finalPrice)}!`,
          'record'
        );
      } else {
        this.addCommentary(
          room,
          `🔨 SOLD! ${player.name} acquired by ${winner.team_name || winner.franchise?.name || 'Team'} for ${formatCurrency(finalPrice)}`,
          'sold'
        );
      }

      this.io.to(room.room_code).emit('player_sold', {
        player,
        winner,
        price: finalPrice,
        auction_state: this.getPublicState(room),
      });

      this.saveRoomSnapshot(room.room_code, 'player_sold').catch(() => {});

      // Allow 5000ms for gavel hammer strike and sold voice announcement to complete before next player
      this.scheduleNextPlayer(room, 5000);
    } else {
      room.auction_state.phase = 'unsold';
      room.auction_state.unsold_count++;
      room.unsold_pool.push(player);

      this.addCommentary(
        room,
        `⚠️ UNSOLD: ${player.name} (${formatCurrency(player.base_price)}) remains unsold and joins the Unsold pool.`,
        'unsold'
      );

      this.io.to(room.room_code).emit('player_unsold', {
        player,
        auction_state: this.getPublicState(room),
      });

      this.saveRoomSnapshot(room.room_code, 'player_unsold').catch(() => {});

      // Allow 4500ms for gavel hammer strike and unsold voice announcement to complete before next player
      this.scheduleNextPlayer(room, 4500);
    }
  }

  public pauseAuction(roomCode: string, sessionId: string, force: boolean = false): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (!force && room.host_session_id !== sessionId) return false;
    if (
      (room.auction_state.phase !== 'bidding' && room.auction_state.phase !== 'announcing') ||
      room.auction_state.is_paused
    ) {
      return false;
    }

    if (room.auction_state.phase === 'announcing') {
      if (room.announcement_timeout_handle) {
        clearTimeout(room.announcement_timeout_handle);
        room.announcement_timeout_handle = null;
      }
      const remainingMs = Math.max(0, (room.auction_state.announcement_ends_at || Date.now()) - Date.now());
      room.auction_state.pause_remaining_ms = remainingMs;
    } else {
      if (room.timer_handle) {
        clearInterval(room.timer_handle);
        room.timer_handle = null;
      }
      const remainingMs = Math.max(0, room.auction_state.timer_ends_at - Date.now());
      room.auction_state.pause_remaining_ms = remainingMs;
    }

    room.auction_state.is_paused = true;

    this.io.to(room.room_code).emit('auction_paused');
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  public resumeAuction(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (!room.auction_state.is_paused) return false;

    if (room.auction_state.phase === 'announcing') {
      const remainingMs = room.auction_state.pause_remaining_ms || 3000;
      room.auction_state.announcement_ends_at = Date.now() + remainingMs;
      room.auction_state.is_paused = false;
      room.announcement_timeout_handle = setTimeout(() => {
        this.startBiddingPhase(room);
      }, remainingMs);
    } else {
      const remainingMs = room.auction_state.pause_remaining_ms || room.settings.timer_seconds * 1000;
      room.auction_state.timer_ends_at = Date.now() + remainingMs;
      room.auction_state.is_paused = false;
      this.startTimerLoop(room);
    }

    this.io.to(room.room_code).emit('auction_resumed', room.auction_state.timer_ends_at);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  public skipPlayer(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (room.auction_state.phase !== 'bidding' && room.auction_state.phase !== 'announcing') return false;

    if (room.announcement_timeout_handle) {
      clearTimeout(room.announcement_timeout_handle);
      room.announcement_timeout_handle = null;
    }

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }

    const player = room.auction_state.current_player;
    if (player) {
      room.unsold_pool.push(player);
    }

    room.auction_state.phase = 'unsold';
    this.addCommentary(room, `⏭️ ${player?.name || 'Player'} skipped by host.`, 'unsold');
    this.io.to(room.room_code).emit('player_unsold', {
      player: player!,
      auction_state: this.getPublicState(room),
    });

    room.auction_state.unsold_count++;
    this.scheduleNextPlayer(room, 2000);
    return true;
  }

  public endAuctionEarly(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }

    this.completeAuction(room);
    return true;
  }

  // =========================================================================
  // WORKFLOW STAGE TRANSITIONS
  // =========================================================================

  public transitionStage(
    roomCode: string,
    hostSessionId: string,
    newStage: WorkflowStage,
    durationSeconds?: number
  ): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (room.host_session_id !== hostSessionId) return false;

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }

    room.stage = newStage;
    room.auction_state.stage = newStage;

    if (newStage === 'main_auction') {
      room.auction_state.phase = 'bidding';
      // Generate sequence only once; never re-randomize an ongoing auction sequence
      if (room.auction_state.current_player_index < 0) {
        this.sortPool(room.pool, room.settings.order_type);
      }
      this.scheduleNextPlayer(room, 1000);
    } else if (newStage === 'unsold_auction') {
      room.auction_state.round_number = 2;
      room.auction_state.phase = 'unsold_round';
      if (room.pool.length === 0 && room.unsold_pool.length > 0) {
        room.pool = [...room.unsold_pool];
        room.unsold_pool = [];
      }
      this.addCommentary(room, `⚡ Stage changed to Unsold Auction round (${room.pool.length} players).`, 'stage');
      this.scheduleNextPlayer(room, 1500);
    } else if (newStage === 'trading_window') {
      room.auction_state.phase = 'trading';
      const dur = durationSeconds || 180;
      room.auction_state.stage_duration_seconds = dur;
      room.auction_state.stage_ends_at = Date.now() + dur * 1000;
      this.addCommentary(
        room,
        `🤝 PLAYER TRADING WINDOW OPEN! Player-for-player swaps active for ${Math.round(dur / 60)} minutes.`,
        'stage'
      );
    } else if (newStage === 'squad_evaluation') {
      room.auction_state.phase = 'evaluation';
      this.refreshParticipantMetrics(room);
      this.addCommentary(room, `📊 SQUAD EVALUATION: Post-auction 5-pillar scores calculated.`, 'stage');
    } else if (newStage === 'playing_xi_selection') {
      room.auction_state.phase = 'playing_xi';
      const dur = durationSeconds || 120;
      room.auction_state.stage_duration_seconds = dur;
      room.auction_state.stage_ends_at = Date.now() + dur * 1000;
      this.addCommentary(room, `🏏 PLAYING XI SELECTION ACTIVE! Managers, assemble your top 11 matchday squad.`, 'stage');
    } else if (newStage === 'playing_xi_evaluation' || newStage === 'championship_recap') {
      this.completeAuction(room);
      return true;
    }

    this.io.to(room.room_code).emit('stage_transitioned', {
      stage: newStage,
      auction_state: this.getPublicState(room),
    });

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  // =========================================================================
  // UNSOLD AUCTION CONFIGURATION
  // =========================================================================

  public configureUnsoldPool(
    roomCode: string,
    hostSessionId: string,
    playerIds: string[],
    orderType: OrderType = 'random'
  ): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== hostSessionId) return false;

    const idSet = new Set(playerIds);
    const chosen = room.unsold_pool.filter(p => idSet.has(p.id));
    if (chosen.length === 0) return false;

    this.sortPool(chosen, orderType);
    room.pool = chosen;
    room.unsold_pool = room.unsold_pool.filter(p => !idSet.has(p.id));
    room.auction_state.total_pool_count = room.pool.length;
    room.auction_state.remaining_pool_count = room.pool.length;
    room.auction_state.round_number = 2;
    room.auction_state.phase = 'unsold_round';
    room.auction_state.stage = 'unsold_auction';
    room.stage = 'unsold_auction';

    this.addCommentary(room, `Host re-entered ${chosen.length} selected unsold players for Round 2 bidding.`, 'stage');
    this.broadcastState(room);

    this.scheduleNextPlayer(room, 1500);

    return true;
  }

  // =========================================================================
  // PLAYER-FOR-PLAYER TRADING WINDOW
  // =========================================================================

  public proposeTrade(
    roomCode: string,
    senderId: string,
    targetId: string,
    offeredPlayerId: string,
    requestedPlayerId: string
  ): { success: boolean; error?: string; offer?: TradeOffer } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    const sender = room.participants.get(senderId);
    const target = room.participants.get(targetId);

    if (!sender || !target || !sender.franchise || !target.franchise) {
      return { success: false, error: 'Both participants must possess valid franchises' };
    }
    if (senderId === targetId) {
      return { success: false, error: 'Cannot trade with yourself' };
    }

    const offeredItem = sender.squad.find(s => s.player_id === offeredPlayerId);
    const requestedItem = target.squad.find(s => s.player_id === requestedPlayerId);

    if (!offeredItem) {
      return { success: false, error: 'You do not own the offered player' };
    }
    if (!requestedItem) {
      return { success: false, error: 'Target manager does not own the requested player' };
    }

    // Check if either player is already involved in a pending trade
    for (const trade of room.pending_trades.values()) {
      if (
        trade.status === 'pending' &&
        (trade.offered_player.id === offeredPlayerId ||
          trade.offered_player.id === requestedPlayerId ||
          trade.requested_player.id === offeredPlayerId ||
          trade.requested_player.id === requestedPlayerId)
      ) {
        return { success: false, error: 'One of the players is already involved in a pending trade offer' };
      }
    }

    const tradeOffer: TradeOffer = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      room_code: room.room_code,
      sender_id: sender.id,
      sender_name: sender.display_name,
      sender_franchise: sender.franchise,
      receiver_id: target.id,
      receiver_name: target.display_name,
      receiver_franchise: target.franchise,
      offered_player: offeredItem.player,
      requested_player: requestedItem.player,
      status: 'pending',
      timestamp: Date.now(),
    };

    room.pending_trades.set(tradeOffer.id, tradeOffer);

    if (target.socket_id) {
      this.io.to(target.socket_id).emit('trade_offer_received', tradeOffer);
    }

    this.addCommentary(
      room,
      `Trade proposed: ${sender.franchise.short_code} offered ${offeredItem.player.name} to ${target.franchise.short_code} for ${requestedItem.player.name}`,
      'trade'
    );

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'trade_proposed').catch(() => {});
    return { success: true, offer: tradeOffer };
  }

  public respondTrade(
    roomCode: string,
    receiverId: string,
    tradeId: string,
    action: 'accept' | 'reject' | 'counter',
    counterPlayerId?: string
  ): { success: boolean; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    const trade = room.pending_trades.get(tradeId);
    if (!trade) return { success: false, error: 'Trade offer not found' };

    if (trade.receiver_id !== receiverId && trade.sender_id !== receiverId) {
      return { success: false, error: 'Unauthorized to respond to this trade' };
    }

    if (action === 'reject') {
      trade.status = 'rejected';
      this.io.to(room.room_code).emit('trade_offer_updated', trade);
      this.addCommentary(
        room,
        `Trade declined: ${trade.receiver_franchise.short_code} declined offer from ${trade.sender_franchise.short_code}`,
        'trade'
      );
      this.broadcastState(room);
      this.saveRoomSnapshot(room.room_code, 'trade_rejected').catch(() => {});
      return { success: true };
    }

    if (action === 'counter' && counterPlayerId) {
      const counterPlayer = getPlayerById(counterPlayerId);
      if (!counterPlayer) return { success: false, error: 'Invalid counter player' };
      trade.status = 'countered';
      trade.counter_player = counterPlayer;
      this.io.to(room.room_code).emit('trade_offer_updated', trade);
      this.broadcastState(room);
      this.saveRoomSnapshot(room.room_code, 'trade_countered').catch(() => {});
      return { success: true };
    }

    if (action === 'accept') {
      const sender = room.participants.get(trade.sender_id);
      const target = room.participants.get(trade.receiver_id);
      if (!sender || !target) return { success: false, error: 'Participants no longer exist' };

      const senderItemIdx = sender.squad.findIndex(s => s.player_id === trade.offered_player.id);
      const targetItemIdx = target.squad.findIndex(s => s.player_id === trade.requested_player.id);

      if (senderItemIdx === -1 || targetItemIdx === -1) {
        trade.status = 'cancelled';
        this.io.to(room.room_code).emit('trade_offer_updated', trade);
        return { success: false, error: 'Player ownership changed; trade invalidated.' };
      }

      // Execute atomic swap
      const [swappedFromSender] = sender.squad.splice(senderItemIdx, 1);
      const [swappedFromTarget] = target.squad.splice(targetItemIdx, 1);

      sender.squad.push({
        player_id: swappedFromTarget.player_id,
        player: swappedFromTarget.player,
        bought_for: swappedFromSender.bought_for,
        timestamp: Date.now(),
      });

      target.squad.push({
        player_id: swappedFromSender.player_id,
        player: swappedFromSender.player,
        bought_for: swappedFromTarget.bought_for,
        timestamp: Date.now(),
      });

      trade.status = 'accepted';

      // Cancel other pending offers involving either player
      for (const other of room.pending_trades.values()) {
        if (
          other.id !== trade.id &&
          other.status === 'pending' &&
          (other.offered_player.id === trade.offered_player.id ||
            other.offered_player.id === trade.requested_player.id ||
            other.requested_player.id === trade.offered_player.id ||
            other.requested_player.id === trade.requested_player.id)
        ) {
          other.status = 'cancelled';
        }
      }

      const txRecord: TradeTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        room_code: room.room_code,
        team_a_name: sender.display_name,
        team_a_short: sender.franchise?.short_code || 'T1',
        player_a: trade.offered_player,
        team_b_name: target.display_name,
        team_b_short: target.franchise?.short_code || 'T2',
        player_b: trade.requested_player,
        timestamp: Date.now(),
      };

      room.completed_trades.push(txRecord);
      this.refreshParticipantMetrics(room);

      this.addCommentary(
        room,
        `🤝 TRADE COMPLETED! ${txRecord.team_a_short} swapped ${txRecord.player_a.name} with ${txRecord.team_b_short} for ${txRecord.player_b.name}!`,
        'trade'
      );

      this.io.to(room.room_code).emit('trade_executed', {
        trade: txRecord,
        team_a_squad: sender.squad,
        team_b_squad: target.squad,
      });

      this.broadcastState(room);
      return { success: true };
    }

    return { success: false, error: 'Unsupported trade action' };
  }

  public cancelTrade(roomCode: string, senderId: string, tradeId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    const trade = room.pending_trades.get(tradeId);
    if (!trade || trade.sender_id !== senderId) return false;

    trade.status = 'cancelled';
    this.io.to(room.room_code).emit('trade_offer_updated', trade);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  // =========================================================================
  // PLAYING XI SELECTION & SUBMISSION
  // =========================================================================

  public savePlayingXIDraft(
    roomCode: string,
    participantId: string,
    draft: Partial<PlayingXISubmission>
  ): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    const participant = room.participants.get(participantId);
    if (!participant || !participant.franchise) return false;

    const existing = room.playing_xi_submissions.get(participantId);
    const updated: PlayingXISubmission = {
      participant_id: participant.id,
      display_name: participant.display_name,
      franchise: participant.franchise,
      players: draft.players || existing?.players || [],
      batting_order: draft.batting_order || existing?.batting_order || [],
      wicketkeeper_id: draft.wicketkeeper_id || existing?.wicketkeeper_id || '',
      captain_id: draft.captain_id || existing?.captain_id,
      substitutes: draft.substitutes || existing?.substitutes || [],
      is_submitted: false,
    };

    room.playing_xi_submissions.set(participantId, updated);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  public submitPlayingXI(
    roomCode: string,
    participantId: string,
    submission: PlayingXISubmission
  ): { success: boolean; error?: string; scoreBreakdown?: PlayingXIScoreBreakdown } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.get(participantId);
    if (!participant || !participant.franchise) {
      return { success: false, error: 'Must belong to an active franchise' };
    }

    const existingSub = room.playing_xi_submissions.get(participantId);
    if (existingSub?.is_submitted || existingSub?.is_locked) {
      return { success: false, error: 'Playing XI has already been submitted and locked.' };
    }

    if (!submission.players || submission.players.length !== 11) {
      return { success: false, error: 'Playing XI must contain exactly 11 players' };
    }

    const ownedIds = new Set(participant.squad.map(s => s.player_id));
    for (const p of submission.players) {
      if (!ownedIds.has(p.id)) {
        return { success: false, error: `Player ${p.name} is not in your current squad.` };
      }
    }

    const overseasCount = submission.players.filter(
      p => p.country !== 'India' && p.nationality !== 'India'
    ).length;
    if (overseasCount > 4) {
      return {
        success: false,
        error: `IPL overseas limit exceeded: Selected ${overseasCount} overseas players (maximum 4 allowed).`,
      };
    }

    submission.is_submitted = true;
    const scoreBreakdown = calculatePlayingXIScore(submission);
    submission.score = scoreBreakdown.total_score;
    submission.breakdown = scoreBreakdown;

    room.playing_xi_submissions.set(participantId, submission);

    this.addCommentary(
      room,
      `🏏 ${participant.franchise.short_code} finalized and locked their 2026 matchday Playing XI!`,
      'stage'
    );

    this.io.to(room.room_code).emit('playing_xi_updated', submission);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'playing_xi_submitted').catch(() => {});

    // If all active managers have submitted their XI, trigger final recap
    const activeParticipants = Array.from(room.participants.values()).filter(p => p.franchise !== null);
    const allSubmitted = activeParticipants.every(p => room.playing_xi_submissions.get(p.id)?.is_submitted);
    const minParticipants = getMinAuctionParticipants();
    if (allSubmitted && activeParticipants.length >= minParticipants) {
      setTimeout(() => {
        this.completeAuction(room);
      }, 2000);
    }

    return { success: true, scoreBreakdown };
  }

  // =========================================================================
  // AUCTION COMPLETION & MASTER EVALUATION
  // =========================================================================

  public completeAuction(room: RoomRecord) {
    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }

    room.auction_state.phase = 'completed';
    room.stage = 'championship_recap';
    room.auction_state.stage = 'championship_recap';

    const participantsList = Array.from(room.participants.values());
    const results = computeAuctionResults(
      room.room_code,
      participantsList,
      room.settings,
      room.all_completed_bids,
      room.completed_trades,
      Array.from(room.playing_xi_submissions.values())
    );

    room.results = results;
    persistResults(results);
    this.saveRoomSnapshot(room.room_code, 'auction_completed').catch(() => {});

    db.room.updateMany({
      where: { room_code: room.room_code },
      data: { status: 'completed' },
    }).catch(() => {});

    this.addCommentary(
      room,
      `🏆 AUCTION CONCLUDED! ${results.awards[0]?.winner_name || 'Champion'} takes the championship crown!`,
      'stage'
    );

    this.io.to(room.room_code).emit('auction_ended', results);
    this.broadcastState(room);
  }

  public kickParticipant(roomCode: string, hostSessionId: string, targetId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== hostSessionId || hostSessionId === targetId) return false;

    const target = room.participants.get(targetId);
    if (!target) return false;

    room.participants.delete(targetId);
    if (target.socket_id) {
      this.io.to(target.socket_id).emit('kicked', 'Removed from room by host');
    }

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  public transferHost(roomCode: string, currentHostId: string, newHostId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    const isCurrentHost = room.host_session_id === currentHostId;
    const isHostAbsent = room.host_disconnect_time && Date.now() - room.host_disconnect_time > 60000;

    if (!isCurrentHost && !isHostAbsent) return false;

    const newHost = room.participants.get(newHostId);
    if (!newHost) return false;

    const oldHost = room.participants.get(room.host_session_id);
    if (oldHost) oldHost.is_host = false;

    newHost.is_host = true;
    room.host_session_id = newHostId;
    room.host_disconnect_time = null;

    this.io.to(room.room_code).emit('host_changed', newHostId);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => {});
    return true;
  }

  public addChatMessage(roomCode: string, message: ChatMessage) {
    const room = this.getRoom(roomCode);
    if (!room) return;

    room.chat_messages.push(message);
    if (room.chat_messages.length > 50) {
      room.chat_messages.shift();
    }
    this.io.to(room.room_code).emit('new_chat', message);
  }

  public addReaction(roomCode: string, reaction: Reaction) {
    this.io.to(roomCode).emit('new_reaction', reaction);
  }

  public getPublicState(room: RoomRecord): AuctionState {
    const eligibleCount = this.getEligibleBidders(room).length;
    const currentCategory = room.auction_state.current_player
      ? getPlayerCategory(room.auction_state.current_player)
      : (room.pool.length > 0 ? getPlayerCategory(room.pool[0]) : undefined);

    return {
      ...room.auction_state,
      current_category: currentCategory,
      upcoming_players: room.pool.slice(0, 10),
      pass_count: room.auction_state.pass_count ?? room.current_player_passes?.size ?? 0,
      total_eligible_passers: room.auction_state.total_eligible_passers ?? eligibleCount,
      passed_participant_ids: room.auction_state.passed_participant_ids ?? Array.from(room.current_player_passes || []),
      stage: room.stage,
      server_time: Date.now(),
    };
  }

  public broadcastState(room: RoomRecord) {
    const payload = {
      room_code: room.room_code,
      settings: room.settings,
      participants: Array.from(room.participants.values()),
      auction_state: this.getPublicState(room),
      pool: room.pool,
      results: room.results,
      trades: room.completed_trades,
      pending_trade_offers: Array.from(room.pending_trades.values()),
      playing_xi_submissions: Array.from(room.playing_xi_submissions.values()),
      commentary: room.commentary_events,
    };
    this.io.to(room.room_code).emit('state_sync', payload);
  }

  // =========================================================================
  // DATABASE PERSISTENCE & RESTORATION (IN-FLIGHT STATE ENGINE)
  // =========================================================================

  public async saveRoomSnapshot(roomCode: string, reason = 'state_update'): Promise<boolean> {
    const code = roomCode.toUpperCase();
    const room = this.getRoom(code);
    if (!room) return false;

    // Serialize snapshot execution per room code to eliminate concurrent database collisions
    const previousPromise = this.snapshotQueue.get(code) || Promise.resolve(true);
    const executeSnapshot = async (): Promise<boolean> => {
      const currentRoom = this.getRoom(code);
      if (!currentRoom) return false;

      const serializedParticipants: Participant[] = Array.from(currentRoom.participants.values()).map(p => ({
        ...p,
        socket_id: undefined,
        is_connected: false,
      }));

      const stateData: SerializedRoomState = {
        room_code: currentRoom.room_code,
        name: currentRoom.name,
        host_session_id: currentRoom.host_session_id,
        host_disconnect_time: currentRoom.host_disconnect_time,
        settings: currentRoom.settings,
        participants: serializedParticipants,
        auction_state: {
          ...currentRoom.auction_state,
          server_time: Date.now(),
        },
        pool: currentRoom.pool,
        unsold_pool: currentRoom.unsold_pool,
        all_completed_bids: currentRoom.all_completed_bids,
        results: currentRoom.results,
        stage: currentRoom.stage,
        pending_trades: Array.from(currentRoom.pending_trades.values()),
        completed_trades: currentRoom.completed_trades,
        playing_xi_submissions: Array.from(currentRoom.playing_xi_submissions.values()),
        commentary_events: currentRoom.commentary_events.slice(-50),
        schema_version: 1,
        saved_at: Date.now(),
      };

      return persistRoomSnapshot(stateData);
    };

    const nextPromise = previousPromise.then(executeSnapshot, executeSnapshot);
    this.snapshotQueue.set(code, nextPromise);

    nextPromise.finally(() => {
      if (this.snapshotQueue.get(code) === nextPromise) {
        this.snapshotQueue.delete(code);
      }
    });

    return nextPromise;
  }

  public async restoreRoomFromSnapshot(snapshotOrCode: SerializedRoomState | string): Promise<RoomRecord | null> {
    let snapshot: SerializedRoomState | null = null;
    if (typeof snapshotOrCode === 'string') {
      snapshot = await loadLatestRoomSnapshot(snapshotOrCode);
      if (!snapshot) return null;
    } else {
      snapshot = snapshotOrCode;
    }

    const code = snapshot.room_code.toUpperCase();

    // Rebuild participants Map
    const participants = new Map<string, Participant>();
    for (const p of snapshot.participants) {
      participants.set(p.id, {
        ...p,
        is_connected: false,
        socket_id: undefined,
      });
    }

    // Rebuild pending trades Map
    const pending_trades = new Map<string, TradeOffer>();
    if (Array.isArray(snapshot.pending_trades)) {
      for (const t of snapshot.pending_trades) {
        if (t.status === 'pending') {
          pending_trades.set(t.id, t);
        }
      }
    }

    // Rebuild playing XI submissions Map
    const playing_xi_submissions = new Map<string, PlayingXISubmission>();
    if (Array.isArray(snapshot.playing_xi_submissions)) {
      for (const sub of snapshot.playing_xi_submissions) {
        playing_xi_submissions.set(sub.participant_id, sub);
      }
    }

    const current_player_passes = new Set<string>(
      snapshot.auction_state.passed_participant_ids || snapshot.auction_state.withdrawn_participant_ids || []
    );

    const record: RoomRecord = {
      room_code: code,
      name: snapshot.name,
      host_session_id: snapshot.host_session_id,
      host_disconnect_time: snapshot.host_disconnect_time,
      settings: snapshot.settings,
      participants,
      chat_messages: [],
      auction_state: {
        ...snapshot.auction_state,
        pass_count: snapshot.auction_state.pass_count ?? current_player_passes.size,
        total_eligible_passers: snapshot.auction_state.total_eligible_passers ?? 0,
        passed_participant_ids: snapshot.auction_state.passed_participant_ids ?? Array.from(current_player_passes),
      },
      pool: snapshot.pool || [],
      unsold_pool: snapshot.unsold_pool || [],
      all_completed_bids: snapshot.all_completed_bids || [],
      results: snapshot.results || null,
      timer_handle: null,
      next_player_handle: null,
      announcement_timeout_handle: null,
      client_announcement_completions: new Set(),
      is_processing_bid: false,
      current_player_passes,
      is_processing_unsold: false,
      stage: snapshot.stage || 'main_auction',
      pending_trades,
      completed_trades: snapshot.completed_trades || [],
      playing_xi_submissions,
      commentary_events: snapshot.commentary_events || [],
    };
    record.auction_state.total_eligible_passers = this.getEligibleBidders(record).length;

    this.rooms.set(code, record);

    // Timer rehydration from absolute timer_ends_at
    const now = Date.now();
    if (record.auction_state.phase === 'bidding' && record.auction_state.current_player) {
      const endsAt = record.auction_state.timer_ends_at || 0;
      if (now >= endsAt) {
        // Timer expired during downtime!
        // Resolve deterministically without double-selling:
        if (record.auction_state.current_bidder_id && record.auction_state.current_bid > 0) {
          const alreadySold = record.all_completed_bids.some(
            b => b.player_id === record.auction_state.current_player?.id
          );
          if (!alreadySold) {
            const winner = record.participants.get(record.auction_state.current_bidder_id);
            if (winner) {
              winner.purse_remaining -= record.auction_state.current_bid;
              winner.squad.push({
                player_id: record.auction_state.current_player.id,
                player: record.auction_state.current_player,
                bought_for: record.auction_state.current_bid,
                timestamp: now,
              });
              record.all_completed_bids.push({
                player_id: record.auction_state.current_player.id,
                player: record.auction_state.current_player,
                bids_count: record.auction_state.bids.length,
                final_price: record.auction_state.current_bid,
                winner_id: winner.id,
              });
              record.auction_state.sold_count++;
              this.refreshParticipantMetrics(record);
            }
          }
          record.auction_state.phase = 'sold';
        } else {
          const alreadyUnsold = record.unsold_pool.some(
            p => p.id === record.auction_state.current_player?.id
          );
          if (!alreadyUnsold) {
            record.unsold_pool.push(record.auction_state.current_player);
            record.auction_state.unsold_count++;
          }
          record.auction_state.phase = 'unsold';
        }
        record.auction_state.is_paused = true; // Pause room so managers see resolved player on reconnect
        this.addCommentary(record, `Room recovered after restart. Previous player auction deterministically resolved.`, 'stage');
      } else {
        // Time remains!
        record.auction_state.is_paused = true;
        this.addCommentary(record, `Room recovered after restart. Bidding paused at ${formatCurrency(record.auction_state.current_bid)}.`, 'bid');
      }
    }

    console.log(`[RESTORE] Room ${code} successfully restored from database (Phase: ${record.auction_state.phase}, Stage: ${record.stage}).`);
    return record;
  }

  public async restoreAllActiveRoomsFromDb(): Promise<number> {
    let count = 0;
    try {
      const activeCodes = await loadAllActiveRoomCodes();
      for (const code of activeCodes) {
        this.restoringRooms.add(code);
        try {
          const snapshot = await loadLatestRoomSnapshot(code);
          if (snapshot) {
            await this.restoreRoomFromSnapshot(snapshot);
            count++;
          }
        } catch (err: any) {
          console.error(`[RESTORE ERROR] Room ${code} restore failed:`, err.message);
        } finally {
          this.restoringRooms.delete(code);
        }
      }
    } catch (err: any) {
      console.error('[RESTORE ERROR] Could not load active room codes:', err.message);
    }
    return count;
  }

  public async snapshotAllActiveRooms(): Promise<void> {
    for (const room of this.rooms.values()) {
      await this.saveRoomSnapshot(room.room_code, 'graceful_shutdown');
    }
  }
}
