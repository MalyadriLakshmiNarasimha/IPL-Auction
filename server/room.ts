import {
  AuctionPhase,
  AuctionResults,
  AuctionState,
  AuctionTerminatedPayload,
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
  SportType,
  TradeOffer,
  TradeTransaction,
  WorkflowStage,
} from '../src/shared/types';
import { ALL_PLAYERS, getPlayerById } from '../src/shared/player-data';
import { ALL_PKL_PLAYERS, getPklPlayerById } from '../src/shared/pkl-player-data';
import {
  generateCategoryWiseSequence,
  fisherYatesShuffle,
  getPlayerCategory,
  PlayerAuctionCategory,
} from '../src/shared/player-sequence';
import { buildPlayerIntroduction } from '../src/shared/voice-templates';
import { DEFAULT_ROOM_SETTINGS, DEFAULT_PKL_ROOM_SETTINGS, MIN_RESERVE_PER_SLOT, formatCurrency, getMinAuctionParticipants, MAX_ROOM_PARTICIPANTS } from '../src/shared/constants';
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

export const AUCTION_TERMINATED_ERROR = 'AUCTION_TERMINATED';
export const ALL_MANAGERS_EXITED_REASON = 'ALL_MANAGERS_EXITED';
export const ALL_MANAGERS_EXITED_MESSAGE =
  'All franchise managers have exited. This auction has been terminated and all participating managers have been disqualified.';

export interface RoomRecord {
  room_code: string;
  name: string;
  host_session_id: string;
  host_disconnect_time: number | null;
  status?: 'lobby' | 'live' | 'completed' | 'terminated';
  termination_reason?: string | null;
  terminated_at?: number | null;
  terminated_by_system?: boolean;
  is_terminating?: boolean;
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
  stage_deadline_handle?: NodeJS.Timeout | null;
  client_announcement_completions: Set<string>;
  is_processing_bid: boolean;
  current_player_passes: Set<string>;
  current_player_bid_count: number;
  is_processing_unsold: boolean;
  closing_warning_bid_key?: string | null;
  auto_paused_reason?: 'server_restart' | 'host_disconnect' | null;

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
      const now = Date.now();
      for (const room of this.rooms.values()) {
        if (room.stage === 'trading_window' && room.auction_state.phase === 'trading') {
          if (room.auction_state.stage_ends_at && now >= room.auction_state.stage_ends_at) {
            this.concludeTradingWindow(room, 'Trading deadline reached.');
            continue;
          }
        }
        const isActiveTrading =
          room.stage === 'trading_window' &&
          room.auction_state.phase === 'trading' &&
          !room.auction_state.trading_completed;
        if (room.auction_state.phase === 'bidding' || isActiveTrading) {
          await this.saveRoomSnapshot(room.room_code, 'periodic_loop');
        }
      }
    }, 5000);
  }

  private clearRoomTimers(room: RoomRecord): void {
    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }
    if (room.announcement_timeout_handle) {
      clearTimeout(room.announcement_timeout_handle);
      room.announcement_timeout_handle = null;
    }
    if (room.stage_deadline_handle) {
      clearTimeout(room.stage_deadline_handle);
      room.stage_deadline_handle = null;
    }
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
    const squadSize = room.settings?.squad_size ?? 15;
    return Array.from(room.participants.values()).filter(p => {
      const hasTeam = Boolean(p.team_name || p.franchise);
      const notSpectator = !p.is_spectator && p.role !== 'spectator';
      const notExited =
        !p.has_exited &&
        p.participation_status !== 'EXITED' &&
        p.participation_status !== 'DISQUALIFIED';
      const hasSquadSlot = (p.squad?.length ?? 0) < squadSize;
      return hasTeam && notSpectator && notExited && hasSquadSlot;
    });
  }

  public isRoomTerminated(room: RoomRecord | undefined | null): boolean {
    if (!room) return false;
    return (
      room.status === 'terminated' ||
      room.auction_state.phase === 'terminated' ||
      room.auction_state.status === 'terminated'
    );
  }

  private getTerminatedPayload(room: RoomRecord): AuctionTerminatedPayload {
    return {
      roomCode: room.room_code,
      reason: room.termination_reason || room.auction_state.termination_reason || ALL_MANAGERS_EXITED_REASON,
      terminatedAt: room.terminated_at || room.auction_state.terminated_at || Date.now(),
      message: room.auction_state.termination_message || ALL_MANAGERS_EXITED_MESSAGE,
      sportType: room.settings.sport_type,
      participants: Array.from(room.participants.values()),
    };
  }

  private emitTerminatedRejection(room: RoomRecord, sessionId?: string, socketId?: string): void {
    const participant = sessionId ? room.participants.get(sessionId) : undefined;
    const target = socketId || participant?.socket_id || sessionId;
    if (!target) return;
    this.io.to(target).emit('error_message', {
      code: AUCTION_TERMINATED_ERROR,
      message: `${AUCTION_TERMINATED_ERROR}: ${room.auction_state.termination_message || ALL_MANAGERS_EXITED_MESSAGE}`,
    });
  }

  public removeRoom(roomCode: string): void {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (room) {
      this.clearRoomTimers(room);
    }
    this.rooms.delete(code);
  }

  public createRoom(roomCode: string, name: string, hostSessionId: string, hostDisplayName: string, sportType: SportType = 'IPL'): RoomRecord {
    const code = roomCode.toUpperCase();
    const isPkl = sportType === 'PKL';
    const baseSettings = isPkl ? DEFAULT_PKL_ROOM_SETTINGS : DEFAULT_ROOM_SETTINGS;
    const pool = isPkl ? ALL_PKL_PLAYERS : ALL_PLAYERS;
    const settings: RoomSettings = {
      ...baseSettings,
      selected_player_ids: pool.map(p => p.id),
      sport_type: isPkl ? 'PKL' : 'IPL',
    };

    const hostParticipant: Participant = {
      id: hostSessionId,
      room_code: code,
      display_name: hostDisplayName,
      is_host: true,
      is_connected: true,
      has_exited: false,
      exited_at: null,
      participation_status: 'ACTIVE',
      disqualification_reason: null,
      disqualified_at: null,
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
      round1_completed: false,
      round2_completed: false,
      trading_started: false,
      trading_completed: false,
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
      status: 'lobby',
      termination_reason: null,
      terminated_at: null,
      terminated_by_system: false,
      termination_message: null,
    };

    const record: RoomRecord = {
      room_code: code,
      name,
      host_session_id: hostSessionId,
      host_disconnect_time: null,
      status: 'lobby',
      termination_reason: null,
      terminated_at: null,
      terminated_by_system: false,
      is_terminating: false,
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
      stage_deadline_handle: null,
      client_announcement_completions: new Set(),
      is_processing_bid: false,
      current_player_passes: new Set(),
      current_player_bid_count: 0,
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

    if (this.isRoomTerminated(room)) {
      const payload = this.getTerminatedPayload(room);
      if (socketId) {
        this.io.to(socketId).emit('auction_terminated', payload);
        this.io.to(socketId).emit('error_message', {
          code: AUCTION_TERMINATED_ERROR,
          message: `${AUCTION_TERMINATED_ERROR}: ${payload.message}`,
        });
      }
      return null;
    }

    let participant = room.participants.get(sessionId);
    let shouldAutoResumeOnHostReconnect = false;
    if (participant) {
      participant.is_connected = true;
      participant.socket_id = socketId;
      participant.last_active = Date.now();
      participant.has_exited = false;
      participant.exited_at = null;
      participant.participation_status = 'ACTIVE';
      if (participant.display_name !== displayName && displayName.trim().length > 0) {
        participant.display_name = displayName;
      }
      if (participant.id === room.host_session_id) {
        room.host_disconnect_time = null;
        if (room.auction_state.is_paused && room.auto_paused_reason) {
          shouldAutoResumeOnHostReconnect = true;
        }
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
        has_exited: false,
        exited_at: null,
        participation_status: 'ACTIVE',
        disqualification_reason: null,
        disqualified_at: null,
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
        participation_status: 'ACTIVE',
      },
      update: {
        display_name: participant.display_name,
        is_spectator: participant.is_spectator,
        participation_status: 'ACTIVE',
        exited_at: null,
      },
    }).catch(() => { });

    this.refreshParticipantMetrics(room);
    if (room.auction_state.phase === 'bidding' || room.auction_state.phase === 'announcing') {
      room.auction_state.total_eligible_passers = this.getEligibleBidders(room).length;
    }

    if (shouldAutoResumeOnHostReconnect) {
      this.resumeAuction(room.room_code, room.host_session_id);
      return room;
    }

    // Watchdog check: If room is in unsold or sold phase with no scheduled next player and unpaused, auto-schedule next player
    if (
      (room.auction_state.phase === 'unsold' || room.auction_state.phase === 'sold') &&
      !room.next_player_handle &&
      !room.auction_state.is_paused
    ) {
      this.scheduleNextPlayer(room, 2000);
    } else if (
      room.auction_state.phase === 'bidding' &&
      !room.auction_state.is_paused &&
      !room.timer_handle
    ) {
      if (!room.auction_state.timer_ends_at || room.auction_state.timer_ends_at <= Date.now()) {
        room.auction_state.timer_ends_at = Date.now() + room.settings.timer_seconds * 1000;
      }
      this.startTimerLoop(room);
    } else if (
      room.auction_state.phase === 'announcing' &&
      !room.auction_state.is_paused &&
      !room.announcement_timeout_handle
    ) {
      const remainingAnnounceMs = Math.max(
        1200,
        (room.auction_state.announcement_ends_at || 0) - Date.now()
      );
      room.announcement_timeout_handle = setTimeout(() => {
        this.startBiddingPhase(room);
      }, remainingAnnounceMs);
    }

    this.broadcastState(room);
    return room;
  }

  public setSpectatorMode(roomCode: string, sessionId: string, isSpectator: boolean): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }

    const participant = room.participants.get(sessionId);
    if (!participant || participant.is_host) return false;

    participant.is_spectator = isSpectator;
    participant.role = isSpectator ? 'spectator' : 'manager';
    if (isSpectator) {
      participant.franchise = null;
    }

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
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
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }

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
    this.saveRoomSnapshot(room.room_code, 'franchise_picked').catch(() => { });

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
    }).catch(() => { });

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
    if (this.isRoomTerminated(room)) {
      return { success: false, reason: `${AUCTION_TERMINATED_ERROR}: This auction has been terminated.` };
    }

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
    this.saveRoomSnapshot(room.room_code, 'team_name_set').catch(() => { });

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
    }).catch(() => { });

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
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }
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
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
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
    }).catch(() => { });
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
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }
    if (room.auction_state.phase !== 'lobby') return false;

    const sourcePool = room.settings.sport_type === 'PKL' ? ALL_PKL_PLAYERS : ALL_PLAYERS;
    const hostParticipant = room.participants.get(sessionId);
    const startValidation = validateAuctionStart(
      hostParticipant,
      Array.from(room.participants.values()),
      room.settings,
      sourcePool.length
    );

    if (!startValidation.valid) {
      this.io.to(room.room_code).emit('error_message', {
        message: startValidation.reason || 'Cannot start auction.',
      });
      return false;
    }

    const selectedIds = new Set(room.settings.selected_player_ids);
    let selectedPlayers = sourcePool.filter(p => selectedIds.has(p.id));
    if (selectedPlayers.length === 0) {
      selectedPlayers = [...sourcePool];
    }

    this.sortPool(selectedPlayers, room.settings.order_type, room.settings.sport_type);

    room.pool = selectedPlayers;
    room.unsold_pool = [];
    room.status = 'live';
    room.auction_state.status = 'live';
    room.auction_state.total_pool_count = room.pool.length;
    room.auction_state.remaining_pool_count = room.pool.length;
    room.auction_state.phase = 'starting';
    room.auction_state.stage = 'main_auction';
    room.stage = 'main_auction';
    room.auction_state.round_number = 1;
    room.auction_state.round1_completed = false;
    room.auction_state.round2_completed = false;
    room.auction_state.trading_started = false;
    room.auction_state.trading_completed = false;
    room.auction_state.stage_ends_at = undefined;
    room.auction_state.stage_duration_seconds = undefined;
    room.auction_state.current_player_index = -1;

    db.room.updateMany({
      where: { room_code: room.room_code },
      data: { status: 'live' },
    }).catch(() => { });

    this.addCommentary(room, `🚀 LIVE MAIN AUCTION has officially begun! ${room.pool.length} players on the board.`, 'stage');
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'auction_started').catch(() => { });

    this.scheduleNextPlayer(room, 2500);

    return true;
  }

  private scheduleNextPlayer(room: RoomRecord, delayMs: number) {
    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }
    if (
      this.isRoomTerminated(room) ||
      room.auction_state.phase === 'completed' ||
      room.stage === 'championship_recap'
    ) {
      return;
    }
    room.next_player_handle = setTimeout(() => {
      room.next_player_handle = null;
      this.nextPlayer(room);
    }, delayMs);
  }

  private sortPool(pool: Player[], orderType: OrderType, sportType: SportType = 'IPL') {
    if (orderType === 'role') {
      // Authoritative Category Sequence:
      // IPL: 1. BATTERS -> 2. BOWLERS -> 3. ALL-ROUNDERS -> 4. WICKET KEEPERS
      // PKL: 1. RAIDERS -> 2. DEFENDERS -> 3. ALL-ROUNDERS
      // Unbiased Fisher-Yates shuffle within each category across all franchises.
      const sequenced = generateCategoryWiseSequence(pool, sportType);
      pool.splice(0, pool.length, ...sequenced);
    } else if (orderType === 'base_price') {
      pool.sort((a, b) => b.base_price - a.base_price);
    } else {
      const shuffled = fisherYatesShuffle(pool);
      pool.splice(0, pool.length, ...shuffled);
    }
  }

  public isTradingEligible(room: RoomRecord): boolean {
    if (
      room.auction_state.round1_completed !== true ||
      room.auction_state.round2_completed !== true ||
      room.auction_state.trading_completed === true ||
      room.auction_state.phase === 'completed' ||
      room.stage === 'championship_recap'
    ) {
      return false;
    }

    const activeTeamsWithPlayers = Array.from(room.participants.values()).filter(
      p => !p.is_spectator && (p.squad?.length ?? 0) > 0
    );
    return activeTeamsWithPlayers.length >= 2;
  }

  private scheduleStageDeadlineTimer(room: RoomRecord, delayMs: number): void {
    if (room.stage_deadline_handle) {
      clearTimeout(room.stage_deadline_handle);
      room.stage_deadline_handle = null;
    }
    const safeDelay = Math.max(50, delayMs);
    room.stage_deadline_handle = setTimeout(() => {
      room.stage_deadline_handle = null;
      const latest = this.getRoom(room.room_code);
      if (!latest) return;
      if (latest.stage === 'trading_window' && latest.auction_state.phase === 'trading') {
        this.concludeTradingWindow(latest, 'Trading window deadline reached.');
      } else if (latest.stage === 'playing_xi_selection') {
        this.transitionStage(latest.room_code, latest.host_session_id, 'playing_xi_evaluation');
      }
    }, safeDelay);
  }

  public concludeTradingWindow(roomOrCode: RoomRecord | string, reason: string = 'Host concluded trading window.'): boolean {
    const room = typeof roomOrCode === 'string' ? this.getRoom(roomOrCode) : roomOrCode;
    if (!room) return false;
    if (room.auction_state.trading_completed) return false;

    if (room.stage_deadline_handle) {
      clearTimeout(room.stage_deadline_handle);
      room.stage_deadline_handle = null;
    }

    // Cancel any unaccepted pending trade offers cleanly without mutating executed swaps
    for (const offer of room.pending_trades.values()) {
      if (offer.status === 'pending' || offer.status === 'countered') {
        offer.status = 'cancelled';
        this.io.to(room.room_code).emit('trade_offer_updated', offer);
      }
    }

    room.auction_state.trading_completed = true;
    room.auction_state.stage_ends_at = undefined;
    room.auction_state.stage_duration_seconds = undefined;
    this.addCommentary(room, `🔒 ${reason} Finalizing trades and entering Final Evaluation.`, 'stage');

    return this.transitionStage(room.room_code, room.host_session_id, 'squad_evaluation');
  }

  private advanceFromRound2(room: RoomRecord): void {
    if (!room.auction_state.round1_completed || !room.auction_state.round2_completed) {
      return;
    }

    if (this.isTradingEligible(room) && !room.auction_state.trading_started) {
      this.transitionStage(room.room_code, room.host_session_id, 'trading_window', 180);
      return;
    }

    room.auction_state.trading_completed = true;
    this.addCommentary(
      room,
      `📊 Round 1 & Round 2 complete. Advancing directly to Final Evaluation (Trade Round requires at least 2 squads with acquired players).`,
      'stage'
    );
    this.transitionStage(room.room_code, room.host_session_id, 'squad_evaluation');
  }

  public nextPlayer(room: RoomRecord) {
    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }

    if (
      this.isRoomTerminated(room) ||
      room.auction_state.phase === 'completed' ||
      room.stage === 'championship_recap' ||
      room.stage === 'trading_window' ||
      room.stage === 'squad_evaluation' ||
      room.stage === 'playing_xi_selection' ||
      room.stage === 'playing_xi_evaluation'
    ) {
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
      activeParticipants.every(p => (p.squad?.length ?? 0) >= (room.settings?.squad_size ?? 15));

    if (allSquadsFull || room.pool.length === 0) {
      // STAGE 1 -> STAGE 2 TRANSITION (strictly once)
      if (room.auction_state.round_number === 1 && !room.auction_state.round1_completed) {
        room.auction_state.round1_completed = true;
        room.auction_state.round_number = 2;
        room.auction_state.stage = 'unsold_auction';
        room.stage = 'unsold_auction';

        if (!allSquadsFull && room.settings.accelerated_round !== false && room.unsold_pool.length > 0) {
          room.pool = [...room.unsold_pool];
          room.unsold_pool = [];
          room.auction_state.total_pool_count = room.pool.length;
          room.auction_state.remaining_pool_count = room.pool.length;
          room.auction_state.current_player_index = -1;
          room.auction_state.current_player = null;
          room.auction_state.phase = 'unsold_round';

          this.addCommentary(
            room,
            `⚡ ROUND 1 COMPLETE! ROUND 2 (Unsold Player Auction) is starting with ${room.pool.length} players.`,
            'stage'
          );
          this.io.to(room.room_code).emit('stage_transitioned', {
            stage: 'unsold_auction',
            auction_state: this.getPublicState(room),
          });
          this.broadcastState(room);
          this.saveRoomSnapshot(room.room_code, 'round1_completed').catch(() => { });

          this.scheduleNextPlayer(room, 2500);
          return;
        }

        // No eligible unsold players remain or all squads full -> Round 2 has 0 applicable players
        room.auction_state.round2_completed = true;
        room.auction_state.remaining_pool_count = 0;
        room.auction_state.current_player = null;
        this.addCommentary(
          room,
          `✅ Round 1 & Round 2 complete (no remaining eligible unsold players for Round 2).`,
          'stage'
        );
        this.advanceFromRound2(room);
        return;
      }

      // STAGE 2 COMPLETION (strictly once) -> Unlock STAGE 3: TRADE ROUND
      if (
        room.auction_state.round_number === 2 &&
        room.auction_state.round1_completed &&
        !room.auction_state.round2_completed
      ) {
        room.auction_state.round2_completed = true;
        room.auction_state.remaining_pool_count = 0;
        room.auction_state.current_player = null;
        this.addCommentary(room, `🏁 ROUND 2 COMPLETE! All auction rounds have finished.`, 'stage');
        this.advanceFromRound2(room);
        return;
      }

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
    room.current_player_bid_count = 0;
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

    this.saveRoomSnapshot(room.room_code, 'next_player').catch(() => { });

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

    if (this.isRoomTerminated(room) || room.auction_state.phase !== 'announcing' || room.auction_state.is_paused) {
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
    this.saveRoomSnapshot(room.room_code, 'bidding_started').catch(() => { });
    this.startTimerLoop(room);
  }

  public handleClientAnnouncementCompleted(roomCode: string, sessionId: string, playerId: string) {
    const room = this.getRoom(roomCode);
    if (!room || this.isRoomTerminated(room) || room.auction_state.phase !== 'announcing' || room.auction_state.is_paused) return;
    if (room.auction_state.current_player?.id !== playerId) return;

    room.client_announcement_completions.add(sessionId);

    // If all connected active managers finished playback, start bidding after a short 400ms buffer
    const activeManagers = Array.from(room.participants.values()).filter(
      p => !p.is_spectator && p.is_connected !== false
    );
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

    if (this.isRoomTerminated(room)) {
      const participant = room.participants.get(sessionId);
      const recipient = participant?.socket_id || sessionId;
      this.io.to(recipient).emit('bid_rejected', {
        reason: `${AUCTION_TERMINATED_ERROR}: This auction has been terminated.`,
      });
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }

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

      // Record bid event with monotonic sequence number per player in MySQL
      room.current_player_bid_count = (room.current_player_bid_count || 0) + 1;
      const bidSeq = room.current_player_bid_count;
      recordBidEvent(
        room.room_code,
        player.id,
        bidSeq,
        participant.id,
        newBidAmount
      ).catch(() => { });

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

    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }

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
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
    return true;
  }

  public passPlayer(roomCode: string, sessionId: string): boolean {
    return this.withdrawBid(roomCode, sessionId);
  }

  private handleTimerExpired(room: RoomRecord) {
    if (this.isRoomTerminated(room)) return;
    const player = room.auction_state.current_player;
    if (!player) return;

    const winner = room.auction_state.current_bidder_id
      ? room.participants.get(room.auction_state.current_bidder_id)
      : undefined;

    if (winner && room.auction_state.current_bid > 0) {
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
        bids_count: room.current_player_bid_count || room.auction_state.bids.length,
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

      this.saveRoomSnapshot(room.room_code, 'player_sold').catch(() => { });

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

      this.saveRoomSnapshot(room.room_code, 'player_unsold').catch(() => { });

      // Allow 4500ms for gavel hammer strike and unsold voice announcement to complete before next player
      this.scheduleNextPlayer(room, 4500);
    }
  }

  public pauseAuction(roomCode: string, sessionId: string, force: boolean = false): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (this.isRoomTerminated(room)) {
      if (!force) this.emitTerminatedRejection(room, sessionId);
      return false;
    }
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
      const remainingMs = Math.max(1000, (room.auction_state.announcement_ends_at || Date.now()) - Date.now());
      room.auction_state.pause_remaining_ms = remainingMs;
    } else {
      if (room.timer_handle) {
        clearInterval(room.timer_handle);
        room.timer_handle = null;
      }
      const remainingMs = Math.max(0, room.auction_state.timer_ends_at - Date.now());
      room.auction_state.pause_remaining_ms = remainingMs > 0 ? remainingMs : room.settings.timer_seconds * 1000;
    }

    room.auto_paused_reason = force ? 'host_disconnect' : null;
    room.auction_state.is_paused = true;

    this.io.to(room.room_code).emit('auction_paused');
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
    return true;
  }

  public resumeAuction(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }
    if (!room.auction_state.is_paused) return false;

    room.auto_paused_reason = null;

    if (room.auction_state.phase === 'announcing') {
      const savedMs = room.auction_state.pause_remaining_ms;
      const remainingMs = savedMs && savedMs > 500 ? savedMs : 3000;
      room.auction_state.announcement_ends_at = Date.now() + remainingMs;
      room.auction_state.pause_remaining_ms = undefined;
      room.auction_state.is_paused = false;
      if (room.announcement_timeout_handle) {
        clearTimeout(room.announcement_timeout_handle);
      }
      room.announcement_timeout_handle = setTimeout(() => {
        this.startBiddingPhase(room);
      }, remainingMs);
    } else if (room.auction_state.phase === 'unsold' || room.auction_state.phase === 'sold') {
      // Transition out of resolved player state reliably to the next player
      room.auction_state.pause_remaining_ms = undefined;
      room.auction_state.is_paused = false;
      this.scheduleNextPlayer(room, 500);
    } else if (room.auction_state.phase === 'bidding') {
      const savedMs = room.auction_state.pause_remaining_ms;
      const fallbackMs = room.settings.timer_seconds * 1000;
      const remainingMs = savedMs && savedMs > 1000 ? Math.min(fallbackMs, savedMs) : fallbackMs;
      room.auction_state.timer_ends_at = Date.now() + remainingMs;
      room.auction_state.pause_remaining_ms = undefined;
      room.auction_state.is_paused = false;
      this.startTimerLoop(room);
    } else {
      room.auction_state.pause_remaining_ms = undefined;
      room.auction_state.is_paused = false;
    }

    this.io.to(room.room_code).emit('auction_resumed', room.auction_state.timer_ends_at);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
    return true;
  }

  public skipPlayer(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }
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

  public requestNextPlayer(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }

    // Reliable transition guard: allow advancing if stuck in unsold or sold phase
    if (room.auction_state.phase !== 'unsold' && room.auction_state.phase !== 'sold') {
      return false;
    }

    if (room.next_player_handle) {
      clearTimeout(room.next_player_handle);
      room.next_player_handle = null;
    }

    room.auction_state.is_paused = false;
    this.nextPlayer(room);
    return true;
  }

  public leaveRoom(roomCode: string, sessionId: string, socketId?: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId, socketId);
      return false;
    }

    const participant = room.participants.get(sessionId);
    if (!participant) return false;

    const now = Date.now();
    participant.is_connected = false;
    participant.last_active = now;
    participant.has_exited = true;
    participant.exited_at = now;
    if (participant.participation_status !== 'DISQUALIFIED') {
      participant.participation_status = 'EXITED';
    }

    // If host leaves, record disconnect time so existing host-absence safety applies,
    // while active managers remain.
    if (participant.id === room.host_session_id) {
      room.host_disconnect_time = now;
    }

    if (room.auction_state.phase === 'bidding' || room.auction_state.phase === 'announcing') {
      room.auction_state.total_eligible_passers = this.getEligibleBidders(room).length;
    }

    // Persist explicit exit in MySQL participant record
    db.roomParticipant.updateMany({
      where: {
        room_code: room.room_code,
        session_id: sessionId,
      },
      data: {
        participation_status: 'EXITED',
        exited_at: new Date(now),
      },
    }).catch(() => { });

    const evaluation = this.evaluateActiveParticipantsAndTerminate(room.room_code);
    if (!evaluation.terminated) {
      this.broadcastState(room);
      this.saveRoomSnapshot(room.room_code, 'participant_exited').catch(() => { });
    }
    return true;
  }

  /**
   * Server-authoritative evaluator executed after explicit manager exits.
   * Counts active, non-spectator franchise managers only (temporarily disconnected
   * managers who have not explicitly exited remain counted as active).
   * Terminates atomically and idempotently when active manager count reaches zero.
   */
  public evaluateActiveParticipantsAndTerminate(roomCode: string): {
    evaluated: boolean;
    activeCount: number;
    totalManagers: number;
    terminated: boolean;
    alreadyTerminated: boolean;
  } {
    const room = this.getRoom(roomCode);
    if (!room) {
      return {
        evaluated: false,
        activeCount: 0,
        totalManagers: 0,
        terminated: false,
        alreadyTerminated: false,
      };
    }

    if (this.isRoomTerminated(room) || room.is_terminating) {
      return {
        evaluated: true,
        activeCount: 0,
        totalManagers: 0,
        terminated: true,
        alreadyTerminated: true,
      };
    }

    const nonSpectators = Array.from(room.participants.values()).filter(
      p => !p.is_spectator && p.role !== 'spectator'
    );
    const withTeam = nonSpectators.filter(p => Boolean(p.franchise) || Boolean(p.team_name));
    const franchiseManagers = withTeam.length > 0 ? withTeam : nonSpectators;
    const activeManagers = franchiseManagers.filter(
      p => !p.has_exited && p.participation_status !== 'EXITED' && p.participation_status !== 'DISQUALIFIED'
    );

    // Do not auto-terminate unstarted lobbies or normally completed auctions
    if (
      room.auction_state.phase === 'lobby' ||
      room.auction_state.phase === 'completed' ||
      room.stage === 'championship_recap'
    ) {
      return {
        evaluated: false,
        activeCount: activeManagers.length,
        totalManagers: franchiseManagers.length,
        terminated: false,
        alreadyTerminated: false,
      };
    }

    if (franchiseManagers.length > 0 && activeManagers.length === 0) {
      const didTerminate = this.terminateAuction(room, ALL_MANAGERS_EXITED_REASON);
      return {
        evaluated: true,
        activeCount: 0,
        totalManagers: franchiseManagers.length,
        terminated: true,
        alreadyTerminated: !didTerminate,
      };
    }

    return {
      evaluated: true,
      activeCount: activeManagers.length,
      totalManagers: franchiseManagers.length,
      terminated: false,
      alreadyTerminated: false,
    };
  }

  public terminateAuction(
    roomOrCode: RoomRecord | string,
    reason: string = ALL_MANAGERS_EXITED_REASON
  ): boolean {
    const room = typeof roomOrCode === 'string' ? this.getRoom(roomOrCode) : roomOrCode;
    if (!room) return false;

    // Atomic idempotency guard: never emit duplicate termination events or mutate twice
    if (this.isRoomTerminated(room) || room.is_terminating) {
      return false;
    }

    room.is_terminating = true;
    try {
      this.clearRoomTimers(room);
      room.is_processing_bid = false;
      room.is_processing_unsold = false;

      const now = Date.now();
      room.status = 'terminated';
      room.termination_reason = reason;
      room.terminated_at = now;
      room.terminated_by_system = true;

      room.auction_state.phase = 'terminated';
      room.auction_state.status = 'terminated';
      room.auction_state.is_paused = false;
      room.auction_state.pause_remaining_ms = undefined;
      room.auction_state.timer_ends_at = 0;
      room.auction_state.stage_ends_at = undefined;
      room.auction_state.stage_duration_seconds = undefined;
      room.auction_state.termination_reason = reason;
      room.auction_state.terminated_at = now;
      room.auction_state.terminated_by_system = true;
      room.auction_state.termination_message = ALL_MANAGERS_EXITED_MESSAGE;
      room.auction_state.total_eligible_passers = 0;

      // Cancel pending trades cleanly without deleting completed trades or squads
      for (const offer of room.pending_trades.values()) {
        if (offer.status === 'pending' || offer.status === 'countered') {
          offer.status = 'cancelled';
          this.io.to(room.room_code).emit('trade_offer_updated', offer);
        }
      }

      // Disqualify all participating managers while preserving squads, purse, and bid records
      for (const p of room.participants.values()) {
        if (!p.is_spectator && p.role !== 'spectator') {
          p.participation_status = 'DISQUALIFIED';
          p.disqualification_reason = reason;
          p.disqualified_at = now;
        }
      }

      this.addCommentary(
        room,
        `⛔ AUCTION TERMINATED: ${ALL_MANAGERS_EXITED_MESSAGE}`,
        'stage'
      );

      const payload: AuctionTerminatedPayload = {
        roomCode: room.room_code,
        reason,
        terminatedAt: now,
        message: ALL_MANAGERS_EXITED_MESSAGE,
        sportType: room.settings.sport_type,
        participants: Array.from(room.participants.values()),
      };

      // Emit dedicated event exactly once to all connected clients in the room
      this.io.to(room.room_code).emit('auction_terminated', payload);
      this.broadcastState(room);

      // Persist termination state and disqualifications atomically without deleting history
      Promise.all([
        db.room.updateMany({
          where: { room_code: room.room_code },
          data: {
            status: 'terminated',
            termination_reason: reason,
            terminated_at: new Date(now),
            terminated_by_system: true,
          },
        }),
        db.roomParticipant.updateMany({
          where: {
            room_code: room.room_code,
            is_spectator: false,
          },
          data: {
            participation_status: 'DISQUALIFIED',
            disqualification_reason: reason,
            disqualified_at: new Date(now),
          },
        }),
      ])
        .catch(err => {
          console.error(`[TERMINATE DB ERROR] Room ${room.room_code}:`, err?.message || err);
        })
        .finally(() => {
          this.saveRoomSnapshot(room.room_code, 'auction_terminated').catch(err => {
            console.error(`[TERMINATE SNAPSHOT ERROR] Room ${room.room_code}:`, err?.message || err);
          });
        });

      return true;
    } finally {
      room.is_terminating = false;
    }
  }

  public endAuctionEarly(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, sessionId);
      return false;
    }

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
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, hostSessionId);
      return false;
    }
    if (room.host_session_id !== hostSessionId) return false;

    // Never allow stage transitions once auction has permanently completed
    if (room.auction_state.phase === 'completed' || room.stage === 'championship_recap') {
      return false;
    }

    // Idempotency: ignore duplicate transitions to the exact same active stage (prevents resetting countdowns)
    if (room.stage === newStage) {
      return false;
    }

    const r1Done = Boolean(room.auction_state.round1_completed);
    const r2Done = Boolean(room.auction_state.round2_completed);

    // Enforce strict stage sequence:
    // ROUND 1 (main_auction) -> ROUND 2 (unsold_auction) -> TRADE ROUND (trading_window) -> FINAL EVALUATION
    if (newStage === 'lobby') {
      return false;
    } else if (newStage === 'main_auction') {
      if (r1Done || room.stage !== 'lobby') return false;
    } else if (newStage === 'unsold_auction') {
      if (!r1Done || r2Done) return false;
    } else if (newStage === 'trading_window') {
      if (
        !r1Done ||
        !r2Done ||
        room.auction_state.trading_started === true ||
        room.auction_state.trading_completed === true ||
        !this.isTradingEligible(room) ||
        (room.stage !== 'unsold_auction' && room.stage !== 'main_auction')
      ) {
        return false;
      }
    } else if (newStage === 'squad_evaluation') {
      if (!r1Done || !r2Done) return false;
      if (room.stage === 'playing_xi_selection' || room.stage === 'playing_xi_evaluation') return false;
    } else if (newStage === 'playing_xi_selection') {
      if (!r1Done || !r2Done) return false;
      if (room.stage !== 'trading_window' && room.stage !== 'squad_evaluation') return false;
    } else if (newStage === 'playing_xi_evaluation') {
      if (!r1Done || !r2Done) return false;
      if (room.stage !== 'squad_evaluation' && room.stage !== 'playing_xi_selection') return false;
    }

    this.clearRoomTimers(room);

    // Finalize trading flags/offers cleanly when exiting trading_window
    if (room.stage === 'trading_window' && newStage !== 'trading_window') {
      room.auction_state.trading_completed = true;
      room.auction_state.stage_ends_at = undefined;
      room.auction_state.stage_duration_seconds = undefined;
      for (const offer of room.pending_trades.values()) {
        if (offer.status === 'pending' || offer.status === 'countered') {
          offer.status = 'cancelled';
          this.io.to(room.room_code).emit('trade_offer_updated', offer);
        }
      }
    }

    room.stage = newStage;
    room.auction_state.stage = newStage;

    if (newStage === 'main_auction') {
      room.auction_state.phase = 'bidding';
      // Generate sequence only once; never re-randomize an ongoing auction sequence
      if (room.auction_state.current_player_index < 0) {
        this.sortPool(room.pool, room.settings.order_type, room.settings.sport_type);
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
      room.auction_state.trading_started = true;
      room.auction_state.trading_completed = false;
      room.auction_state.current_player = null;
      const dur = durationSeconds || 180;
      room.auction_state.stage_duration_seconds = dur;
      room.auction_state.stage_ends_at = Date.now() + dur * 1000;
      this.scheduleStageDeadlineTimer(room, dur * 1000);
      this.addCommentary(
        room,
        `🤝 TRADE ROUND OPEN! Player-for-player swaps active for ${Math.round(dur / 60)} minutes.`,
        'stage'
      );
    } else if (newStage === 'squad_evaluation') {
      room.auction_state.phase = 'evaluation';
      room.auction_state.trading_completed = true;
      room.auction_state.stage_ends_at = undefined;
      room.auction_state.stage_duration_seconds = undefined;
      this.refreshParticipantMetrics(room);
      room.results = computeAuctionResults(
        room.room_code,
        Array.from(room.participants.values()),
        room.settings,
        room.all_completed_bids,
        room.completed_trades,
        Array.from(room.playing_xi_submissions.values())
      );
      this.addCommentary(room, `📊 FINAL EVALUATION: Squad composition, purse balances, and 5-pillar rankings complete.`, 'stage');
    } else if (newStage === 'playing_xi_selection') {
      room.auction_state.phase = 'playing_xi';
      room.auction_state.trading_completed = true;
      const dur = durationSeconds || 120;
      room.auction_state.stage_duration_seconds = dur;
      room.auction_state.stage_ends_at = Date.now() + dur * 1000;
      const label = room.settings.sport_type === 'PKL' ? 'STARTING 7' : 'PLAYING XI';
      this.addCommentary(room, `🏏 ${label} SELECTION ACTIVE! Managers, assemble your matchday squad.`, 'stage');
    } else if (newStage === 'playing_xi_evaluation') {
      room.auction_state.phase = 'evaluation';
      room.auction_state.trading_completed = true;
      room.auction_state.stage_ends_at = undefined;
      room.auction_state.stage_duration_seconds = undefined;
      this.refreshParticipantMetrics(room);
      room.results = computeAuctionResults(
        room.room_code,
        Array.from(room.participants.values()),
        room.settings,
        room.all_completed_bids,
        room.completed_trades,
        Array.from(room.playing_xi_submissions.values())
      );
      this.addCommentary(room, `📋 LINEUP RANKINGS: Matchday lineup evaluation complete.`, 'stage');
    } else if (newStage === 'championship_recap') {
      this.completeAuction(room);
      return true;
    }

    this.io.to(room.room_code).emit('stage_transitioned', {
      stage: newStage,
      auction_state: this.getPublicState(room),
    });

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
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
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, hostSessionId);
      return false;
    }
    // Block Round 2 configuration while Round 1 pool is active or after Round 2 / Trading already completed
    if (
      room.auction_state.round2_completed ||
      room.auction_state.trading_started ||
      room.stage === 'trading_window' ||
      room.auction_state.phase === 'completed' ||
      (room.auction_state.round_number === 1 && room.pool.length > 0)
    ) {
      return false;
    }

    const idSet = new Set(playerIds);
    const chosen = room.unsold_pool.filter(p => idSet.has(p.id));
    if (chosen.length === 0) return false;

    this.sortPool(chosen, orderType, room.settings.sport_type);
    room.pool = chosen;
    room.unsold_pool = room.unsold_pool.filter(p => !idSet.has(p.id));
    room.auction_state.round1_completed = true;
    room.auction_state.round2_completed = false;
    room.auction_state.total_pool_count = room.pool.length;
    room.auction_state.remaining_pool_count = room.pool.length;
    room.auction_state.round_number = 2;
    room.auction_state.phase = 'unsold_round';
    room.auction_state.stage = 'unsold_auction';
    room.stage = 'unsold_auction';

    this.addCommentary(room, `Host re-entered ${chosen.length} selected unsold players for Round 2 bidding.`, 'stage');
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'unsold_pool_configured').catch(() => { });

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
    if (this.isRoomTerminated(room)) {
      return { success: false, error: `${AUCTION_TERMINATED_ERROR}: This auction has been terminated.` };
    }

    if (
      room.stage !== 'trading_window' ||
      room.auction_state.phase !== 'trading' ||
      room.auction_state.round1_completed !== true ||
      room.auction_state.round2_completed !== true ||
      room.auction_state.trading_completed === true
    ) {
      return { success: false, error: 'Trading is only unlocked during Stage 3 after Round 1 and Round 2 complete.' };
    }

    if (room.auction_state.stage_ends_at && Date.now() >= room.auction_state.stage_ends_at) {
      this.concludeTradingWindow(room, 'Trading window deadline reached.');
      return { success: false, error: 'Trading deadline has expired.' };
    }

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
    this.saveRoomSnapshot(room.room_code, 'trade_proposed').catch(() => { });
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
    if (this.isRoomTerminated(room)) {
      return { success: false, error: `${AUCTION_TERMINATED_ERROR}: This auction has been terminated.` };
    }

    if (
      room.stage !== 'trading_window' ||
      room.auction_state.phase !== 'trading' ||
      room.auction_state.trading_completed === true
    ) {
      return { success: false, error: 'Trading window is not active.' };
    }

    if (room.auction_state.stage_ends_at && Date.now() >= room.auction_state.stage_ends_at) {
      this.concludeTradingWindow(room, 'Trading window deadline reached.');
      return { success: false, error: 'Trading deadline has expired.' };
    }

    const trade = room.pending_trades.get(tradeId);
    if (!trade) return { success: false, error: 'Trade offer not found' };

    if (trade.status !== 'pending' && trade.status !== 'countered') {
      return { success: false, error: `Trade offer is already ${trade.status}` };
    }

    if (trade.receiver_id !== receiverId && trade.sender_id !== receiverId) {
      return { success: false, error: 'Unauthorized to respond to this trade' };
    }

    // Mutual consent: the sender cannot unilaterally accept their own pending trade proposal
    if (action === 'accept' && trade.receiver_id !== receiverId) {
      return { success: false, error: 'Mutual consent required: only the receiving manager can accept this trade.' };
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
      this.saveRoomSnapshot(room.room_code, 'trade_rejected').catch(() => { });
      return { success: true };
    }

    if (action === 'counter' && counterPlayerId) {
      const counterPlayer =
        room.settings.sport_type === 'PKL'
          ? getPklPlayerById(counterPlayerId)
          : getPlayerById(counterPlayerId);
      if (!counterPlayer) return { success: false, error: 'Invalid counter player' };
      trade.status = 'countered';
      trade.counter_player = counterPlayer;
      this.io.to(room.room_code).emit('trade_offer_updated', trade);
      this.broadcastState(room);
      this.saveRoomSnapshot(room.room_code, 'trade_countered').catch(() => { });
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
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, senderId);
      return false;
    }

    const trade = room.pending_trades.get(tradeId);
    if (!trade || trade.sender_id !== senderId) return false;

    trade.status = 'cancelled';
    this.io.to(room.room_code).emit('trade_offer_updated', trade);
    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
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
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, participantId);
      return false;
    }

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
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
    return true;
  }

  public submitPlayingXI(
    roomCode: string,
    participantId: string,
    submission: PlayingXISubmission
  ): { success: boolean; error?: string; scoreBreakdown?: PlayingXIScoreBreakdown } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (this.isRoomTerminated(room)) {
      return { success: false, error: `${AUCTION_TERMINATED_ERROR}: This auction has been terminated.` };
    }

    const participant = room.participants.get(participantId);
    if (!participant || !participant.franchise) {
      return { success: false, error: 'Must belong to an active franchise' };
    }

    const isPkl = room.settings.sport_type === 'PKL';
    const requiredLineupSize = isPkl ? 7 : 11;
    const maxOverseas = isPkl ? 2 : 4;
    const lineupLabel = isPkl ? 'Starting 7' : 'Playing XI';

    const existingSub = room.playing_xi_submissions.get(participantId);
    if (existingSub?.is_submitted || existingSub?.is_locked) {
      return { success: false, error: `${lineupLabel} has already been submitted and locked.` };
    }

    if (!submission.players || submission.players.length !== requiredLineupSize) {
      return { success: false, error: `${lineupLabel} must contain exactly ${requiredLineupSize} players` };
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
    if (overseasCount > maxOverseas) {
      return {
        success: false,
        error: `${isPkl ? 'PKL' : 'IPL'} overseas limit exceeded: Selected ${overseasCount} overseas players (maximum ${maxOverseas} allowed).`,
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
    this.saveRoomSnapshot(room.room_code, 'playing_xi_submitted').catch(() => { });

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
    if (this.isRoomTerminated(room)) return;
    this.clearRoomTimers(room);
    room.status = 'completed';
    room.auction_state.status = 'completed';

    room.auction_state.trading_completed = true;
    room.auction_state.stage_ends_at = undefined;
    room.auction_state.stage_duration_seconds = undefined;
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
    // Persist results and completed room status immediately, then write the final snapshot
    persistResults(results)
      .catch(err => {
        console.error(`[COMPLETE AUCTION RESULTS ERROR] Room ${room.room_code}:`, err?.message || err);
      })
      .finally(() => {
        this.saveRoomSnapshot(room.room_code, 'auction_completed').catch(err => {
          console.error(`[COMPLETE AUCTION SNAPSHOT ERROR] Room ${room.room_code}:`, err?.message || err);
        });
      });

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
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, hostSessionId);
      return false;
    }

    const target = room.participants.get(targetId);
    if (!target) return false;

    room.participants.delete(targetId);
    if (target.socket_id) {
      this.io.to(target.socket_id).emit('kicked', 'Removed from room by host');
    }

    this.broadcastState(room);
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
    return true;
  }

  public transferHost(roomCode: string, currentHostId: string, newHostId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (this.isRoomTerminated(room)) {
      this.emitTerminatedRejection(room, currentHostId);
      return false;
    }

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
    this.saveRoomSnapshot(room.room_code, 'stage_transition').catch(() => { });
    return true;
  }

  public addChatMessage(roomCode: string, message: ChatMessage) {
    const room = this.getRoom(roomCode);
    if (!room || this.isRoomTerminated(room)) return;

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
      status: room.status || room.auction_state.status,
      termination_reason: room.termination_reason ?? room.auction_state.termination_reason ?? null,
      terminated_at: room.terminated_at ?? room.auction_state.terminated_at ?? null,
      terminated_by_system: room.terminated_by_system ?? room.auction_state.terminated_by_system ?? false,
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
        status: currentRoom.status || (currentRoom.auction_state.phase === 'terminated' ? 'terminated' : currentRoom.auction_state.phase === 'completed' ? 'completed' : currentRoom.auction_state.phase === 'lobby' ? 'lobby' : 'live'),
        termination_reason: currentRoom.termination_reason ?? null,
        terminated_at: currentRoom.terminated_at ?? null,
        terminated_by_system: Boolean(currentRoom.terminated_by_system),
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

    const rawSettings = (snapshot.settings || (snapshot as any).config || {}) as any;
    const isPkl =
      rawSettings.sport_type === 'PKL' ||
      (snapshot as any).sport === 'pkl' ||
      (snapshot as any).config?.season?.includes('Season') ||
      code.startsWith('K');
    const defaultSettings = isPkl ? DEFAULT_PKL_ROOM_SETTINGS : DEFAULT_ROOM_SETTINGS;
    const defaultPoolIds = (isPkl ? ALL_PKL_PLAYERS : ALL_PLAYERS).map(p => p.id);

    const sanitizedSettings: RoomSettings = {
      ...defaultSettings,
      ...rawSettings,
      sport_type: rawSettings.sport_type || (isPkl ? 'PKL' : 'IPL'),
      squad_size: Number(rawSettings.squad_size ?? rawSettings.min_squad_size ?? rawSettings.max_squad_size ?? defaultSettings.squad_size),
      purse: Number(rawSettings.purse ?? rawSettings.total_purse ?? defaultSettings.purse),
      timer_seconds: Number(rawSettings.timer_seconds ?? defaultSettings.timer_seconds),
      order_type: rawSettings.order_type || defaultSettings.order_type,
      accelerated_round: rawSettings.accelerated_round !== undefined ? Boolean(rawSettings.accelerated_round) : defaultSettings.accelerated_round,
      selected_player_ids:
        Array.isArray(rawSettings.selected_player_ids) && rawSettings.selected_player_ids.length > 0
          ? rawSettings.selected_player_ids
          : defaultPoolIds,
    };

    // Rebuild participants Map
    const participants = new Map<string, Participant>();
    if (Array.isArray(snapshot.participants)) {
      for (const p of snapshot.participants) {
        const id = p.id || (p as any).session_id || (p as any).user_id || '';
        if (!id) continue;
        participants.set(id, {
          ...p,
          id,
          room_code: code,
          display_name: (p as any).display_name || (p as any).name || 'Manager',
          team_name: p.team_name || (p as any).team_name || '',
          team_name_normalized: p.team_name_normalized || (p as any).team_name_normalized || '',
          team_short_code: p.team_short_code || (p as any).team_short_code || (p as any).short_code || '',
          team_color: p.team_color || (p as any).team_color || '#F7A721',
          franchise: p.franchise ?? null,
          purse_remaining: p.purse_remaining ?? (p as any).purse ?? sanitizedSettings.purse,
          squad: Array.isArray(p.squad) ? p.squad : [],
          has_withdrawn_current: Boolean(p.has_withdrawn_current),
          last_active: p.last_active || Date.now(),
          is_host: Boolean(p.is_host),
          is_spectator: Boolean(p.is_spectator || (p as any).role === 'spectator'),
          role: p.role || (p.is_spectator ? 'spectator' : (p.is_host ? 'host' : 'manager')),
          has_exited: Boolean(p.has_exited),
          exited_at: p.exited_at ?? null,
          participation_status: p.participation_status || 'ACTIVE',
          disqualification_reason: p.disqualification_reason ?? null,
          disqualified_at: p.disqualified_at ?? null,
          is_connected: false,
          socket_id: undefined,
        });
      }
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
      snapshot.auction_state?.passed_participant_ids || snapshot.auction_state?.withdrawn_participant_ids || []
    );

    const rawStage = (snapshot.stage || snapshot.auction_state?.stage || 'main_auction') as WorkflowStage;
    const rawPhase = (snapshot.auction_state?.phase || (snapshot as any).phase || 'lobby') as AuctionPhase;
    const isSnapTerminated =
      rawPhase === 'terminated' ||
      (snapshot as any).status === 'terminated' ||
      snapshot.auction_state?.status === 'terminated';
    const rawStatus = isSnapTerminated
      ? 'terminated'
      : rawPhase === 'completed'
        ? 'completed'
        : rawPhase === 'lobby'
          ? 'lobby'
          : 'live';
    const rawRoundNumber = snapshot.auction_state?.round_number ?? (snapshot as any).round_number ?? 1;
    const snapPool = snapshot.pool || [];
    const snapUnsold = snapshot.unsold_pool || [];

    const hasExplicitR1 = snapshot.auction_state?.round1_completed !== undefined;
    const hasExplicitR2 = snapshot.auction_state?.round2_completed !== undefined;
    const inferredR1Done = hasExplicitR1
      ? Boolean(snapshot.auction_state?.round1_completed)
      : rawStage === 'unsold_auction' ||
      rawStage === 'squad_evaluation' ||
      rawStage === 'playing_xi_selection' ||
      rawStage === 'playing_xi_evaluation' ||
      rawStage === 'championship_recap' ||
      (rawStage === 'trading_window' && (rawRoundNumber >= 2 || (snapPool.length === 0 && snapUnsold.length === 0)));

    const inferredR2Done = hasExplicitR2
      ? Boolean(snapshot.auction_state?.round2_completed)
      : rawStage === 'squad_evaluation' ||
      rawStage === 'playing_xi_selection' ||
      rawStage === 'playing_xi_evaluation' ||
      rawStage === 'championship_recap' ||
      (rawStage === 'trading_window' && snapPool.length === 0 && snapUnsold.length === 0 && inferredR1Done);

    const record: RoomRecord = {
      room_code: code,
      name: snapshot.name || (snapshot as any).config?.name || `Room ${code}`,
      host_session_id: snapshot.host_session_id,
      host_disconnect_time: snapshot.host_disconnect_time,
      status: rawStatus,
      termination_reason: snapshot.termination_reason ?? snapshot.auction_state?.termination_reason ?? null,
      terminated_at: snapshot.terminated_at ?? snapshot.auction_state?.terminated_at ?? null,
      terminated_by_system: snapshot.terminated_by_system ?? snapshot.auction_state?.terminated_by_system ?? false,
      is_terminating: false,
      settings: sanitizedSettings,
      participants,
      chat_messages: [],
      auction_state: {
        ...(snapshot.auction_state || {}),
        room_code: code,
        phase: isSnapTerminated ? 'terminated' : rawPhase,
        status: rawStatus,
        stage: rawStage,
        round_number: rawRoundNumber,
        round1_completed: inferredR1Done,
        round2_completed: inferredR2Done,
        trading_started: snapshot.auction_state?.trading_started ?? (rawStage === 'trading_window' && inferredR1Done && inferredR2Done),
        trading_completed: snapshot.auction_state?.trading_completed ?? (rawStage === 'squad_evaluation' || rawStage === 'playing_xi_selection' || rawStage === 'playing_xi_evaluation' || rawStage === 'championship_recap' || rawPhase === 'completed'),
        current_player_index: snapshot.auction_state?.current_player_index ?? (snapshot as any).current_player_index ?? 0,
        current_player: snapshot.auction_state?.current_player || (
          (snapshot as any).current_player_id
            ? (getPklPlayerById((snapshot as any).current_player_id) || getPlayerById((snapshot as any).current_player_id) || null)
            : null
        ),
        current_bid: snapshot.auction_state?.current_bid ?? (snapshot as any).current_bid ?? 0,
        current_bidder_id: snapshot.auction_state?.current_bidder_id ?? (snapshot as any).highest_bidder_id ?? null,
        timer_seconds: snapshot.auction_state?.timer_seconds ?? sanitizedSettings.timer_seconds,
        timer_ends_at: snapshot.auction_state?.timer_ends_at ?? 0,
        server_time: Date.now(),
        bids: snapshot.auction_state?.bids || [],
        withdrawn_participant_ids: snapshot.auction_state?.withdrawn_participant_ids || [],
        pass_count: snapshot.auction_state?.pass_count ?? current_player_passes.size,
        total_eligible_passers: snapshot.auction_state?.total_eligible_passers ?? 0,
        passed_participant_ids: snapshot.auction_state?.passed_participant_ids ?? Array.from(current_player_passes),
        termination_reason: snapshot.termination_reason ?? snapshot.auction_state?.termination_reason ?? null,
        terminated_at: snapshot.terminated_at ?? snapshot.auction_state?.terminated_at ?? null,
        terminated_by_system: snapshot.terminated_by_system ?? snapshot.auction_state?.terminated_by_system ?? false,
        termination_message: snapshot.auction_state?.termination_message ?? (isSnapTerminated ? ALL_MANAGERS_EXITED_MESSAGE : null),
      },
      pool: snapPool,
      unsold_pool: snapUnsold,
      all_completed_bids: snapshot.all_completed_bids || [],
      results: snapshot.results || null,
      timer_handle: null,
      next_player_handle: null,
      announcement_timeout_handle: null,
      stage_deadline_handle: null,
      client_announcement_completions: new Set(),
      is_processing_bid: false,
      current_player_passes,
      current_player_bid_count: snapshot.auction_state?.bids?.length || 0,
      is_processing_unsold: false,
      stage: rawStage,
      pending_trades,
      completed_trades: snapshot.completed_trades || [],
      playing_xi_submissions,
      commentary_events: snapshot.commentary_events || [],
    };
    record.auction_state.total_eligible_passers = this.getEligibleBidders(record).length;

    const now = Date.now();
    let recoveredLifecycleState = false;

    if (this.isRoomTerminated(record)) {
      record.status = 'terminated';
      record.auction_state.phase = 'terminated';
      record.auction_state.status = 'terminated';
      record.auction_state.is_paused = false;
      record.auction_state.timer_ends_at = 0;
      record.auction_state.stage_ends_at = undefined;
      for (const p of record.participants.values()) {
        if (!p.is_spectator && p.role !== 'spectator') {
          p.participation_status = 'DISQUALIFIED';
          p.disqualification_reason = p.disqualification_reason || record.termination_reason || ALL_MANAGERS_EXITED_REASON;
          p.disqualified_at = p.disqualified_at || record.terminated_at || now;
        }
      }
      this.rooms.set(code, record);
      console.log(`[RESTORE] Terminated room ${code} restored cleanly from database (no timers started).`);
      return record;
    }

    // Safe recovery for inconsistent or expired trading_window snapshots
    if (record.stage === 'trading_window' || record.auction_state.phase === 'trading') {
      if (!record.auction_state.round1_completed && record.pool.length > 0) {
        // Incomplete Round 1 saved prematurely as trading_window -> restore to Round 1
        record.stage = 'main_auction';
        record.auction_state.stage = 'main_auction';
        record.auction_state.phase = 'bidding';
        record.auction_state.round_number = 1;
        record.auction_state.round1_completed = false;
        record.auction_state.round2_completed = false;
        record.auction_state.trading_started = false;
        record.auction_state.trading_completed = false;
        record.auction_state.stage_ends_at = undefined;
        record.auction_state.stage_duration_seconds = undefined;
        record.auction_state.pause_remaining_ms = record.settings.timer_seconds * 1000;
        record.auction_state.timer_ends_at = now + record.auction_state.pause_remaining_ms;
        record.auction_state.is_paused = true;
        record.auto_paused_reason = 'server_restart';
        recoveredLifecycleState = true;
        this.addCommentary(record, `Room recovered: resumed paused Round 1 auction with ${record.pool.length} remaining players.`, 'stage');
      } else if (!record.auction_state.round2_completed && (record.unsold_pool.length > 0 || (record.pool.length > 0 && record.auction_state.round_number === 2))) {
        // Incomplete Round 2 saved prematurely as trading_window -> restore to Round 2
        if (record.pool.length === 0 && record.unsold_pool.length > 0) {
          record.pool = [...record.unsold_pool];
          record.unsold_pool = [];
        }
        record.stage = 'unsold_auction';
        record.auction_state.stage = 'unsold_auction';
        record.auction_state.phase = 'unsold_round';
        record.auction_state.round_number = 2;
        record.auction_state.round1_completed = true;
        record.auction_state.round2_completed = false;
        record.auction_state.trading_started = false;
        record.auction_state.trading_completed = false;
        record.auction_state.stage_ends_at = undefined;
        record.auction_state.stage_duration_seconds = undefined;
        record.auction_state.pause_remaining_ms = undefined;
        record.auction_state.is_paused = false;
        record.auto_paused_reason = null;
        recoveredLifecycleState = true;
        this.addCommentary(record, `Room recovered: resumed Round 2 auction before unlocking Trade Round.`, 'stage');
      } else if (
        record.auction_state.trading_completed === true ||
        !record.auction_state.stage_ends_at ||
        now >= record.auction_state.stage_ends_at ||
        !this.isTradingEligible(record)
      ) {
        // Trading deadline expired or trading ineligible/already concluded -> advance safely to Final Evaluation
        for (const offer of record.pending_trades.values()) {
          if (offer.status === 'pending' || offer.status === 'countered') {
            offer.status = 'cancelled';
          }
        }
        record.stage = 'squad_evaluation';
        record.auction_state.stage = 'squad_evaluation';
        record.auction_state.phase = 'evaluation';
        record.auction_state.round1_completed = true;
        record.auction_state.round2_completed = true;
        record.auction_state.trading_started = true;
        record.auction_state.trading_completed = true;
        record.auction_state.stage_ends_at = undefined;
        record.auction_state.stage_duration_seconds = undefined;
        this.refreshParticipantMetrics(record);
        record.results = computeAuctionResults(
          record.room_code,
          Array.from(record.participants.values()),
          record.settings,
          record.all_completed_bids,
          record.completed_trades,
          Array.from(record.playing_xi_submissions.values())
        );
        recoveredLifecycleState = true;
        this.addCommentary(record, `Room recovered: trading session concluded cleanly into Final Evaluation.`, 'stage');
      } else {
        // Valid active Trade Round with remaining time -> preserve exact stage_ends_at countdown
        record.stage = 'trading_window';
        record.auction_state.stage = 'trading_window';
        record.auction_state.phase = 'trading';
        record.auction_state.trading_started = true;
        record.auction_state.trading_completed = false;
        this.scheduleStageDeadlineTimer(record, record.auction_state.stage_ends_at - now);
      }
    }

    this.rooms.set(code, record);

    if (recoveredLifecycleState) {
      this.saveRoomSnapshot(code, 'recovered_lifecycle_state').catch(() => { });
    }

    // Timer & lifecycle rehydration
    if (record.auction_state.phase === 'announcing' && record.auction_state.current_player) {
      const announceEndsAt = record.auction_state.announcement_ends_at || 0;
      const remainingAnnounceMs =
        announceEndsAt > now ? Math.min(8000, Math.max(1200, announceEndsAt - now)) : 3500;
      record.auction_state.announcement_ends_at = now + remainingAnnounceMs;
      if (!record.auction_state.is_paused) {
        record.auction_state.is_paused = true;
        record.auction_state.pause_remaining_ms = remainingAnnounceMs;
        record.auto_paused_reason = 'server_restart';
      } else if (!record.auction_state.pause_remaining_ms || record.auction_state.pause_remaining_ms <= 500) {
        record.auction_state.pause_remaining_ms = remainingAnnounceMs;
        record.auto_paused_reason = 'server_restart';
      }
    } else if (record.auction_state.phase === 'bidding' && record.auction_state.current_player) {
      const endsAt = record.auction_state.timer_ends_at || 0;
      const wasPausedWithoutRemaining =
        record.auction_state.is_paused === true &&
        (record.auction_state.pause_remaining_ms === undefined || record.auction_state.pause_remaining_ms <= 0);

      if (now >= endsAt && !wasPausedWithoutRemaining && !record.auction_state.is_paused) {
        // Timer expired during downtime while actively running -> resolve deterministically
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
        record.auction_state.is_paused = true;
        record.auto_paused_reason = 'server_restart';
        this.addCommentary(record, `Room recovered after restart. Previous player auction deterministically resolved.`, 'stage');
      } else {
        // Time remains OR room was stranded paused with no saved pause_remaining_ms -> recover cleanly & auto-resume on host reconnect
        const remainingMs =
          now < endsAt && endsAt - now > 1000
            ? Math.min(record.settings.timer_seconds * 1000, endsAt - now)
            : record.settings.timer_seconds * 1000;

        if (!record.auction_state.is_paused || wasPausedWithoutRemaining) {
          record.auction_state.pause_remaining_ms = remainingMs;
          record.auction_state.timer_ends_at = now + remainingMs;
          record.auction_state.is_paused = true;
          record.auto_paused_reason = 'server_restart';
          recoveredLifecycleState = true;
        }
        this.addCommentary(record, `Room recovered after restart. Bidding ready to resume at ${formatCurrency(record.auction_state.current_bid)}.`, 'bid');
      }
    }

    if (
      (record.auction_state.phase === 'unsold' || record.auction_state.phase === 'sold') &&
      !record.auction_state.is_paused &&
      !record.next_player_handle
    ) {
      this.scheduleNextPlayer(record, 2500);
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
