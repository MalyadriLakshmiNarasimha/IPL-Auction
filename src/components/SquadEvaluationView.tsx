'use client';

import React, { useState, useMemo } from 'react';
import { TeamScoreBreakdown, Participant, BoughtPlayer } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import {
  Trophy,
  Shield,
  Zap,
  Target,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  ChevronRight,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

interface SquadEvaluationViewProps {
  leaderboard: TeamScoreBreakdown[];
  currentUserId: string;
  isHost: boolean;
  onProceedToNextStage?: () => void;
  nextStageTitle?: string;
}

export const SquadEvaluationView: React.FC<SquadEvaluationViewProps> = ({
  leaderboard,
  currentUserId,
  isHost,
  onProceedToNextStage,
  nextStageTitle = 'Proceed to Playing XI Selection',
}) => {
  // Sort teams by rank or total_score descending
  const sortedTeams = useMemo(() => {
    return [...leaderboard].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }, [leaderboard]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    sortedTeams.find(t => t.participant_id === currentUserId)?.participant_id || sortedTeams[0]?.participant_id || ''
  );

  const selectedTeam = useMemo(
    () => sortedTeams.find(t => t.participant_id === selectedTeamId) || sortedTeams[0] || null,
    [sortedTeams, selectedTeamId]
  );

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-amber-400 font-black text-sm flex items-center gap-1">🥇 1st</span>;
    if (rank === 2) return <span className="text-slate-300 font-black text-sm flex items-center gap-1">🥈 2nd</span>;
    if (rank === 3) return <span className="text-amber-600 font-black text-sm flex items-center gap-1">🥉 3rd</span>;
    return <span className="text-floodlight-muted font-bold text-xs">{rank}th</span>;
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 space-y-6 animate-fade-in">
      {/* Banner */}
      <div className="scoreboard-panel rounded-card border border-night-border p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-pill bg-flare/20 text-flare text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Stage 4 · Post-Auction Squad Evaluation
            </span>
            <span className="text-xs text-floodlight-muted font-mono">
              Model: {sortedTeams[0]?.scoring_version || '2026.1-5pillar'}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-floodlight mt-1">
            COMPLETE SQUAD QUALITY RANKINGS
          </h1>
          <p className="text-xs text-floodlight-muted mt-0.5">
            Deterministic 5-pillar analytics engine evaluating individual performance points, batting firepower, bowling defense, all-round utility, and squad balance.
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

      {/* Main Grid: Rankings Table (Left) + Detailed Scorecard (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Overall Squad Leaderboard Table */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-night rounded-card border border-night-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-floodlight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-flare" />
                Franchise Squad Standings
              </h2>
              <span className="text-[10px] text-floodlight-muted">Click team to inspect</span>
            </div>

            <div className="space-y-2">
              {sortedTeams.map((team, idx) => {
                const isSelected = team.participant_id === selectedTeamId;
                const isCurrentUser = team.participant_id === currentUserId;
                return (
                  <div
                    key={team.participant_id || idx}
                    onClick={() => setSelectedTeamId(team.participant_id)}
                    className={`p-3 rounded-card border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-flare/15 border-flare shadow-flare'
                        : 'bg-night-raised hover:bg-night-border/70 border-night-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 text-center">{getRankBadge(team.rank || idx + 1)}</div>
                      {team.franchise && (
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: team.franchise.color }}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-floodlight">{team.franchise?.name}</span>
                          {isCurrentUser && (
                            <span className="text-[9px] bg-turf/20 text-turf px-1 rounded font-bold">YOU</span>
                          )}
                        </div>
                        <div className="text-[11px] text-floodlight-muted">
                          {team.players_count} players · {formatCurrency(team.total_spent)} spent
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-display text-xl font-black text-flare tabular-nums">
                        {team.total_score}
                        <span className="text-xs text-floodlight-muted font-normal">/100</span>
                      </div>
                      <div className="text-[10px] text-floodlight-subtle">Squad Score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Team's Deep 5-Pillar Scorecard */}
        <div className="lg:col-span-7 space-y-4">
          {selectedTeam ? (
            <div className="bg-night rounded-card border border-night-border p-5 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-night-border">
                <div className="flex items-center gap-3">
                  {selectedTeam.franchise && (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-xs shadow-md"
                      style={{ backgroundColor: selectedTeam.franchise.color }}
                    >
                      {selectedTeam.franchise.short_code}
                    </div>
                  )}
                  <div>
                    <h2 className="font-display text-xl font-black text-floodlight">
                      {selectedTeam.franchise?.name}
                    </h2>
                    <div className="text-xs text-floodlight-muted">
                      Manager: <span className="text-floodlight font-semibold">{selectedTeam.display_name}</span> · Rank #{selectedTeam.rank}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-floodlight-muted">Total Evaluation</div>
                    <div className="font-display text-3xl font-black text-flare tabular-nums">
                      {selectedTeam.total_score}
                      <span className="text-sm text-floodlight-muted font-normal">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-Pillar Progress Bars */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-floodlight-muted">
                  Deterministic 5-Pillar Breakdown
                </h3>

                {/* Pillar 1: Individual Performance (40%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Individual Player Performance (40%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedTeam.individual_performance_score || selectedTeam.role_balance_score || 0} / 40
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (((selectedTeam.individual_performance_score || selectedTeam.role_balance_score || 0) / 40) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Aggregated verified 2026 IPL player performance points across all squad members.
                  </div>
                </div>

                {/* Pillar 2: Batting Strength (20%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-orange-400" />
                      Batting Firepower & Depth (20%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedTeam.batting_strength_score || 0} / 20
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (((selectedTeam.batting_strength_score || 0) / 20) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Top-order anchoring, strike rate differentials, boundary percentage, and depth.
                  </div>
                </div>

                {/* Pillar 3: Bowling Strength (20%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      Bowling Defense & Wicket Threat (20%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedTeam.bowling_strength_score || 0} / 20
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (((selectedTeam.bowling_strength_score || 0) / 20) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Economy rates, strike rates, death over specialists, and pace-spin balance.
                  </div>
                </div>

                {/* Pillar 4: All-Rounder Strength (10%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      All-Rounder Utility (10%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedTeam.allrounder_strength_score || 0} / 10
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (((selectedTeam.allrounder_strength_score || 0) / 10) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Dual contribution value, pinch-hitting capability, and bowling flex options.
                  </div>
                </div>

                {/* Pillar 5: Squad Balance (10%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-purple-400" />
                      Squad Balance & IPL Compliance (10%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedTeam.squad_balance_score || selectedTeam.completeness_score || 0} / 10
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (((selectedTeam.squad_balance_score || selectedTeam.completeness_score || 0) / 10) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">
                    Wicketkeeping coverage, overseas limits (&le; 8 squad), minimum bowling depth.
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-turf/10 border border-turf/30 space-y-1.5">
                  <div className="text-[11px] font-bold text-turf flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Key Franchise Strengths
                  </div>
                  <div className="space-y-1">
                    {(selectedTeam.strengths && selectedTeam.strengths.length > 0
                      ? selectedTeam.strengths
                      : ['Well-rounded squad with healthy roster balance.']
                    ).map((st, i) => (
                      <div key={i} className="text-xs text-floodlight flex items-start gap-1">
                        <span className="text-turf font-bold">•</span>
                        <span>{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-hammer/10 border border-hammer/30 space-y-1.5">
                  <div className="text-[11px] font-bold text-hammer flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tactical Weaknesses & Gaps
                  </div>
                  <div className="space-y-1">
                    {(selectedTeam.weaknesses && selectedTeam.weaknesses.length > 0
                      ? selectedTeam.weaknesses
                      : ['No critical role vulnerabilities detected.']
                    ).map((wk, i) => (
                      <div key={i} className="text-xs text-floodlight flex items-start gap-1">
                        <span className="text-hammer font-bold">•</span>
                        <span>{wk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Squad Roster Preview */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-2">
                  Acquired Squad Roster ({selectedTeam.squad?.length || 0} Players)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {selectedTeam.squad?.map((s: BoughtPlayer) => (
                    <div
                      key={s.player_id}
                      className="p-2.5 rounded bg-night-raised border border-night-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-floodlight truncate">{s.player.name}</div>
                        <div className="text-[10px] text-floodlight-muted">
                          {s.player.role} · {s.player.country}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-flare">
                          {formatCurrency(s.bought_for ?? s.purchase_price ?? 0)}
                        </div>
                        <div className="text-[10px] text-floodlight-subtle">
                          Base: {formatCurrency(s.player.base_price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-night rounded-card border border-night-border p-12 text-center text-floodlight-muted">
              Select a team from the standings table to view their evaluation scorecard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
