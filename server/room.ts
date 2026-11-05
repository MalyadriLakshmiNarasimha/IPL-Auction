import {
  AuctionPhase,
  AuctionResults,
  AuctionState,
  Bid,
  ChatMessage,
  FranchiseIdentity,
  Participant,
  Player,
  Reaction,
  RoomSettings,
} from '../src/shared/types';
import { ALL_PLAYERS } from '../src/shared/player-data';
import { DEFAULT_ROOM_SETTINGS, MIN_RESERVE_PER_SLOT } from '../src/shared/constants';
import { validateBid } from '../src/shared/validation';
import { computeAuctionResults } from '../src/shared/scoring';
import { persistResults } from './db';
import { prisma } from '../src/lib/db';
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
  is_processing_bid: boolean;
}

export class RoomManager {
  private rooms: Map<string, RoomRecord> = new Map();
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  public getRoom(roomCode: string): RoomRecord | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  public createRoom(roomCode: string, name: string, hostSessionId: string, hostDisplayName: string): RoomRecord {
    const code = roomCode.toUpperCase();
    const settings: RoomSettings = {
      ...DEFAULT_ROOM_SETTINGS,
      selected_player_ids: ALL_PLAYERS.map(p => p.id), // Default to all players
    };

    const hostParticipant: Participant = {
      id: hostSessionId,
      room_code: code,
      display_name: hostDisplayName,
      is_host: true,
      is_connected: true,
      last_active: Date.now(),
      franchise: null,
      purse_remaining: settings.purse,
      squad: [],
      has_withdrawn_current: false,
    };

    const participants = new Map<string, Participant>();
    participants.set(hostSessionId, hostParticipant);

    const initialAuctionState: AuctionState = {
      room_code: code,
      phase: 'lobby',
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
      is_processing_bid: false,
    };

    this.rooms.set(code, record);
    return record;
  }

  public joinRoom(roomCode: string, sessionId: string, displayName: string, socketId: string): RoomRecord | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    let participant = room.participants.get(sessionId);
    if (participant) {
      // Reconnection
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
      // New participant
      if (room.participants.size >= 20) {
        return null; // Room limit 20
      }
      participant = {
        id: sessionId,
        socket_id: socketId,
        room_code: room.room_code,
        display_name: displayName || `Player ${room.participants.size + 1}`,
        is_host: room.participants.size === 0,
        is_connected: true,
        last_active: Date.now(),
        franchise: null,
        purse_remaining: room.settings.purse,
        squad: [],
        has_withdrawn_current: false,
      };
      if (participant.is_host) {
        room.host_session_id = sessionId;
      }
      room.participants.set(sessionId, participant);
    }

    this.broadcastState(room);
    return room;
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

    // Check if color or short_code is already taken by someone else
    for (const [id, p] of room.participants.entries()) {
      if (id !== sessionId && p.franchise) {
        if (
          p.franchise.color.toLowerCase() === franchise.color.toLowerCase() ||
          p.franchise.short_code.toUpperCase() === franchise.short_code.toUpperCase()
        ) {
          return false;
        }
      }
    }

    const participant = room.participants.get(sessionId);
    if (!participant) return false;

    participant.franchise = franchise;
    this.broadcastState(room);
    return true;
  }

  public updateSettings(roomCode: string, sessionId: string, newSettings: Partial<RoomSettings>): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (room.auction_state.phase !== 'lobby') return false;

    // Update settings
    room.settings = {
      ...room.settings,
      ...newSettings,
    };

    // If purse updated, update everyone's remaining purse
    if (newSettings.purse) {
      for (const p of room.participants.values()) {
        p.purse_remaining = newSettings.purse;
      }
    }

    room.auction_state.timer_seconds = room.settings.timer_seconds;
    room.auction_state.total_pool_count = room.settings.selected_player_ids.length;
    room.auction_state.remaining_pool_count = room.settings.selected_player_ids.length;

    this.broadcastState(room);
    return true;
  }

  public startAuction(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (room.auction_state.phase !== 'lobby') return false;

    // Ensure all players with franchise
    const activeParticipants = Array.from(room.participants.values()).filter(p => p.franchise !== null);
    if (activeParticipants.length < 2) {
      this.io.to(room.room_code).emit('error_message', {
        message: 'At least 2 participants must choose a franchise to start the auction.',
      });
      return false;
    }

    // Assemble player pool
    const selectedIds = new Set(room.settings.selected_player_ids);
    let selectedPlayers = ALL_PLAYERS.filter(p => selectedIds.has(p.id));
    if (selectedPlayers.length === 0) {
      selectedPlayers = [...ALL_PLAYERS];
    }

    // Validate pool size
    const minPoolRequired = activeParticipants.length * room.settings.squad_size;
    if (selectedPlayers.length < minPoolRequired) {
      this.io.to(room.room_code).emit('error_message', {
        message: `Pool has only ${selectedPlayers.length} players, but ${minPoolRequired} are required for ${activeParticipants.length} teams of ${room.settings.squad_size}. Please add more players.`,
      });
      return false;
    }

    // Sort order
    if (room.settings.order_type === 'role') {
      const rolePriority: Record<string, number> = {
        BAT: 1,
        Batter: 1,
        WK: 2,
        Wicketkeeper: 2,
        'Wicket Keeper': 2,
        AR: 3,
        'All-Rounder': 3,
        'All Rounder': 3,
        BOWL: 4,
        Bowler: 4,
      };
      selectedPlayers.sort((a, b) => (rolePriority[a.role] || 9) - (rolePriority[b.role] || 9));
    } else if (room.settings.order_type === 'base_price') {
      selectedPlayers.sort((a, b) => b.base_price - a.base_price);
    } else {
      // Fisher-Yates random shuffle
      for (let i = selectedPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedPlayers[i], selectedPlayers[j]] = [selectedPlayers[j], selectedPlayers[i]];
      }
    }

    room.pool = selectedPlayers;
    room.unsold_pool = [];
    room.auction_state.total_pool_count = room.pool.length;
    room.auction_state.remaining_pool_count = room.pool.length;
    room.auction_state.phase = 'starting';
    room.auction_state.round_number = 1;
    room.auction_state.current_player_index = -1;

    // Update room status in MySQL
    prisma.room.updateMany({
      where: { room_code: room.room_code },
      data: { status: 'live' },
    }).catch(() => {});

    this.broadcastState(room);

    // After 2.5 seconds, present the first player
    setTimeout(() => {
      this.nextPlayer(room);
    }, 2500);

    return true;
  }

  public nextPlayer(room: RoomRecord) {
    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }

    // Check if all active squads are full
    const activeParticipants = Array.from(room.participants.values()).filter(p => p.franchise !== null);
    const allSquadsFull = activeParticipants.every(p => p.squad.length >= room.settings.squad_size);

    if (allSquadsFull || room.pool.length === 0) {
      // Check if we should trigger accelerated round
      if (
        room.auction_state.round_number === 1 &&
        room.settings.accelerated_round &&
        room.unsold_pool.length > 0 &&
        !allSquadsFull
      ) {
        room.auction_state.round_number = 2;
        room.auction_state.phase = 'accelerated';
        room.pool = [...room.unsold_pool];
        room.unsold_pool = [];
        room.auction_state.remaining_pool_count = room.pool.length;
        this.broadcastState(room);

        setTimeout(() => {
          this.nextPlayer(room);
        }, 3000);
        return;
      }

      // Finish auction
      this.completeAuction(room);
      return;
    }

    const nextPlayer = room.pool.shift()!;
    room.auction_state.current_player_index++;
    room.auction_state.current_player = nextPlayer;
    room.auction_state.current_bid = 0;
    room.auction_state.current_bidder_id = null;
    room.auction_state.bids = [];
    room.auction_state.withdrawn_participant_ids = [];
    room.auction_state.remaining_pool_count = room.pool.length;
    room.auction_state.phase = 'bidding';
    room.auction_state.is_paused = false;

    // Reset withdrawal state for all participants
    for (const p of room.participants.values()) {
      p.has_withdrawn_current = false;
    }

    // Set authoritative timer
    const durationMs = room.settings.timer_seconds * 1000;
    room.auction_state.timer_ends_at = Date.now() + durationMs;

    this.io.to(room.room_code).emit('next_player', {
      player: nextPlayer,
      auction_state: this.getPublicState(room),
    });

    this.startTimerLoop(room);
  }

  private startTimerLoop(room: RoomRecord) {
    if (room.timer_handle) {
      clearInterval(room.timer_handle);
    }

    room.timer_handle = setInterval(() => {
      const now = Date.now();

      // Host disconnect check
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

      if (remainingMs <= 0) {
        clearInterval(room.timer_handle!);
        room.timer_handle = null;
        this.handleTimerExpired(room);
      }
    }, 200);
  }

  public placeBid(roomCode: string, sessionId: string, increment: number): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    // Atomic guard
    if (room.is_processing_bid) return false;
    room.is_processing_bid = true;

    try {
      const participant = room.participants.get(sessionId);
      const recipient = participant?.socket_id || sessionId;
      if (!participant || !participant.franchise) {
        this.io.to(recipient).emit('bid_rejected', { reason: 'Must choose a franchise to bid' });
        return false;
      }

      const validation = validateBid(participant, room.auction_state, room.settings, increment, false);
      if (!validation.valid || !validation.expectedAmount) {
        this.io.to(recipient).emit('bid_rejected', { reason: validation.reason || 'Invalid bid' });
        return false;
      }

      const newBidAmount = validation.expectedAmount;
      const player = room.auction_state.current_player!;

      const bidRecord: Bid = {
        id: `bid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        player_id: player.id,
        participant_id: participant.id,
        franchise_name: participant.franchise.name,
        franchise_short_code: participant.franchise.short_code,
        franchise_color: participant.franchise.color,
        amount: newBidAmount,
        timestamp: Date.now(),
      };

      room.auction_state.current_bid = newBidAmount;
      room.auction_state.current_bidder_id = participant.id;
      room.auction_state.bids.unshift(bidRecord);
      if (room.auction_state.bids.length > 10) {
        room.auction_state.bids.pop();
      }

      // Reset timer to full value!
      const durationMs = room.settings.timer_seconds * 1000;
      room.auction_state.timer_ends_at = Date.now() + durationMs;

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
    if (!room || room.auction_state.phase !== 'bidding') return false;

    const participant = room.participants.get(sessionId);
    if (!participant) return false;

    // Cannot withdraw if current highest bidder
    if (room.auction_state.current_bidder_id === sessionId) {
      return false;
    }

    participant.has_withdrawn_current = true;
    if (!room.auction_state.withdrawn_participant_ids.includes(sessionId)) {
      room.auction_state.withdrawn_participant_ids.push(sessionId);
    }

    this.io.to(room.room_code).emit('withdraw_success', { participant_id: sessionId });

    // Check if everyone except highest bidder has withdrawn
    if (room.auction_state.current_bidder_id) {
      const activeEligible = Array.from(room.participants.values()).filter(
        p => p.franchise && p.squad.length < room.settings.squad_size
      );

      const remainingNonWithdrawn = activeEligible.filter(
        p => !p.has_withdrawn_current && p.id !== room.auction_state.current_bidder_id
      );

      if (remainingNonWithdrawn.length === 0 && activeEligible.length >= 2) {
        // Instant gavel strike!
        if (room.timer_handle) {
          clearInterval(room.timer_handle);
          room.timer_handle = null;
        }
        this.handleTimerExpired(room);
      }
    }

    this.broadcastState(room);
    return true;
  }

  private handleTimerExpired(room: RoomRecord) {
    const player = room.auction_state.current_player;
    if (!player) return;

    if (room.auction_state.current_bidder_id && room.auction_state.current_bid > 0) {
      // SOLD!
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

      // Log for awards
      room.all_completed_bids.push({
        player_id: player.id,
        player,
        bids_count: room.auction_state.bids.length,
        final_price: finalPrice,
        winner_id: winner.id,
      });

      this.io.to(room.room_code).emit('player_sold', {
        player,
        winner,
        price: finalPrice,
        auction_state: this.getPublicState(room),
      });

      // 3.5s celebration delay for gavel strike & confetti, then next player
      setTimeout(() => {
        this.nextPlayer(room);
      }, 3500);
    } else {
      // UNSOLD!
      room.auction_state.phase = 'unsold';
      room.auction_state.unsold_count++;
      if (room.settings.accelerated_round) {
        room.unsold_pool.push(player);
      }

      this.io.to(room.room_code).emit('player_unsold', {
        player,
        auction_state: this.getPublicState(room),
      });

      // 2.5s delay for unsold stamp and fade, then next player
      setTimeout(() => {
        this.nextPlayer(room);
      }, 2500);
    }
  }

  public pauseAuction(roomCode: string, sessionId: string, force: boolean = false): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (!force && room.host_session_id !== sessionId) return false;
    if (room.auction_state.phase !== 'bidding' || room.auction_state.is_paused) return false;

    const remainingMs = Math.max(0, room.auction_state.timer_ends_at - Date.now());
    room.auction_state.pause_remaining_ms = remainingMs;
    room.auction_state.is_paused = true;

    this.io.to(room.room_code).emit('auction_paused');
    this.broadcastState(room);
    return true;
  }

  public resumeAuction(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (!room.auction_state.is_paused) return false;

    const remainingMs = room.auction_state.pause_remaining_ms || room.settings.timer_seconds * 1000;
    room.auction_state.timer_ends_at = Date.now() + remainingMs;
    room.auction_state.is_paused = false;

    this.io.to(room.room_code).emit('auction_resumed', room.auction_state.timer_ends_at);
    this.broadcastState(room);
    return true;
  }

  public skipPlayer(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;
    if (room.auction_state.phase !== 'bidding') return false;

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }

    const player = room.auction_state.current_player;
    if (player && room.settings.accelerated_round) {
      room.unsold_pool.push(player);
    }

    room.auction_state.unsold_count++;
    this.nextPlayer(room);
    return true;
  }

  public endAuctionEarly(roomCode: string, sessionId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.host_session_id !== sessionId) return false;

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }

    this.completeAuction(room);
    return true;
  }

  public completeAuction(room: RoomRecord) {
    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }

    room.auction_state.phase = 'completed';

    const participantsList = Array.from(room.participants.values());
    const results = computeAuctionResults(
      room.room_code,
      participantsList,
      room.settings,
      room.all_completed_bids
    );

    room.results = results;
    persistResults(results);

    // Update room status in MySQL
    prisma.room.updateMany({
      where: { room_code: room.room_code },
      data: { status: 'completed' },
    }).catch(() => {});

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
    return true;
  }

  public transferHost(roomCode: string, currentHostId: string, newHostId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    // Allowed if current host or if host was disconnected > 60s
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
    return {
      ...room.auction_state,
      server_time: Date.now(),
    };
  }

  public broadcastState(room: RoomRecord) {
    const payload = {
      room_code: room.room_code,
      settings: room.settings,
      participants: Array.from(room.participants.values()),
      auction_state: this.getPublicState(room),
      results: room.results,
    };
    this.io.to(room.room_code).emit('state_sync', payload);
  }
}

