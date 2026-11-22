'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Participant, Player, TradeOffer, TradeTransaction, BoughtPlayer } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import {
  ArrowLeftRight,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  History,
  Lock,
  Search,
  Info,
} from 'lucide-react';

interface TradingWindowViewProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  roomCode: string;
  pendingOffers: TradeOffer[];
  tradeHistory: TradeTransaction[];
  stageEndsAt?: number;
  onProposeTrade: (targetParticipantId: string, offeredPlayerId: string, requestedPlayerId: string) => void;
  onRespondTrade: (tradeId: string, action: 'accept' | 'reject' | 'counter', counterPlayerId?: string) => void;
  onCancelTrade: (tradeId: string) => void;
  onCloseTradingWindow: () => void;
  onOpenDossier?: (player: Player) => void;
}

export const TradingWindowView: React.FC<TradingWindowViewProps> = ({
  participants,
  currentUserId,
  isHost,
  pendingOffers,
  tradeHistory,
  stageEndsAt,
  onProposeTrade,
  onRespondTrade,
  onCancelTrade,
  onCloseTradingWindow,
  onOpenDossier,
}) => {
  const currentUser = useMemo(
    () => participants.find(p => p.id === currentUserId) || null,
    [participants, currentUserId]
  );

  const opponentParticipants = useMemo(
    () => participants.filter(p => p.id !== currentUserId && p.franchise !== null && p.squad.length > 0),
    [participants, currentUserId]
  );

  // Selected opponent to browse
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(
    opponentParticipants[0]?.id || ''
  );

  const [remainingSec, setRemainingSec] = useState<number>(0);
  useEffect(() => {
    if (!stageEndsAt) return;
    const update = () => {
      setRemainingSec(Math.max(0, Math.ceil((stageEndsAt - Date.now()) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [stageEndsAt]);

  // Active opponent participant
  const selectedOpponent = useMemo(
    () => opponentParticipants.find(p => p.id === selectedOpponentId) || opponentParticipants[0] || null,
    [opponentParticipants, selectedOpponentId]
  );

  // Trading Modal / Proposal State
  const [offeredPlayerId, setOfferedPlayerId] = useState<string>('');
  const [requestedPlayerId, setRequestedPlayerId] = useState<string>('');
  const [counterTargetTradeId, setCounterTargetTradeId] = useState<string | null>(null);
  const [counterPlayerId, setCounterPlayerId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');

  // Incoming and Outgoing Offers for the current user
  const incomingOffers = useMemo(
    () => pendingOffers.filter(o => o.receiver_id === currentUserId && o.status === 'pending'),
    [pendingOffers, currentUserId]
  );

  const outgoingOffers = useMemo(
    () => pendingOffers.filter(o => o.sender_id === currentUserId && o.status === 'pending'),
    [pendingOffers, currentUserId]
  );

  // Selected offered and requested player objects
  const offeredPlayer = useMemo(
    () => currentUser?.squad.find(s => s.player_id === offeredPlayerId)?.player || null,
    [currentUser, offeredPlayerId]
  );

  const requestedPlayer = useMemo(
    () => selectedOpponent?.squad.find(s => s.player_id === requestedPlayerId)?.player || null,
    [selectedOpponent, requestedPlayerId]
  );

  const handleSendProposal = () => {
    if (!selectedOpponent || !offeredPlayerId || !requestedPlayerId) return;
    onProposeTrade(selectedOpponent.id, offeredPlayerId, requestedPlayerId);
    setOfferedPlayerId('');
    setRequestedPlayerId('');
  };

  const handleSendCounter = (tradeId: string) => {
    if (!counterPlayerId) return;
    onRespondTrade(tradeId, 'counter', counterPlayerId);
    setCounterTargetTradeId(null);
    setCounterPlayerId('');
  };

  // Helper for role pill color
  const getRoleBadgeColor = (role: string) => {
    const r = (role || '').toUpperCase();
    if (r.startsWith('BAT')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (r.startsWith('BOWL')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    if (r.startsWith('ALL') || r === 'AR') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (r.startsWith('WK') || r.startsWith('WICKET')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="scoreboard-panel rounded-card border border-night-border p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-pill bg-flare/20 text-flare text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Stage 3 · Post-Auction Trading Window
            </span>
            <span className="text-xs text-floodlight-muted">Player-for-Player Exchanges Only (No Cash)</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-floodlight mt-1">
            FRANCHISE TRADE EXCHANGE
          </h1>
          <p className="text-xs text-floodlight-muted mt-0.5">
            Formulate squad upgrades by negotiating 1-for-1 player swaps. Both managers must consent for atomic execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {stageEndsAt && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-card bg-night-raised border border-night-border text-xs">
              <Clock className="w-4 h-4 text-flare animate-pulse" />
              <div>
                <div className="text-[10px] text-floodlight-muted uppercase font-bold">Trading Deadline</div>
                <div className="font-mono font-bold text-floodlight" suppressHydrationWarning>
                  {remainingSec}s remaining
                </div>
              </div>
            </div>
          )}

          {isHost && (
            <button
              onClick={onCloseTradingWindow}
              className="px-4 py-2.5 rounded-pill bg-turf hover:bg-turf/90 text-white font-bold text-xs shadow-turf flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Conclude Trading & Evaluate Squads
            </button>
          )}
        </div>
      </div>

      {/* Pending Offers Notification Hub */}
      {(incomingOffers.length > 0 || outgoingOffers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Incoming Offers */}
          <div className="bg-night rounded-card border border-night-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-floodlight flex items-center gap-2">
                <Shield className="w-4 h-4 text-flare" />
                Incoming Trade Proposals ({incomingOffers.length})
              </h2>
              <span className="text-[10px] text-floodlight-muted">Requires your approval</span>
            </div>

            {incomingOffers.length === 0 ? (
              <div className="text-xs text-floodlight-muted py-3 text-center">No pending incoming trade requests</div>
            ) : (
              incomingOffers.map(offer => (
                <div
                  key={offer.id}
                  className="p-3.5 rounded-card bg-night-raised border border-flare/30 space-y-3 relative"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-floodlight">
                      From:{' '}
                      <span className="text-flare">{offer.sender_franchise.name}</span>
                    </span>
                    <span className="text-[10px] text-floodlight-muted" suppressHydrationWarning>
                      {new Date(offer.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Trade Exchange Preview */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* They give */}
                    <div className="p-2 rounded bg-night border border-night-border">
                      <div className="text-[10px] text-turf font-bold uppercase">You Receive</div>
                      <div className="font-bold text-floodlight truncate">{offer.offered_player.name}</div>
                      <div className="text-[10px] text-floodlight-muted">
                        {offer.offered_player.role} · {formatCurrency(offer.offered_player.base_price)}
                      </div>
                    </div>
                    {/* You give */}
                    <div className="p-2 rounded bg-night border border-night-border">
                      <div className="text-[10px] text-hammer font-bold uppercase">You Give Up</div>
                      <div className="font-bold text-floodlight truncate">{offer.requested_player.name}</div>
                      <div className="text-[10px] text-floodlight-muted">
                        {offer.requested_player.role} · {formatCurrency(offer.requested_player.base_price)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onRespondTrade(offer.id, 'accept')}
                      className="flex-1 py-1.5 px-3 rounded-pill bg-turf hover:bg-turf/90 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept Trade
                    </button>
                    <button
                      onClick={() => onRespondTrade(offer.id, 'reject')}
                      className="py-1.5 px-3 rounded-pill bg-hammer/20 hover:bg-hammer/30 text-hammer border border-hammer font-bold text-xs flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => setCounterTargetTradeId(offer.id)}
                      className="py-1.5 px-3 rounded-pill bg-night-border hover:bg-night-border/80 text-floodlight font-bold text-xs flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Counter
                    </button>
                  </div>

                  {/* Counter Drawer */}
                  {counterTargetTradeId === offer.id && currentUser && (
                    <div className="p-2.5 rounded bg-night border border-night-border space-y-2 mt-2">
                      <div className="text-[11px] font-bold text-floodlight">Select a counter offer player from your squad:</div>
                      <select
                        value={counterPlayerId}
                        onChange={e => setCounterPlayerId(e.target.value)}
                        className="w-full bg-night-raised border border-night-border rounded p-1.5 text-xs text-floodlight"
                      >
                        <option value="">-- Choose player to offer instead --</option>
                        {currentUser.squad.map(s => (
                          <option key={s.player_id} value={s.player_id}>
                            {s.player.name} ({s.player.role} · {formatCurrency(s.player.base_price)})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setCounterTargetTradeId(null)}
                          className="text-[10px] text-floodlight-muted hover:text-white px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={!counterPlayerId}
                          onClick={() => handleSendCounter(offer.id)}
                          className="px-3 py-1 bg-flare text-white text-xs font-bold rounded disabled:opacity-50"
                        >
                          Send Counteroffer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Outgoing Offers */}
          <div className="bg-night rounded-card border border-night-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-floodlight flex items-center gap-2">
                <Clock className="w-4 h-4 text-floodlight-muted" />
                Outgoing Offers Sent ({outgoingOffers.length})
              </h2>
              <span className="text-[10px] text-floodlight-muted">Awaiting recipient decision</span>
            </div>

            {outgoingOffers.length === 0 ? (
              <div className="text-xs text-floodlight-muted py-3 text-center">No active outgoing trade offers</div>
            ) : (
              outgoingOffers.map(offer => (
                <div
                  key={offer.id}
                  className="p-3.5 rounded-card bg-night-raised border border-night-border space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-floodlight">
                      Sent to: <span className="text-flare">{offer.receiver_franchise.name}</span>
                    </span>
                    <button
                      onClick={() => onCancelTrade(offer.id)}
                      className="text-[10px] text-hammer hover:underline font-bold"
                    >
                      Withdraw Offer
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-night border border-night-border">
                      <div className="text-[10px] text-floodlight-muted font-bold uppercase">You Offered</div>
                      <div className="font-bold text-floodlight truncate">{offer.offered_player.name}</div>
                    </div>
                    <div className="p-2 rounded bg-night border border-night-border">
                      <div className="text-[10px] text-floodlight-muted font-bold uppercase">You Requested</div>
                      <div className="font-bold text-floodlight truncate">{offer.requested_player.name}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Trade Floor: 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Opponent Squad Browser */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-night rounded-card border border-night-border p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-sm text-floodlight flex items-center gap-2">
                  <Search className="w-4 h-4 text-flare" />
                  Opponent Squad Roster
                </h2>
                <div className="text-xs text-floodlight-muted">Select an opponent franchise to inspect potential targets</div>
              </div>

              {/* Franchise Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {opponentParticipants.map(op => {
                  const isSelected = op.id === selectedOpponentId;
                  return (
                    <button
                      key={op.id}
                      onClick={() => {
                        setSelectedOpponentId(op.id);
                        setRequestedPlayerId('');
                      }}
                      className={`px-3 py-1.5 rounded-pill text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                        isSelected
                          ? 'bg-flare text-white border-flare shadow-sm'
                          : 'bg-night-raised text-floodlight-muted hover:text-white border-night-border'
                      }`}
                    >
                      {op.franchise && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: op.franchise.color }}
                        />
                      )}
                      <span>{op.franchise?.short_code || op.display_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Squad Table / Cards */}
            {selectedOpponent ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-floodlight-muted px-2">
                  <span>
                    {selectedOpponent.franchise?.name} Squad ({selectedOpponent.squad.length} Players)
                  </span>
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Filter player..."
                    className="bg-night-raised border border-night-border rounded px-2.5 py-1 text-xs text-floodlight focus:outline-none focus:border-flare"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                  {selectedOpponent.squad
                    .filter(s =>
                      s.player.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      s.player.role.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((s: BoughtPlayer) => {
                      const isTarget = requestedPlayerId === s.player_id;
                      return (
                        <div
                          key={s.player_id}
                          onClick={() => setRequestedPlayerId(s.player_id)}
                          className={`p-3 rounded-card border transition-all cursor-pointer relative ${
                            isTarget
                              ? 'bg-flare/15 border-flare shadow-flare'
                              : 'bg-night-raised hover:bg-night-border/70 border-night-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getRoleBadgeColor(
                                s.player.role
                              )}`}
                            >
                              {s.player.role}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-floodlight">
                              <span className="text-flare">{s.player.stats_2026?.player_points || 0}</span>
                              <span className="text-floodlight-subtle text-[10px]">pts</span>
                            </div>
                          </div>

                          <div className="font-bold text-sm text-floodlight mt-1 truncate">
                            {s.player.name}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-floodlight-muted mt-1.5">
                            <span>{s.player.country} · {s.player.category || 'Standard'}</span>
                            <span className="font-mono text-floodlight-subtle">
                              Bought: {formatCurrency(s.bought_for ?? s.purchase_price ?? 0)}
                            </span>
                          </div>

                          {onOpenDossier && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onOpenDossier(s.player);
                              }}
                              className="mt-2 text-[10px] text-flare hover:underline font-bold flex items-center gap-0.5"
                            >
                              <Info className="w-3 h-3" /> View 2026 Dossier
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-floodlight-muted">
                No opponent franchise available for trading.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Trade Proposal Terminal */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-night rounded-card border border-night-border p-4 sm:p-5 space-y-4">
            <h2 className="font-bold text-sm text-floodlight flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-flare" />
              Propose 1-for-1 Player Trade
            </h2>

            {/* Step 1: Pick player from your squad */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-floodlight-muted block mb-1">
                1. Select Player To Give Up (Your Squad)
              </label>
              <select
                value={offeredPlayerId}
                onChange={e => setOfferedPlayerId(e.target.value)}
                className="w-full bg-night-raised border border-night-border rounded-lg p-2.5 text-xs text-floodlight font-semibold focus:outline-none focus:border-flare"
              >
                <option value="">-- Choose your player to offer --</option>
                {currentUser?.squad.map(s => (
                  <option key={s.player_id} value={s.player_id}>
                    {s.player.name} ({s.player.role} · {s.player.stats_2026?.player_points || 0} pts ·{' '}
                    {formatCurrency(s.bought_for ?? s.purchase_price ?? 0)})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Selected requested player summary */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-floodlight-muted block mb-1">
                2. Target Player Requested (From {selectedOpponent?.franchise?.short_code || 'Opponent'})
              </label>
              {requestedPlayer ? (
                <div className="p-3 rounded-lg bg-night-raised border border-night-border flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-floodlight">{requestedPlayer.name}</div>
                    <div className="text-[11px] text-floodlight-muted">
                      {requestedPlayer.role} · {requestedPlayer.country}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-flare">
                      {requestedPlayer.stats_2026?.player_points || 0} pts
                    </div>
                    <div className="text-[10px] text-floodlight-subtle">Target Acquired</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-night-raised border border-dashed border-night-border text-center text-xs text-floodlight-muted">
                  Click on any player in the left squad browser to select as target
                </div>
              )}
            </div>

            {/* Trade Analytics Comparison */}
            {offeredPlayer && requestedPlayer && (
              <div className="p-3 rounded-lg bg-night-raised border border-night-border space-y-2 text-xs">
                <div className="text-[10px] uppercase font-bold text-floodlight-muted">Trade Impact Analysis</div>
                <div className="flex items-center justify-between">
                  <span className="text-floodlight-muted">Points Exchange:</span>
                  <span className="font-bold text-floodlight">
                    {offeredPlayer.stats_2026?.player_points || 0} pts ➔ {requestedPlayer.stats_2026?.player_points || 0} pts
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-floodlight-muted">Net Rating Impact:</span>
                  {(() => {
                    const diff =
                      (requestedPlayer.stats_2026?.player_points || 0) -
                      (offeredPlayer.stats_2026?.player_points || 0);
                    return (
                      <span className={`font-bold ${diff >= 0 ? 'text-turf' : 'text-hammer'}`}>
                        {diff >= 0 ? `+${diff}` : diff} pts
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-floodlight-muted">Role Transition:</span>
                  <span className="font-semibold text-floodlight">
                    {offeredPlayer.role} ➔ {requestedPlayer.role}
                  </span>
                </div>
              </div>
            )}

            {/* Propose Action */}
            <button
              disabled={!offeredPlayerId || !requestedPlayerId}
              onClick={handleSendProposal}
              className="w-full py-3 rounded-pill bg-flare hover:bg-flare-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-flare transition-all"
            >
              Send Official Trade Proposal
            </button>
          </div>

          {/* Completed Trades Feed */}
          <div className="bg-night rounded-card border border-night-border p-4 space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-floodlight flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-floodlight-muted" />
              Completed Trade Ledger ({tradeHistory.length})
            </h2>

            {tradeHistory.length === 0 ? (
              <div className="text-xs text-floodlight-muted py-2 text-center">No trades completed yet in this session</div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {tradeHistory.map(tx => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded bg-night-raised border border-turf/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-floodlight-muted">
                      <span className="font-bold text-turf">CONFIRMED SWAP</span>
                      <span suppressHydrationWarning>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-floodlight">
                      <span className="font-bold text-flare">{tx.team_a_short}</span> gets{' '}
                      <span className="font-semibold text-white">{tx.player_b.name}</span>
                      {' ⇄ '}
                      <span className="font-bold text-flare">{tx.team_b_short}</span> gets{' '}
                      <span className="font-semibold text-white">{tx.player_a.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
