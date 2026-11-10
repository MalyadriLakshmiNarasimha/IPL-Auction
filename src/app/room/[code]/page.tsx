'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import {
  AuctionResults,
  AuctionState,
  ChatMessage,
  FranchiseIdentity,
  Participant,
  Reaction,
  RoomSettings,
  WorkflowStage,
  TradeOffer,
  TradeTransaction,
  PlayingXISubmission,
  CommentaryEvent,
  Player,
} from '@/shared/types';
import { DEFAULT_ROOM_SETTINGS, FRANCHISE_PRESETS, OFFICIAL_IPL_FRANCHISES, formatCurrency, getMinAuctionParticipants, MIN_AUCTION_PARTICIPANTS } from '@/shared/constants';
import { validateAuctionStart } from '@/shared/validation';
import { soundFX } from '@/lib/sound-effects';
import { SplitFlapNumber } from '@/components/SplitFlapNumber';
import { StickyBidDock } from '@/components/StickyBidDock';
import { BidLadder } from '@/components/BidLadder';
import { TeamsDrawer } from '@/components/TeamsDrawer';
import { ReactionRail } from '@/components/ReactionRail';
import { LiveChat } from '@/components/LiveChat';
import { GavelOverlay } from '@/components/GavelOverlay';
import { PoolPickerModal } from '@/components/PoolPickerModal';
import { HostControlsModal } from '@/components/HostControlsModal';
import { ResultsView } from '@/components/ResultsView';
import { FranchiseLogo } from '@/components/FranchiseLogo';
import { AudioSettingsModal } from '@/components/AudioSettingsModal';

// Stage & Analytics Components
import { PlayerSpotlight } from '@/components/PlayerSpotlight';
import { PlayerDossierModal } from '@/components/PlayerDossierModal';
import { AuctionCommentaryTicker } from '@/components/AuctionCommentaryTicker';
import { UnsoldAuctionBoard } from '@/components/UnsoldAuctionBoard';
import { TradingWindowView } from '@/components/TradingWindowView';
import { SquadEvaluationView } from '@/components/SquadEvaluationView';
import { ManagerLeaderboardView } from '@/components/ManagerLeaderboardView';
import { PlayingXIBuilder } from '@/components/PlayingXIBuilder';
import { PlayingXILeaderboardView } from '@/components/PlayingXILeaderboardView';

import {
  Copy,
  Share2,
  Users,
  Settings,
  Crown,
  Play,
  Check,
  AlertTriangle,
  Volume2,
  VolumeX,
  Eye,
  Briefcase,
  Layers,
  ArrowRight,
  Shield,
  LogOut,
  Palette,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { validateTeamName, deriveTeamShortCode, TEAM_COLOR_PALETTE } from '@/shared/team-validation';
import { voiceCommentary } from '@/lib/voice-commentary';

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

  // Workflow Stage State
  const [completedTrades, setCompletedTrades] = useState<TradeTransaction[]>([]);
  const [pendingTradeOffers, setPendingTradeOffers] = useState<TradeOffer[]>([]);
  const [playingXISubmissions, setPlayingXISubmissions] = useState<PlayingXISubmission[]>([]);
  const [commentaryEvents, setCommentaryEvents] = useState<CommentaryEvent[]>([]);

  // Modals & Drawers
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inspectPlayer, setInspectPlayer] = useState<Player | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);

  // Custom Team State
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamColorInput, setTeamColorInput] = useState(TEAM_COLOR_PALETTE[0]);
  const [hasEditedName, setHasEditedName] = useState(false);
  const [isSavedBanner, setIsSavedBanner] = useState(false);
  const lastAnnouncedPlayerId = React.useRef<string | null>(null);

  // Local user participant
  const currentUser = useMemo(() => {
    return participants.find(p => p.id === sessionId) || null;
  }, [participants, sessionId]);

  const isHost = currentUser?.is_host || false;
  const isSpectator = currentUser?.is_spectator || false;

  // Active workflow stage
  const currentStage: WorkflowStage = useMemo(() => {
    if (auctionState?.phase === 'completed') return 'championship_recap';
    return (auctionState?.stage as WorkflowStage) || 'main_auction';
  }, [auctionState]);

  useEffect(() => {
    setSoundEnabled(soundFX.isEnabled());
  }, []);

  useEffect(() => {
    let active = true;

    // Verify user authentication via centralized authenticated api client
    apiFetch('/api/auth/me')
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok || !data?.authenticated || !data?.user) {
          router.replace(`/login?redirect=/room/${roomCode}`);
          return;
        }

        const user = data.user;
        setSessionId(user.id);
        setDisplayName(user.name);

        if (data.socket_token) {
          try { localStorage.setItem('ipl_session_token', data.socket_token); } catch {}
        }

        const socket = getSocket(data.socket_token);

        socket.on('connect', () => {
          setIsConnected(true);
          socket.emit('room_join', {
            room_code: roomCode,
            display_name: user.name,
            session_id: user.id,
          });
        });

        socket.on('connect_error', (err) => {
          console.warn('[ROOM] Socket connection warning:', err.message);
          // Do NOT redirect an already-authenticated user to /login on socket blip
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        socket.on('state_sync', data => {
          setSettings(data.settings);
          setParticipants(data.participants);
          setAuctionState(data.auction_state);
          if (data.results) setResults(data.results);
          if (data.trades) setCompletedTrades(data.trades);
          if (data.pending_trade_offers) setPendingTradeOffers(data.pending_trade_offers);
          if (data.playing_xi_submissions) setPlayingXISubmissions(data.playing_xi_submissions);
          if (data.commentary) setCommentaryEvents(data.commentary);
          setIsJoined(true);
        });

        socket.on('bid_success', data => {
          setAuctionState(data.auction_state);
          soundFX.playBid();
          const el = document.getElementById('accessibility-announcer');
          if (el) {
            el.innerText = `New bid: ${data.bid.franchise_short_code} bid ${formatCurrency(data.bid.amount)}`;
          }
        });

        socket.on('player_sold', data => {
          setAuctionState(data.auction_state);
          soundFX.playGavel();
          soundFX.playSold();
          const el = document.getElementById('accessibility-announcer');
          if (el) {
            el.innerText = `${data.player.name} sold to ${data.winner.franchise?.name} for ${formatCurrency(data.price)}`;
          }
        });

        socket.on('player_unsold', data => {
          setAuctionState(data.auction_state);
          soundFX.playGavel();
          soundFX.playUnsold();
        });

        socket.on('next_player', data => {
          setAuctionState(data.auction_state);
        });

        socket.on('bidding_started', data => {
          setAuctionState(data.auction_state);
        });

        socket.on('pass_updated', data => {
          setAuctionState(prev =>
            prev
              ? {
                  ...prev,
                  pass_count: data.pass_count,
                  total_eligible_passers: data.total_eligible,
                  passed_participant_ids: data.passed_participant_ids,
                }
              : prev
          );
        });

        socket.on('withdraw_success', data => {
          setParticipants(prev =>
            prev.map(p => (p.id === data.participant_id ? { ...p, has_withdrawn_current: true } : p))
          );
        });

        socket.on('team_name_updated', data => {
          setParticipants(prev =>
            prev.map(p =>
              p.id === data.session_id
                ? {
                    ...p,
                    team_name: data.team_name,
                    team_short_code: data.team_short_code,
                    team_color: data.team_color,
                    franchise: {
                      id: `custom-${data.team_short_code.toLowerCase()}`,
                      name: data.team_name,
                      short_code: data.team_short_code,
                      color: data.team_color,
                    },
                  }
                : p
            )
          );
        });

        socket.on('auction_ended', finalResults => {
          setResults(finalResults);
          soundFX.playSold();
        });

        socket.on('stage_transitioned', data => {
          setAuctionState(data.auction_state);
        });

        socket.on('commentary_broadcast', comment => {
          setCommentaryEvents(prev => [...prev.slice(-30), comment]);
        });

        socket.on('trade_offer_received', offer => {
          setPendingTradeOffers(prev => [...prev.filter(o => o.id !== offer.id), offer]);
        });

        socket.on('trade_offer_updated', offer => {
          setPendingTradeOffers(prev => {
            if (offer.status === 'accepted' || offer.status === 'rejected' || offer.status === 'cancelled') {
              return prev.filter(o => o.id !== offer.id);
            }
            return prev.map(o => (o.id === offer.id ? offer : o));
          });
        });

        socket.on('trade_executed', data => {
          setCompletedTrades(prev => [data.trade, ...prev]);
          soundFX.playSold();
        });

        socket.on('playing_xi_updated', submission => {
          setPlayingXISubmissions(prev => [
            ...prev.filter(s => s.participant_id !== submission.participant_id),
            submission,
          ]);
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

        if (socket.connected) {
          socket.emit('room_join', {
            room_code: roomCode,
            display_name: user.name,
            session_id: user.id,
          });
        }
      })
      .catch((err) => {
        console.warn('[ROOM] Auth verification request error:', err);
      });

    return () => {
      active = false;
      const socket = getSocket();
      socket.off('state_sync');
      socket.off('bid_success');
      socket.off('player_sold');
      socket.off('player_unsold');
      socket.off('next_player');
      socket.off('bidding_started');
      socket.off('team_name_updated');
      socket.off('auction_ended');
      socket.off('stage_transitioned');
      socket.off('commentary_broadcast');
      socket.off('trade_offer_received');
      socket.off('trade_offer_updated');
      socket.off('trade_executed');
      socket.off('playing_xi_updated');
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

  const handleToggleSpectator = (spectatorMode: boolean) => {
    const socket = getSocket();
    socket.emit('toggle_spectator', {
      room_code: roomCode,
      session_id: sessionId,
      is_spectator: spectatorMode,
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

  const handleTransitionStage = (stage: WorkflowStage, durationSeconds?: number) => {
    const socket = getSocket();
    socket.emit('stage_change', {
      room_code: roomCode,
      session_id: sessionId,
      stage,
      duration_seconds: durationSeconds,
    });
  };

  const handleBid = (incrementOrAmount: number, isExplicitAmount: boolean = false) => {
    if (isSpectator) return;
    const socket = getSocket();
    socket.emit('place_bid', {
      room_code: roomCode,
      session_id: sessionId,
      increment: isExplicitAmount ? 0 : incrementOrAmount,
      amount: isExplicitAmount ? incrementOrAmount : undefined,
      is_explicit_amount: isExplicitAmount,
    });
  };

  const handleWithdraw = () => {
    if (isSpectator) return;
    const socket = getSocket();
    socket.emit('pass_player', {
      room_code: roomCode,
      session_id: sessionId,
    });
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

  const toggleSound = () => {
    const next = soundFX.toggle();
    setSoundEnabled(next);
    voiceCommentary.setMuted(!next);
  };

  // Sync team inputs with currentUser when loaded or updated
  useEffect(() => {
    if (currentUser && !hasEditedName) {
      if (currentUser.team_name) {
        setTeamNameInput(currentUser.team_name);
      }
      if (currentUser.team_color) {
        setTeamColorInput(currentUser.team_color);
      }
    }
  }, [currentUser, hasEditedName]);

  // Authoritative Voice Announcement sequencing
  useEffect(() => {
    if (auctionState?.phase === 'announcing' && auctionState.current_player) {
      const currentPlayerId = auctionState.current_player.id;
      if (lastAnnouncedPlayerId.current !== currentPlayerId) {
        lastAnnouncedPlayerId.current = currentPlayerId;
        const text =
          auctionState.announcement_text ||
          `Now on spotlight: ${auctionState.current_player.name}, ${auctionState.current_player.role}. Base price: ${formatCurrency(auctionState.current_player.base_price)}.`;

        voiceCommentary.speakAnnouncement(text, () => {
          const socket = getSocket();
          socket.emit('announcement_completed', {
            room_code: roomCode,
            session_id: sessionId,
            player_id: currentPlayerId,
          });
        });
      }
    }
  }, [auctionState?.phase, auctionState?.current_player, auctionState?.announcement_text, roomCode, sessionId]);

  const otherTeamNames = useMemo(() => {
    return participants
      .filter(p => p.id !== sessionId && p.team_name)
      .map(p => p.team_name as string);
  }, [participants, sessionId]);

  const teamValidation = useMemo(() => {
    return validateTeamName(teamNameInput, otherTeamNames, currentUser?.team_name);
  }, [teamNameInput, otherTeamNames, currentUser?.team_name]);

  const handleSaveTeamName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!teamValidation.valid) return;
    const socket = getSocket();
    socket.emit('set_team_name', {
      room_code: roomCode,
      session_id: sessionId,
      team_name: teamNameInput.trim(),
      team_color: teamColorInput,
    });
    setHasEditedName(false);
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 2500);
  };

  const minAuctionParticipants = useMemo(() => getMinAuctionParticipants(), []);
  const activeTeamsCount = participants.filter(
    p => !p.is_spectator && (p.team_name || p.franchise)
  ).length;
  const minRequiredPool = activeTeamsCount * settings.squad_size;
  const poolCount =
    settings.selected_player_ids && settings.selected_player_ids.length > 0
      ? settings.selected_player_ids.length
      : 274;

  const startValidation = useMemo(() => {
    return validateAuctionStart(currentUser, participants, settings, 274);
  }, [currentUser, participants, settings]);

  const canStart = startValidation.valid;
  const startValidationMessage = startValidation.reason || null;

  if (!isJoined || !auctionState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-flare border-t-transparent animate-spin mb-4" />
        <h2 className="font-display text-2xl font-bold text-floodlight">CONNECTING TO ROOM {roomCode}...</h2>
        <p className="text-xs text-floodlight-muted mt-1">Synchronizing live auction ecosystem</p>
      </div>
    );
  }

  // Active playing XI submission for this participant
  const myPlayingXISubmission = playingXISubmissions.find(s => s.participant_id === sessionId) || null;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#08090B] text-floodlight selection:bg-flare selection:text-black">
      <div id="accessibility-announcer" className="sr-only" aria-live="polite" />

      {/* Space-Efficient Dedicated Top Bar (Replaces duplicate marketing header) */}
      <header className="sticky top-0 z-40 bg-[#08090B]/95 backdrop-blur-md border-b border-night-border px-3 py-2 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Exit/Leave & Room Code */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to leave this room?')) {
                  router.push('/');
                }
              }}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-night-raised hover:bg-night-border border border-night-border text-floodlight-muted hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-3.5 h-3.5 text-hammer" />
              <span className="hidden sm:inline">Leave</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-night-raised border border-night-border">
              <span className="text-[10px] uppercase font-bold text-floodlight-muted tracking-wider">Room:</span>
              <span className="font-display font-black text-xs sm:text-sm text-flare tracking-wider">{roomCode}</span>
              <button
                onClick={handleCopyCode}
                className="text-floodlight-muted hover:text-flare transition-colors ml-0.5"
                title="Copy Room Code"
              >
                {copiedCode ? <Check className="w-3 h-3 text-turf" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {auctionState?.phase !== 'lobby' && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-flare/10 border border-flare/30 text-flare text-[11px] font-bold">
                <span>{auctionState?.round_number === 2 ? 'Accelerated' : 'Round 1'} · Player {(auctionState?.current_player_index ?? 0) + 1} of {auctionState?.total_pool_count ?? 274}</span>
                {auctionState?.current_category && (
                  <span className="px-1.5 py-0.5 rounded bg-flare/20 text-white font-extrabold uppercase tracking-wider text-[9px]">
                    {auctionState.current_category}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Center: Team Identity & Purse (Managers) or Spectator indicator */}
          <div className="flex items-center gap-2 min-w-0">
            {currentUser && !isSpectator && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-night border border-night-border">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentUser.team_color || '#DCC477' }}
                />
                <span className="font-bold text-xs text-floodlight truncate max-w-[100px] sm:max-w-[160px]">
                  {currentUser.team_name || 'Setting Team...'}
                </span>
                <span className="text-flare font-mono font-black text-xs hidden sm:inline">
                  {formatCurrency(currentUser.purse_remaining)}
                </span>
              </div>
            )}
            {isSpectator && (
              <span className="px-2 py-0.5 rounded-full bg-night-raised border border-night-border text-floodlight-muted text-[10px] font-bold flex items-center gap-1">
                <Eye className="w-3 h-3 text-flare" /> Spectating
              </span>
            )}
          </div>

          {/* Right: Sound & Commentary, Host Settings, User Nav */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center rounded-lg bg-night-raised border border-night-border p-0.5">
              <button
                onClick={toggleSound}
                className="p-1 rounded text-floodlight-muted hover:text-white transition-colors"
                title={soundEnabled ? 'Quick Mute Commentary & Audio' : 'Unmute Commentary & Audio'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-turf" /> : <VolumeX className="w-4 h-4 text-hammer" />}
              </button>
              <button
                onClick={() => setIsAudioSettingsOpen(true)}
                className="p-1 rounded text-floodlight-muted hover:text-flare transition-colors border-l border-night-border/80"
                title="Indian Female Voice & Commentary Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {isHost && (
              <button
                onClick={() => setIsHostControlsOpen(true)}
                className="p-1.5 rounded-lg bg-night-raised hover:bg-night-border border border-flare/40 text-flare transition-colors"
                title="Host Controls"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-1.5 pl-1.5 border-l border-night-border/70 text-xs">
              <span className="font-bold text-floodlight-muted hidden sm:inline truncate max-w-[90px]">
                {displayName}
              </span>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#DCC477] to-[#9D7A2C] flex items-center justify-center text-[10px] font-black text-black">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Reconnecting banner */}
      {!isConnected && (
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

          {/* Spectator Mode Switcher */}
          <div className="p-4 rounded-card bg-night border border-night-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-night-raised border border-night-border">
                <Eye className="w-5 h-5 text-flare" />
              </div>
              <div>
                <div className="font-bold text-sm text-floodlight">Spectator Mode</div>
                <div className="text-xs text-floodlight-muted">
                  Watch the live broadcast without bidding or managing a team purse
                </div>
              </div>
            </div>

            <button
              onClick={() => handleToggleSpectator(!isSpectator)}
              className={`px-4 py-1.5 rounded-pill text-xs font-bold border transition-all ${isSpectator
                ? 'bg-flare text-white border-flare shadow-flare'
                : 'bg-night-raised text-floodlight-muted hover:text-white border-night-border'
                }`}
            >
              {isSpectator ? 'Spectating (Active)' : 'Join as Spectator'}
            </button>
          </div>

          {/* Custom Team Identity Setup (Managers only) */}
          {!isSpectator && (
            <div className="bg-night-card rounded-2xl border border-night-border p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-night-border/70 pb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-floodlight flex items-center gap-2">
                    <Shield className="w-4 h-4 text-flare" />
                    Create Your Team Identity
                  </h2>
                  <p className="text-xs text-floodlight-muted mt-0.5">
                    Choose a custom team name and team color for the auction arena.
                  </p>
                </div>

                {currentUser?.team_name ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-night-surface border border-flare/50 shadow-sm">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: currentUser.team_color || '#DCC477' }}
                    />
                    <span className="text-xs font-bold text-flare">
                      {currentUser.team_name} ({currentUser.team_short_code || deriveTeamShortCode(currentUser.team_name)})
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-hammer/15 border border-hammer/40 text-hammer text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Team identity required to bid</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveTeamName} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-floodlight-muted mb-1">
                      Team Name (2–30 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={teamNameInput}
                      onChange={e => {
                        setTeamNameInput(e.target.value);
                        setHasEditedName(true);
                      }}
                      placeholder="e.g. Mumbai Mavericks, Bengaluru Blasters..."
                      className="w-full bg-night-surface border border-night-border rounded-xl px-3.5 py-2.5 text-floodlight font-semibold text-sm focus:outline-none focus:border-flare placeholder:text-floodlight-subtle/50"
                    />
                    <span className="absolute right-3 top-8 text-[10px] text-floodlight-subtle font-mono">
                      {teamNameInput.trim().length}/30
                    </span>
                  </div>

                  <div className="sm:w-44 flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={!teamValidation.valid}
                      className="w-full py-2.5 px-4 rounded-xl bg-flare hover:bg-flare-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-flare flex items-center justify-center gap-1.5 transition-all"
                    >
                      {isSavedBanner ? (
                        <>
                          <Check className="w-4 h-4 text-turf" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{currentUser?.team_name ? 'Update Team' : 'Save Team'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {!teamValidation.valid && teamNameInput.length > 0 && (
                  <p className="text-xs text-hammer font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{teamValidation.reason}</span>
                  </p>
                )}

                {/* Team Color Palette */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-floodlight-muted mb-2">
                    Team Accent Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {TEAM_COLOR_PALETTE.map(color => {
                      const isSelected = teamColorInput === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setTeamColorInput(color);
                            setHasEditedName(true);
                          }}
                          className={`w-7 h-7 rounded-full transition-transform border-2 relative flex items-center justify-center ${
                            isSelected
                              ? 'scale-125 border-white ring-2 ring-flare shadow-md'
                              : 'border-transparent hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Card */}
                {teamNameInput.trim().length >= 2 && (
                  <div className="p-3 rounded-xl bg-night-surface border border-night-border/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-xs text-white shadow-md"
                        style={{ backgroundColor: teamColorInput }}
                      >
                        {deriveTeamShortCode(teamNameInput)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-floodlight">{teamNameInput.trim()}</div>
                        <div className="text-[11px] text-floodlight-muted">
                          Short Code: <strong className="text-flare">{deriveTeamShortCode(teamNameInput)}</strong>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-turf bg-turf/10 px-2 py-0.5 rounded-full border border-turf/20">
                      Preview
                    </span>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Lobby Settings (Host only) */}
          {isHost && (
            <div className="bg-night rounded-card border border-night-border p-4 sm:p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted flex items-center gap-2">
                <Settings className="w-4 h-4 text-flare" />
                Room Configuration (Host Controls)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-floodlight-muted font-semibold mb-1">
                    Purse Per Team (INR)
                  </label>
                  <select
                    value={settings.purse}
                    onChange={e => handleUpdateSettings({ purse: Number(e.target.value) })}
                    className="w-full bg-night-raised border border-night-border rounded-lg p-2 text-floodlight font-semibold"
                  >
                    <option value={80_00_00_000}>₹80.00 Cr</option>
                    <option value={90_00_00_000}>₹90.00 Cr</option>
                    <option value={100_00_00_000}>₹100.00 Cr</option>
                    <option value={120_00_00_000}>₹120.00 Cr</option>
                  </select>
                </div>

                <div>
                  <label className="block text-floodlight-muted font-semibold mb-1">
                    Squad Size Target
                  </label>
                  <select
                    value={settings.squad_size}
                    onChange={e => handleUpdateSettings({ squad_size: Number(e.target.value) })}
                    className="w-full bg-night-raised border border-night-border rounded-lg p-2 text-floodlight font-semibold"
                  >
                    <option value={15}>15 Players</option>
                    <option value={18}>18 Players</option>
                    <option value={20}>20 Players</option>
                    <option value={25}>25 Players</option>
                  </select>
                </div>

                <div>
                  <label className="block text-floodlight-muted font-semibold mb-1">
                    Timer Seconds
                  </label>
                  <select
                    value={settings.timer_seconds}
                    onChange={e => handleUpdateSettings({ timer_seconds: Number(e.target.value) })}
                    className="w-full bg-night-raised border border-night-border rounded-lg p-2 text-floodlight font-semibold"
                  >
                    <option value={10}>10s (Blitz)</option>
                    <option value={15}>15s (Standard)</option>
                    <option value={20}>20s (Extended)</option>
                    <option value={30}>30s (Broadcasting)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-floodlight-muted font-semibold mb-1">
                    Player Order
                  </label>
                  <select
                    value={settings.order_type}
                    onChange={e => handleUpdateSettings({ order_type: e.target.value as any })}
                    className="w-full bg-night-raised border border-night-border rounded-lg p-2 text-floodlight font-semibold"
                  >
                    <option value="role">By Role (Batters, Bowlers, All-Rounders, Wicket Keepers)</option>
                    <option value="random">Random (Surprise)</option>
                    <option value="base_price">By Base Price (High to Low)</option>
                  </select>
                </div>
              </div>

              {/* Pool Configuration */}
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
              Lobby Participants ({participants.length}/30)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {participants.map(p => {
                const teamName = p.team_name || p.franchise?.name;
                const shortCode = p.team_short_code || p.franchise?.short_code;
                const teamColor = p.team_color || p.franchise?.color || '#DCC477';

                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-card bg-night-raised border border-night-border flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-turf flex-shrink-0 animate-pulse" />
                      {teamName ? (
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: teamColor }}
                        />
                      ) : (
                        <span className="text-[10px] text-floodlight-subtle italic">
                          {p.is_spectator ? '[Spectator]' : '[Choosing team...]'}
                        </span>
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

                    <div className="text-[11px] font-bold text-floodlight-muted truncate ml-2">
                      {teamName ? (
                        <span className="text-flare font-semibold">
                          {teamName} ({shortCode})
                        </span>
                      ) : p.is_spectator ? (
                        'Spectating'
                      ) : (
                        <span className="text-hammer font-semibold">No Team Yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Start Auction Button */}
          <div className="text-center pt-2">
            {isHost ? (
              <div>
                {!canStart && startValidationMessage && (
                  <p className="text-xs text-hammer font-bold mb-2">
                    {startValidationMessage}
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
      {/* 2. UNSOLD AUCTION STAGE                                      */}
      {/* ============================================================ */}
      {currentStage === 'unsold_auction' && auctionState.phase !== 'lobby' && (
        <UnsoldAuctionBoard
          unsoldPlayers={auctionState.current_player ? [auctionState.current_player] : []}
          isHost={isHost}
          onReEnter={(playerIds, orderType) => {
            const socket = getSocket();
            socket.emit('unsold_pool_configure', {
              room_code: roomCode,
              session_id: sessionId,
              player_ids: playerIds,
              order_type: orderType,
            });
            handleTransitionStage('unsold_auction');
          }}
          onProceedToTrading={() => handleTransitionStage('trading_window', 180)}
          onOpenDossier={player => setInspectPlayer(player)}
        />
      )}

      {/* ============================================================ */}
      {/* 3. TRADING WINDOW STAGE                                      */}
      {/* ============================================================ */}
      {currentStage === 'trading_window' && auctionState.phase !== 'lobby' && (
        <TradingWindowView
          participants={participants}
          currentUserId={sessionId}
          isHost={isHost}
          roomCode={roomCode}
          pendingOffers={pendingTradeOffers}
          tradeHistory={completedTrades}
          stageEndsAt={auctionState.stage_ends_at}
          onProposeTrade={(targetParticipantId, offeredPlayerId, requestedPlayerId) => {
            const socket = getSocket();
            socket.emit('trade_propose', {
              room_code: roomCode,
              session_id: sessionId,
              target_participant_id: targetParticipantId,
              offered_player_id: offeredPlayerId,
              requested_player_id: requestedPlayerId,
            });
          }}
          onRespondTrade={(tradeId, action, counterPlayerId) => {
            const socket = getSocket();
            socket.emit('trade_respond', {
              room_code: roomCode,
              session_id: sessionId,
              trade_id: tradeId,
              action,
              counter_player_id: counterPlayerId,
            });
          }}
          onCancelTrade={tradeId => {
            const socket = getSocket();
            socket.emit('trade_cancel', {
              room_code: roomCode,
              session_id: sessionId,
              trade_id: tradeId,
            });
          }}
          onCloseTradingWindow={() => handleTransitionStage('squad_evaluation')}
          onOpenDossier={player => setInspectPlayer(player)}
        />
      )}

      {/* ============================================================ */}
      {/* 4. POST-AUCTION SQUAD EVALUATION STAGE                       */}
      {/* ============================================================ */}
      {currentStage === 'squad_evaluation' && auctionState.phase !== 'lobby' && (
        <SquadEvaluationView
          leaderboard={results?.leaderboard || []}
          currentUserId={sessionId}
          isHost={isHost}
          onProceedToNextStage={() => handleTransitionStage('playing_xi_selection')}
          nextStageTitle="Proceed to Playing XI Selection"
        />
      )}

      {/* ============================================================ */}
      {/* 5. PLAYING XI SELECTION STAGE                                */}
      {/* ============================================================ */}
      {currentStage === 'playing_xi_selection' && auctionState.phase !== 'lobby' && currentUser && (
        <PlayingXIBuilder
          participant={currentUser}
          initialSubmission={myPlayingXISubmission}
          onSaveDraft={draft => {
            const socket = getSocket();
            socket.emit('playing_xi_save_draft', {
              room_code: roomCode,
              session_id: sessionId,
              submission: draft,
            });
          }}
          onSubmitXI={sub => {
            const socket = getSocket();
            socket.emit('playing_xi_submit', {
              room_code: roomCode,
              session_id: sessionId,
              submission: sub,
            });
          }}
          isHost={isHost}
          onProceedToRankings={() => handleTransitionStage('playing_xi_evaluation')}
          allSubmissions={playingXISubmissions}
          totalFranchises={activeTeamsCount}
          onOpenDossier={player => setInspectPlayer(player)}
        />
      )}

      {/* ============================================================ */}
      {/* 6. STATISTICAL PLAYING XI RANKINGS STAGE                     */}
      {/* ============================================================ */}
      {currentStage === 'playing_xi_evaluation' && auctionState.phase !== 'lobby' && (
        <PlayingXILeaderboardView
          lineups={results?.playing_xi_leaderboard || []}
          submissions={playingXISubmissions}
          currentUserId={sessionId}
          isHost={isHost}
          onProceedToRecap={() => {
            const socket = getSocket();
            socket.emit('host_end_auction', { room_code: roomCode, session_id: sessionId });
          }}
        />
      )}

      {/* ============================================================ */}
      {/* 7. LIVE AUCTION SCOREBOARD VIEW                             */}
      {/* ============================================================ */}
      {(currentStage === 'main_auction' || currentStage === 'lobby') &&
        auctionState.phase !== 'lobby' &&
        auctionState.phase !== 'completed' && (
          <div className="flex-1 flex flex-col justify-between max-w-7xl mx-auto w-full px-3 sm:px-6 pt-2 pb-2 space-y-3">
            {/* Spectator Alert */}
            {isSpectator && (
              <div className="bg-night-raised border border-flare/40 px-4 py-2 rounded-card text-xs text-floodlight flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-flare" />
                  <span className="font-bold">
                    Spectator Mode Active: You are watching the synchronized live broadcast.
                  </span>
                </div>
                <button
                  onClick={() => handleToggleSpectator(false)}
                  className="text-flare hover:underline font-bold text-xs"
                >
                  Join as Manager
                </button>
              </div>
            )}

            {/* Announcing Phase Spotlight Banner */}
            {auctionState.phase === 'announcing' && (
              <div className="bg-gradient-to-r from-flare/20 via-flare/30 to-flare/20 border border-flare rounded-xl px-4 py-2.5 text-center text-flare font-bold text-xs flex items-center justify-center gap-2 animate-pulse shadow-flare">
                <Sparkles className="w-4 h-4 text-flare animate-spin" />
                <span>SPOTLIGHT ANNOUNCEMENT IN PROGRESS — BIDDING WILL START AUTOMATICALLY</span>
              </div>
            )}

            {/* Commentary Ticker */}
            <AuctionCommentaryTicker commentary={commentaryEvents} />

            {/* Main Stage Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
              {/* Left Column: Spotlight, SplitFlap & BidLadder */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <PlayerSpotlight
                  player={auctionState.current_player}
                  timerEndsAt={auctionState.timer_ends_at}
                  timerSeconds={settings.timer_seconds}
                  serverTime={auctionState.server_time}
                  isPaused={auctionState.is_paused}
                  passCount={auctionState.pass_count}
                  totalEligiblePassers={auctionState.total_eligible_passers}
                  onOpenDossier={player => setInspectPlayer(player)}
                />

                <SplitFlapNumber
                  amount={auctionState.current_bid}
                  isLeading={auctionState.current_bidder_id === sessionId}
                  leaderTeamName={
                    participants.find(p => p.id === auctionState.current_bidder_id)?.team_name ||
                    participants.find(p => p.id === auctionState.current_bidder_id)?.franchise?.name
                  }
                  leaderShortCode={
                    participants.find(p => p.id === auctionState.current_bidder_id)?.team_short_code ||
                    participants.find(p => p.id === auctionState.current_bidder_id)?.franchise?.short_code
                  }
                  leaderColor={
                    participants.find(p => p.id === auctionState.current_bidder_id)?.team_color ||
                    participants.find(p => p.id === auctionState.current_bidder_id)?.franchise?.color ||
                    '#DCC477'
                  }
                />

                <BidLadder bids={auctionState.bids} />
              </div>

              {/* Right Column: Live Franchises & Squad Slots Drawer */}
              <div className="lg:col-span-5 flex flex-col gap-3 min-w-0">
                <TeamsDrawer
                  participants={participants}
                  settings={settings}
                  currentUserId={sessionId}
                  currentBidderId={auctionState.current_bidder_id}
                />
              </div>
            </div>

            {/* Sticky Bottom Dock (Managers only) */}
            {!isSpectator && (
              <StickyBidDock
                participant={currentUser}
                auctionState={auctionState}
                settings={settings}
                onBid={handleBid}
                onWithdraw={handleWithdraw}
              />
            )}

            {/* Gavel Overlay */}
            {(auctionState.phase === 'sold' || auctionState.phase === 'unsold') && (
              <GavelOverlay
                phase={auctionState.phase}
                player={auctionState.current_player}
                winner={participants.find(p => p.id === auctionState.current_bidder_id)}
                price={auctionState.current_bid}
                currentUserId={sessionId}
              />
            )}

            {/* Floating Emoji Reactions Vertical Rail */}
            <div className="fixed right-2 sm:right-4 bottom-24 sm:bottom-28 z-40">
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
      {/* 8. RESULTS VIEW                                             */}
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

      {inspectPlayer && (
        <PlayerDossierModal
          player={inspectPlayer}
          onClose={() => setInspectPlayer(null)}
        />
      )}

      {isHostControlsOpen && (
        <HostControlsModal
          isPaused={auctionState.is_paused}
          currentStage={currentStage}
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
          onTransitionStage={stage => handleTransitionStage(stage)}
          onClose={() => setIsHostControlsOpen(false)}
        />
      )}

      {isAudioSettingsOpen && (
        <AudioSettingsModal
          isOpen={isAudioSettingsOpen}
          onClose={() => setIsAudioSettingsOpen(false)}
        />
      )}
    </div>
  );
}
