'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import {
  AuctionResults,
  AuctionState,
  ChatMessage,
  FranchiseIdentity,
  Participant,
  Reaction,
  RoomSettings,
} from '@/shared/types';
import { DEFAULT_ROOM_SETTINGS, FRANCHISE_PRESETS, formatCurrency } from '@/shared/constants';
import { SplitFlapNumber } from '@/components/SplitFlapNumber';
import { CircularTimerRing } from '@/components/CircularTimerRing';
import { StickyBidDock } from '@/components/StickyBidDock';
import { BidLadder } from '@/components/BidLadder';
import { TeamsDrawer } from '@/components/TeamsDrawer';
import { ReactionRail } from '@/components/ReactionRail';
import { LiveChat } from '@/components/LiveChat';
import { GavelOverlay } from '@/components/GavelOverlay';
import { PoolPickerModal } from '@/components/PoolPickerModal';
import { HostControlsModal } from '@/components/HostControlsModal';
import { ResultsView } from '@/components/ResultsView';
import {
  Copy,
  Share2,
  Users,
  Settings,
  Crown,
  Play,
  Check,
  AlertTriangle,
  UserX,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Pause,
} from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = ((params.code as string) || '').toUpperCase();

  const [sessionId, setSessionId] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Room State
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_ROOM_SETTINGS);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [results, setResults] = useState<AuctionResults | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Modals & Drawers
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Local user participant
  const currentUser = useMemo(() => {
    return participants.find(p => p.id === sessionId) || null;
  }, [participants, sessionId]);

  const isHost = currentUser?.is_host || false;

  useEffect(() => {
    let active = true;

    // Verify user authentication
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(authData => {
        if (!active) return;
        if (!authData?.authenticated || !authData?.user) {
          router.replace(`/login?redirect=/room/${roomCode}`);
          return;
        }

        const user = authData.user;
        const token = authData.sessionToken || localStorage.getItem('ipl_session_token') || '';
        setSessionId(user.id);
        setDisplayName(user.name);

        const socket = getSocket(token);

        socket.on('connect', () => {
          setIsConnected(true);
          socket.emit('room_join', {
            room_code: roomCode,
            display_name: user.name,
            session_id: user.id,
          });
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        socket.on('state_sync', data => {
          setSettings(data.settings);
          setParticipants(data.participants);
          setAuctionState(data.auction_state);
          if (data.results) setResults(data.results);
          setIsJoined(true);
        });

        socket.on('bid_success', data => {
          setAuctionState(data.auction_state);
          // Accessibility announcement
          const el = document.getElementById('accessibility-announcer');
          if (el) {
            el.innerText = `New bid: ${data.bid.franchise_short_code} bid ${formatCurrency(data.bid.amount)}`;
          }
        });

        socket.on('player_sold', data => {
          setAuctionState(data.auction_state);
          const el = document.getElementById('accessibility-announcer');
          if (el) {
            el.innerText = `${data.player.name} sold to ${data.winner.franchise?.name} for ${formatCurrency(data.price)}`;
          }
        });

        socket.on('player_unsold', data => {
          setAuctionState(data.auction_state);
        });

        socket.on('next_player', data => {
          setAuctionState(data.auction_state);
        });

        socket.on('auction_ended', finalResults => {
          setResults(finalResults);
        });

        socket.on('new_chat', msg => {
          setChatMessages(prev => [...prev.slice(-49), msg]);
        });

        socket.on('new_reaction', rx => {
          setReactions(prev => [...prev.slice(-20), rx]);
        });

        socket.on('error_message', err => {
          setErrorMessage(err.message);
          setTimeout(() => setErrorMessage(null), 4000);
        });

        socket.on('kicked', reason => {
          alert(`You were removed from the room: ${reason}`);
          router.push('/');
        });

        // If socket already connected, join immediately
        if (socket.connected) {
          socket.emit('room_join', {
            room_code: roomCode,
            display_name: user.name,
            session_id: user.id,
          });
        }
      })
      .catch(() => {
        router.replace(`/login?redirect=/room/${roomCode}`);
      });

    return () => {
      active = false;
      const socket = getSocket();
      socket.off('state_sync');
      socket.off('bid_success');
      socket.off('player_sold');
      socket.off('player_unsold');
      socket.off('next_player');
      socket.off('auction_ended');
      socket.off('new_chat');
      socket.off('new_reaction');
      socket.off('error_message');
      socket.off('kicked');
    };
  }, [roomCode, router]);

  const handlePickFranchise = (franchise: FranchiseIdentity) => {
    const socket = getSocket();
    socket.emit('franchise_pick', {
      room_code: roomCode,
      session_id: sessionId,
      franchise,
    });
  };

  const handleUpdateSettings = (partial: Partial<RoomSettings>) => {
    const socket = getSocket();
    socket.emit('settings_update', {
      room_code: roomCode,
      session_id: sessionId,
      settings: partial,
    });
  };

  const handleStartAuction = () => {
    const socket = getSocket();
    socket.emit('start_auction', {
      room_code: roomCode,
      session_id: sessionId,
    });
  };

  const handleBid = (increment: number) => {
    const socket = getSocket();
    socket.emit('place_bid', {
      room_code: roomCode,
      session_id: sessionId,
      increment,
    });
  };

  const handleWithdraw = () => {
    const socket = getSocket();
    socket.emit('withdraw_bid', {
      room_code: roomCode,
      session_id: sessionId,
    });
  };

  const handleSendChat = (message: string) => {
    const socket = getSocket();
    socket.emit('send_chat', {
      room_code: roomCode,
      session_id: sessionId,
      message,
    });
  };

  const handleSendReaction = (emoji: Reaction['emoji']) => {
    const socket = getSocket();
    socket.emit('send_reaction', {
      room_code: roomCode,
      session_id: sessionId,
      emoji,
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = window.location.href;
    const text = `🏏 Join my IPL Auction room on IPLAuction! Room Code: *${roomCode}*\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Taken franchise codes/colors
  const takenCodes = new Set(
    participants.filter(p => p.franchise && p.id !== sessionId).map(p => p.franchise!.short_code.toUpperCase())
  );

  const activeFranchiseCount = participants.filter(p => p.franchise !== null).length;
  const minRequiredPool = activeFranchiseCount * settings.squad_size;
  const poolCount = settings.selected_player_ids.length;
  const canStart = activeFranchiseCount >= 2 && poolCount >= minRequiredPool;

  // Role Color helper
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'BAT':
        return '#F5B83D';
      case 'BOWL':
        return '#4C8DFF';
      case 'AR':
        return '#2FCB8F';
      case 'WK':
        return '#A56BFF';
      default:
        return '#FF7A1A';
    }
  };

  if (!isJoined || !auctionState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-flare border-t-transparent animate-spin mb-4" />
        <h2 className="font-display text-2xl font-bold text-floodlight">CONNECTING TO ROOM {roomCode}...</h2>
        <p className="text-xs text-floodlight-muted mt-1">Restoring live auction state</p>
      </div>
    );
  }

  // RECONNECTING BANNER
  const showReconnectBanner = !isConnected;

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col justify-between">
      {/* Reconnecting banner */}
      {showReconnectBanner && (
        <div className="bg-hammer px-4 py-1.5 text-center text-xs font-bold text-white flex items-center justify-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span>Connection interrupted. Reconnecting to auction server...</span>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-hammer text-white px-4 py-2 rounded-pill text-xs font-bold shadow-hammer">
          {errorMessage}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. LOBBY VIEW                                               */}
      {/* ============================================================ */}
      {auctionState.phase === 'lobby' && (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 w-full">
          {/* Room Code & WhatsApp Share Header */}
          <div className="scoreboard-panel rounded-card border border-night-border p-5 text-center relative">
            <span className="text-[11px] font-bold uppercase tracking-wider text-floodlight-muted">
              ROOM CODE
            </span>
            <div className="font-display text-5xl sm:text-6xl font-black text-flare tracking-widest my-1 select-all">
              {roomCode}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2.5">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight text-xs font-bold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-pill bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-bold shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Franchise Picker */}
          <div className="bg-night rounded-card border border-night-border p-4 sm:p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-flare" />
              Claim Franchise Identity (Required)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
              {FRANCHISE_PRESETS.slice(0, 10).map(f => {
                const isTaken = takenCodes.has(f.short_code.toUpperCase());
                const isSelected = currentUser?.franchise?.short_code === f.short_code;

                return (
                  <button
                    key={f.id}
                    disabled={isTaken}
                    onClick={() => handlePickFranchise(f)}
                    className={`p-2.5 rounded-card border text-left flex flex-col justify-between min-h-[72px] transition-all ${
                      isSelected
                        ? 'border-flare ring-2 ring-flare bg-flare/10 shadow-flare'
                        : isTaken
                        ? 'opacity-30 border-night-border/40 bg-night-raised cursor-not-allowed'
                        : 'border-night-border bg-night-raised hover:border-flare'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: f.color }}
                      />
                      <span className="font-display font-black text-sm text-floodlight">
                        {f.short_code}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-floodlight-muted truncate mt-2">
                      {f.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Host Settings & Player Pool */}
          {isHost && (
            <div className="bg-night rounded-card border border-night-border p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted flex items-center gap-2">
                  <Settings className="w-4 h-4 text-flare" />
                  Host Settings
                </h2>
                <span className="text-[11px] text-turf font-bold">You are Host</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Purse */}
                <div>
                  <label className="block text-floodlight-muted font-bold mb-1">Purse</label>
                  <select
                    value={settings.purse}
                    onChange={e => handleUpdateSettings({ purse: Number(e.target.value) })}
                    className="w-full bg-night-raised border border-night-border rounded-lg p-2 text-floodlight font-semibold"
                  >
                    <option value={1000000000}>₹100 Crore (Default)</option>
                    <option value={1250000000}>₹125 Crore</option>
                    <option value={1500000000}>₹150 Crore</option>
                  </select>
                </div>

                {/* Squad Size */}
                <div>
                  <label className="block text-floodlight-muted font-bold mb-1">Squad Size</label>
                  <select
                    value={settings.squad_size}
                    onChange={e => handleUpdateSettings({ squad_size: Number(e.target.value) })}
                    className="w-full bg-night-raised border border-night-border rounded-lg p-2 text-floodlight font-semibold"
                  >
                    <option value={15}>15 Players (Default)</option>
                    <option value={20}>20 Players</option>
                    <option value={25}>25 Players</option>
                  </select>
                </div>

                {/* Timer */}
                <div>
                  <label className="block text-floodlight-muted font-bold mb-1">Timer per Player</label>
                  <select
                    value={settings.timer_seconds}
                    onChange={e => handleUpdateSettings({ timer_seconds: Number(e.target.value) })}
                    className="w-full bg-night-raised border border-night-border rounded-lg p-2 text-floodlight font-semibold"
                  >
                    <option value={10}>10 Seconds (Fast)</option>
                    <option value={15}>15 Seconds (Default)</option>
                    <option value={20}>20 Seconds (Relaxed)</option>
                  </select>
                </div>
              </div>

              {/* Order & Accelerated Round */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="block text-floodlight-muted font-bold mb-1">Order of Players</label>
                  <select
                    value={settings.order_type}
                    onChange={e => handleUpdateSettings({ order_type: e.target.value as any })}
                    className="w-full bg-night-raised border border-night-border rounded-lg p-2 text-floodlight font-semibold"
                  >
                    <option value="random">Random (Surprise)</option>
                    <option value="role">By Role (BAT, WK, AR, BOWL)</option>
                    <option value="base_price">By Base Price (High to Low)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="accRound"
                    checked={settings.accelerated_round}
                    onChange={e => handleUpdateSettings({ accelerated_round: e.target.checked })}
                    className="w-4 h-4 rounded text-flare focus:ring-flare"
                  />
                  <label htmlFor="accRound" className="text-floodlight font-semibold cursor-pointer">
                    Accelerated round for unsold players
                  </label>
                </div>
              </div>

              {/* Choose Players Row */}
              <div className="pt-2 flex items-center justify-between border-t border-night-border">
                <div>
                  <div className="font-bold text-sm text-floodlight">Auction Player Pool</div>
                  <div className="text-xs text-floodlight-muted">
                    {poolCount} players selected (Min required: {minRequiredPool})
                  </div>
                </div>

                <button
                  onClick={() => setIsPoolModalOpen(true)}
                  className="px-4 py-1.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight text-xs font-bold"
                >
                  Configure Pool
                </button>
              </div>
            </div>
          )}

          {/* Participants in Lobby */}
          <div className="bg-night rounded-card border border-night-border p-4 sm:p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-flare" />
              Lobby Participants ({participants.length}/20)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {participants.map(p => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-card bg-night-raised border border-night-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-turf flex-shrink-0 animate-pulse" />
                    {p.franchise ? (
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.franchise.color }}
                      />
                    ) : (
                      <span className="text-[10px] text-floodlight-subtle italic">[No team]</span>
                    )}
                    <span className="font-bold text-floodlight truncate">{p.display_name}</span>
                    {p.id === sessionId && (
                      <span className="text-[10px] bg-turf/20 text-turf px-1.5 py-0.2 rounded font-bold">
                        YOU
                      </span>
                    )}
                    {p.is_host && (
                      <span className="text-[10px] bg-flare/20 text-flare px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                        <Crown className="w-3 h-3" /> HOST
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-bold text-floodlight-muted">
                    {p.franchise ? p.franchise.short_code : 'Selecting...'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* START AUCTION BUTTON */}
          <div className="text-center pt-2">
            {isHost ? (
              <div>
                {!canStart && (
                  <p className="text-xs text-hammer font-bold mb-2">
                    {activeFranchiseCount < 2
                      ? 'At least 2 participants must choose a franchise to start.'
                      : `Pool requires at least ${minRequiredPool} players (${poolCount} selected).`}
                  </p>
                )}
                <button
                  disabled={!canStart}
                  onClick={handleStartAuction}
                  className="px-10 py-4 rounded-pill bg-flare hover:bg-flare-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-display text-2xl font-black shadow-flare tracking-wide transition-transform active:scale-[0.98]"
                >
                  START AUCTION NOW
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-card bg-night-raised border border-night-border inline-block text-xs text-floodlight-muted">
                Waiting for the host to finalize settings and start the auction...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. LIVE AUCTION SCOREBOARD VIEW                             */}
      {/* ============================================================ */}
      {auctionState.phase !== 'lobby' && auctionState.phase !== 'completed' && (
        <div className="flex-1 flex flex-col justify-between max-w-6xl mx-auto w-full px-3 sm:px-6 pt-2 pb-2">
          {/* Top Bar */}
          <div className="bg-night rounded-card border border-night-border p-2.5 sm:p-3 flex items-center justify-between text-xs mb-3 shadow-sm">
            {/* Round & Progress */}
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-pill bg-flare/15 text-flare font-bold">
                {auctionState.round_number === 2 ? 'ACCELERATED' : 'ROUND 1'}
              </span>
              <span className="font-semibold text-floodlight-muted">
                Player {auctionState.current_player_index + 1} of {auctionState.total_pool_count}
              </span>
            </div>

            {/* User Purse & Slots */}
            {currentUser && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-display font-black text-sm sm:text-base text-flare tabular-nums">
                    {formatCurrency(currentUser.purse_remaining)}
                  </div>
                  <div className="text-[10px] text-floodlight-muted">
                    {currentUser.squad.length}/{settings.squad_size} Squad Slots
                  </div>
                </div>

                {isHost && (
                  <button
                    onClick={() => setIsHostControlsOpen(true)}
                    className="p-1.5 rounded-lg bg-night-raised border border-night-border text-flare hover:bg-night"
                    title="Host Controls"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Main Stage: 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            {/* Left Column: Player Card, Circular Timer & Scoreboard Bid */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {/* Active Player Card */}
              {auctionState.current_player ? (
                <div className="scoreboard-panel rounded-card border border-night-border p-4 sm:p-5 relative overflow-hidden flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  {/* Spotlight Cone Glow */}
                  <div className="absolute -top-12 -left-12 w-48 h-48 bg-flare/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Circular Timer Ring with initials avatar */}
                  <div className="flex-shrink-0">
                    <CircularTimerRing
                      initials={auctionState.current_player.initials}
                      role={auctionState.current_player.role}
                      roleColor={getRoleColor(auctionState.current_player.role)}
                      timerSeconds={settings.timer_seconds}
                      timerEndsAt={auctionState.timer_ends_at}
                      serverTime={auctionState.server_time}
                      isPaused={auctionState.is_paused}
                    />
                  </div>

                  {/* Player Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <span
                        className="px-2.5 py-0.5 rounded-pill text-[10px] font-black uppercase text-white shadow-sm"
                        style={{ backgroundColor: getRoleColor(auctionState.current_player.role) }}
                      >
                        {auctionState.current_player.role}
                      </span>
                      <span className="px-2 py-0.5 rounded-pill bg-night-border text-[10px] font-bold text-floodlight-muted">
                        Tier {auctionState.current_player.tier}
                      </span>
                      {auctionState.current_player.capped ? (
                        <span className="text-[10px] text-floodlight-subtle">Capped</span>
                      ) : (
                        <span className="text-[10px] text-turf font-bold">Uncapped</span>
                      )}
                    </div>

                    <h2 className="font-display text-2xl sm:text-3xl font-black text-floodlight truncate tracking-tight">
                      {auctionState.current_player.name}
                    </h2>

                    <div className="text-xs text-floodlight-muted space-y-0.5 mt-1">
                      <div>
                        {auctionState.current_player.country} · {auctionState.current_player.home_state}
                      </div>
                      <div className="text-[11px] text-floodlight-subtle">
                        {auctionState.current_player.batting_style} · {auctionState.current_player.bowling_style}
                      </div>
                    </div>

                    <div className="mt-2 text-xs font-semibold text-floodlight">
                      Base Price:{' '}
                      <span className="font-display text-base font-black text-flare tabular-nums">
                        {formatCurrency(auctionState.current_player.base_price)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="scoreboard-panel rounded-card p-12 text-center text-floodlight-muted">
                  Preparing the next auction player...
                </div>
              )}

              {/* Scoreboard Bid Panel with Flip Digits */}
              <SplitFlapNumber
                amount={auctionState.current_bid}
                isLeading={auctionState.current_bidder_id === sessionId}
                leaderTeamName={
                  participants.find(p => p.id === auctionState.current_bidder_id)?.franchise?.name
                }
                leaderShortCode={
                  participants.find(p => p.id === auctionState.current_bidder_id)?.franchise?.short_code
                }
                leaderColor={
                  participants.find(p => p.id === auctionState.current_bidder_id)?.franchise?.color
                }
              />

              {/* Bid Ladder (Last 5 Bids) */}
              <BidLadder bids={auctionState.bids} />
            </div>

            {/* Right Column: Teams Drawer / Sidebar */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <TeamsDrawer
                participants={participants}
                settings={settings}
                currentUserId={sessionId}
                currentBidderId={auctionState.current_bidder_id}
              />
            </div>
          </div>

          {/* Sticky Bottom Dock (+25L, +50L, +1Cr, Withdraw) */}
          <StickyBidDock
            participant={currentUser}
            auctionState={auctionState}
            settings={settings}
            onBid={handleBid}
            onWithdraw={handleWithdraw}
          />

          {/* Gavel Overlay when Sold / Unsold */}
          {(auctionState.phase === 'sold' || auctionState.phase === 'unsold') && (
            <GavelOverlay
              phase={auctionState.phase}
              player={auctionState.current_player}
              winner={participants.find(p => p.id === auctionState.current_bidder_id)}
              price={auctionState.current_bid}
              currentUserId={sessionId}
            />
          )}

          {/* Floating Emoji Reactions */}
          <div className="fixed bottom-24 right-4 z-40">
            <ReactionRail reactions={reactions} onSendReaction={handleSendReaction} />
          </div>

          {/* Live Chat */}
          <LiveChat
            messages={chatMessages}
            onSendMessage={handleSendChat}
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(prev => !prev)}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. RESULTS VIEW                                             */}
      {/* ============================================================ */}
      {auctionState.phase === 'completed' && results && (
        <ResultsView
          results={results}
          currentUserId={sessionId}
          onPlayAgain={
            isHost
              ? () => {
                  const socket = getSocket();
                  socket.emit('settings_update', {
                    room_code: roomCode,
                    session_id: sessionId,
                    settings: { ...settings },
                  });
                  window.location.reload();
                }
              : undefined
          }
        />
      )}

      {/* Modals */}
      {isPoolModalOpen && (
        <PoolPickerModal
          selectedIds={settings.selected_player_ids}
          onSave={newIds => handleUpdateSettings({ selected_player_ids: newIds })}
          onClose={() => setIsPoolModalOpen(false)}
        />
      )}

      {isHostControlsOpen && (
        <HostControlsModal
          isPaused={auctionState.is_paused}
          participants={participants}
          currentUserId={sessionId}
          onPause={() => {
            const socket = getSocket();
            socket.emit('host_pause', { room_code: roomCode, session_id: sessionId });
          }}
          onResume={() => {
            const socket = getSocket();
            socket.emit('host_resume', { room_code: roomCode, session_id: sessionId });
          }}
          onSkip={() => {
            const socket = getSocket();
            socket.emit('host_skip', { room_code: roomCode, session_id: sessionId });
          }}
          onEndAuction={() => {
            const socket = getSocket();
            socket.emit('host_end_auction', { room_code: roomCode, session_id: sessionId });
          }}
          onKick={targetId => {
            const socket = getSocket();
            socket.emit('host_kick', {
              room_code: roomCode,
              session_id: sessionId,
              target_participant_id: targetId,
            });
          }}
          onTransferHost={newHostId => {
            const socket = getSocket();
            socket.emit('host_transfer', {
              room_code: roomCode,
              session_id: sessionId,
              new_host_participant_id: newHostId,
            });
          }}
          onClose={() => setIsHostControlsOpen(false)}
        />
      )}
    </div>
  );
}

