'use client';

import React, { useState, useMemo } from 'react';
import { ManagerScoreBreakdown } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import {
  Briefcase,
  TrendingUp,
  Percent,
  ArrowLeftRight,
  ShieldAlert,
  Award,
  ChevronRight,
  Star,
  CheckCircle2,
  DollarSign,
  BarChart,
} from 'lucide-react';

interface ManagerLeaderboardViewProps {
  managers: ManagerScoreBreakdown[];
  currentUserId: string;
  isHost: boolean;
  onProceedToNextStage?: () => void;
  nextStageTitle?: string;
}

export const ManagerLeaderboardView: React.FC<ManagerLeaderboardViewProps> = ({
  managers,
  currentUserId,
  isHost,
  onProceedToNextStage,
  nextStageTitle = 'Proceed to Playing XI Selection',
}) => {
  const sortedManagers = useMemo(() => {
    return [...managers].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }, [managers]);

  const [selectedManagerId, setSelectedManagerId] = useState<string>(
    sortedManagers.find(m => m.participant_id === currentUserId)?.participant_id ||
      sortedManagers[0]?.participant_id ||
      ''
  );

  const selectedManager = useMemo(
    () => sortedManagers.find(m => m.participant_id === selectedManagerId) || sortedManagers[0] || null,
    [sortedManagers, selectedManagerId]
  );

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-amber-400 font-black text-sm flex items-center gap-1">🥇 #1</span>;
    if (rank === 2) return <span className="text-slate-300 font-black text-sm flex items-center gap-1">🥈 #2</span>;
    if (rank === 3) return <span className="text-amber-600 font-black text-sm flex items-center gap-1">🥉 #3</span>;
    return <span className="text-floodlight-muted font-bold text-xs">#{rank}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="scoreboard-panel rounded-card border border-night-border p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-pill bg-flare/20 text-flare text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Stage 5 · Manager Performance Leaderboard
            </span>
            <span className="text-xs text-floodlight-muted font-semibold">
              Independent Executive Rating
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-floodlight mt-1">
            AUCTION STRATEGY & EXECUTIVE RATINGS
          </h1>
          <p className="text-xs text-floodlight-muted mt-0.5">
            Evaluating managers strictly on purse discipline, bargain hunting surplus, trading finesse, and squad output conversion.
          </p>
        </div>

        {isHost && onProceedToNextStage && (
          <button
            onClick={onProceedToNextStage}
            className="px-5 py-2.5 rounded-pill bg-flare hover:bg-flare-hover text-white font-bold text-xs shadow-flare flex items-center gap-2 self-stretch sm:self-auto justify-center"
          >
            <span>{nextStageTitle}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid: Manager Leaderboard Table (Left) + Executive Deep Dive (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Manager Standings Table */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-night rounded-card border border-night-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-floodlight flex items-center gap-2">
                <BarChart className="w-4 h-4 text-flare" />
                Manager Rankings
              </h2>
              <span className="text-[10px] text-floodlight-muted">Select manager to inspect</span>
            </div>

            <div className="space-y-2">
              {sortedManagers.map((mgr, idx) => {
                const isSelected = mgr.participant_id === selectedManagerId;
                const isCurrentUser = mgr.participant_id === currentUserId;
                return (
                  <div
                    key={mgr.participant_id || idx}
                    onClick={() => setSelectedManagerId(mgr.participant_id)}
                    className={`p-3 rounded-card border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-flare/15 border-flare shadow-flare'
                        : 'bg-night-raised hover:bg-night-border/70 border-night-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 text-center">{getRankBadge(mgr.rank || idx + 1)}</div>
                      {mgr.franchise && (
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: mgr.franchise.color }}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-floodlight">{mgr.display_name}</span>
                          {isCurrentUser && (
                            <span className="text-[9px] bg-turf/20 text-turf px-1 rounded font-bold">YOU</span>
                          )}
                        </div>
                        <div className="text-[11px] text-floodlight-muted">
                          {mgr.franchise?.name} ({mgr.franchise?.short_code})
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-display text-xl font-black text-flare tabular-nums">
                        {mgr.total_manager_score}
                        <span className="text-xs text-floodlight-muted font-normal">/100</span>
                      </div>
                      <div className="text-[10px] text-floodlight-subtle">Strategy Score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Manager Executive Analytical Dossier */}
        <div className="lg:col-span-7 space-y-4">
          {selectedManager ? (
            <div className="bg-night rounded-card border border-night-border p-5 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-night-border">
                <div className="flex items-center gap-3">
                  {selectedManager.franchise && (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-xs shadow-md"
                      style={{ backgroundColor: selectedManager.franchise.color }}
                    >
                      {selectedManager.franchise.short_code}
                    </div>
                  )}
                  <div>
                    <h2 className="font-display text-xl font-black text-floodlight">
                      {selectedManager.display_name}
                    </h2>
                    <div className="text-xs text-floodlight-muted">
                      Franchise: <span className="text-floodlight font-semibold">{selectedManager.franchise?.name}</span> · Executive Rank #{selectedManager.rank}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Executive Rating</div>
                  <div className="font-display text-3xl font-black text-flare tabular-nums">
                    {selectedManager.total_manager_score}
                    <span className="text-sm text-floodlight-muted font-normal">/100</span>
                  </div>
                </div>
              </div>

              {/* 4 Pillars of Manager Strategy */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-floodlight-muted">
                  Strategy Rating Pillars
                </h3>

                {/* 1. Value For Money (30%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-turf" />
                      Value For Money / Bargain Index (30%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedManager.value_for_money_score} / 30
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-turf h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (selectedManager.value_for_money_score / 30) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Quantifies surplus points generated per crore spent against historical player benchmarks.
                  </div>
                </div>

                {/* 2. Purse Utilization Efficiency (25%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      Purse Discipline & Reserve Management (25%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedManager.purse_efficiency_score} / 25
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (selectedManager.purse_efficiency_score / 25) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Avoided cash starvation; maintained required minimum purse reserve for roster completion.
                  </div>
                </div>

                {/* 3. Final Squad Strength Output (25%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-flare" />
                      Squad Quality Conversion (25%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedManager.squad_strength_score} / 25
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-flare h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (selectedManager.squad_strength_score / 25) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Conversion efficiency from budget into raw competitive roster power.
                  </div>
                </div>

                {/* 4. Trade Quality Index (20%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                      Trading Negotiation Impact (20%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedManager.trade_quality_score} / 20
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (selectedManager.trade_quality_score / 20) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Net rating points gained through post-auction trading swaps.
                  </div>
                </div>
              </div>

              {/* Bargain Picks Section */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-flare" />
                  Top Bargain Acquisitions
                </h3>
                {selectedManager.bargain_picks && selectedManager.bargain_picks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedManager.bargain_picks.map((pick, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded bg-night-raised border border-night-border flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-floodlight truncate">{pick.player_name}</div>
                          <div className="text-[10px] text-floodlight-muted">
                            Paid: {formatCurrency(pick.paid)} · Market: {formatCurrency(pick.benchmark)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-turf/20 text-turf">
                            +{formatCurrency(pick.surplus)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded bg-night-raised text-xs text-floodlight-muted text-center">
                    Purchases aligned closely with standard baseline valuations.
                  </div>
                )}
              </div>

              {/* Financial & Trade Impact Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded bg-night-raised border border-night-border">
                  <div className="text-[10px] text-floodlight-muted font-bold uppercase">Total Spent</div>
                  <div className="font-bold text-floodlight mt-1">
                    {formatCurrency(selectedManager.efficiency_details?.purse_spent || 0)}
                  </div>
                </div>

                <div className="p-3 rounded bg-night-raised border border-night-border">
                  <div className="text-[10px] text-floodlight-muted font-bold uppercase">Purse Preserved</div>
                  <div className="font-bold text-flare mt-1">
                    {formatCurrency(selectedManager.efficiency_details?.purse_remaining || 0)}
                  </div>
                </div>

                <div className="p-3 rounded bg-night-raised border border-night-border col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-floodlight-muted font-bold uppercase">Trade Swaps</div>
                  <div className="font-bold text-floodlight mt-1">
                    {selectedManager.trade_impact?.trades_count || 0} executed ({selectedManager.trade_impact?.net_points_diff >= 0 ? '+' : ''}{selectedManager.trade_impact?.net_points_diff || 0} pts)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-night rounded-card border border-night-border p-12 text-center text-floodlight-muted">
              Select a manager to inspect their analytical rating.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

