'use client';

import React, { useState, useMemo } from 'react';
import { PlayingXIScoreBreakdown, PlayingXISubmission } from '@/shared/types';
import {
  Shield,
  Target,
  Zap,
  TrendingUp,
  Award,
  ChevronRight,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface PlayingXILeaderboardViewProps {
  lineups: PlayingXIScoreBreakdown[];
  submissions?: PlayingXISubmission[];
  currentUserId: string;
  isHost: boolean;
  onProceedToRecap?: () => void;
}

export const PlayingXILeaderboardView: React.FC<PlayingXILeaderboardViewProps> = ({
  lineups,
  submissions = [],
  currentUserId,
  isHost,
  onProceedToRecap,
}) => {
  const sortedLineups = useMemo(() => {
    return [...lineups].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }, [lineups]);

  const [selectedLineupId, setSelectedLineupId] = useState<string>(
    sortedLineups.find(l => l.participant_id === currentUserId)?.participant_id ||
      sortedLineups[0]?.participant_id ||
      ''
  );

  const selectedLineup = useMemo(
    () => sortedLineups.find(l => l.participant_id === selectedLineupId) || sortedLineups[0] || null,
    [sortedLineups, selectedLineupId]
  );

  const selectedSubmission = useMemo(
    () => submissions.find(s => s.participant_id === selectedLineupId) || null,
    [submissions, selectedLineupId]
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
              <Users className="w-3.5 h-3.5" />
              Stage 7 · Statistical Playing XI Rankings
            </span>
            <span className="text-xs text-floodlight-muted font-semibold">
              Deterministic Matchday Lineup Engine
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-floodlight mt-1">
            MATCHDAY PLAYING XI STANDINGS
          </h1>
          <p className="text-xs text-floodlight-muted mt-0.5">
            Evaluates the starting 11 independently of the squad bench: top-order anchoring, finishing punch, death bowling, and pace-spin tactical equilibrium.
          </p>
        </div>

        {isHost && onProceedToRecap && (
          <button
            onClick={onProceedToRecap}
            className="px-5 py-2.5 rounded-pill bg-flare hover:bg-flare-hover text-white font-bold text-xs shadow-flare flex items-center gap-2 self-stretch sm:self-auto justify-center"
          >
            <span>Proceed to Season Recap & Awards</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid: Standings (Left) + Detailed Lineup Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Standings Table */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-night rounded-card border border-night-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-floodlight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-flare" />
                Lineup Rankings
              </h2>
              <span className="text-[10px] text-floodlight-muted">Select XI to inspect</span>
            </div>

            <div className="space-y-2">
              {sortedLineups.map((lineup, idx) => {
                const isSelected = lineup.participant_id === selectedLineupId;
                const isCurrentUser = lineup.participant_id === currentUserId;
                return (
                  <div
                    key={lineup.participant_id || idx}
                    onClick={() => setSelectedLineupId(lineup.participant_id)}
                    className={`p-3 rounded-card border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-flare/15 border-flare shadow-flare'
                        : 'bg-night-raised hover:bg-night-border/70 border-night-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 text-center">{getRankBadge(lineup.rank || idx + 1)}</div>
                      {lineup.franchise && (
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: lineup.franchise.color }}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-floodlight">{lineup.franchise?.name}</span>
                          {isCurrentUser && (
                            <span className="text-[9px] bg-turf/20 text-turf px-1 rounded font-bold">YOU</span>
                          )}
                        </div>
                        <div className="text-[11px] text-floodlight-muted">
                          Manager: {lineup.display_name} · OS: {lineup.overseas_count}/4
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-display text-xl font-black text-flare tabular-nums">
                        {lineup.total_score}
                        <span className="text-xs text-floodlight-muted font-normal">/100</span>
                      </div>
                      <div className="text-[10px] text-floodlight-subtle">Lineup Power</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detailed Matchday Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          {selectedLineup ? (
            <div className="bg-night rounded-card border border-night-border p-5 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-night-border">
                <div className="flex items-center gap-3">
                  {selectedLineup.franchise && (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-xs shadow-md"
                      style={{ backgroundColor: selectedLineup.franchise.color }}
                    >
                      {selectedLineup.franchise.short_code}
                    </div>
                  )}
                  <div>
                    <h2 className="font-display text-xl font-black text-floodlight">
                      {selectedLineup.franchise?.name}
                    </h2>
                    <div className="text-xs text-floodlight-muted">
                      Lineup Rank #{selectedLineup.rank} · Overseas Players: {selectedLineup.overseas_count}/4
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Matchday Score</div>
                  <div className="font-display text-3xl font-black text-flare tabular-nums">
                    {selectedLineup.total_score}
                    <span className="text-sm text-floodlight-muted font-normal">/100</span>
                  </div>
                </div>
              </div>

              {/* 4 Lineup Scoring Pillars */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-floodlight-muted">
                  Matchday Lineup Pillars
                </h3>

                {/* Batting Firepower (30%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-orange-400" />
                      Starting Batting Lineup (30%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedLineup.batting_score} / 30
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (selectedLineup.batting_score / 30) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Bowling Firepower (30%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      Active Bowling Attack (30%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedLineup.bowling_score} / 30
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (selectedLineup.bowling_score / 30) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* All-Rounder Punch (20%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      All-Round Depth & Cushion (20%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedLineup.allrounder_score} / 20
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (selectedLineup.allrounder_score / 20) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Tactical Role Balance (20%) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-floodlight flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-purple-400" />
                      Role Distribution & Balance (20%)
                    </span>
                    <span className="font-mono font-bold text-floodlight">
                      {selectedLineup.balance_score} / 20
                    </span>
                  </div>
                  <div className="w-full bg-night-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (selectedLineup.balance_score / 20) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tactical Phase Ratings Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded bg-night-raised border border-night-border text-center">
                  <div className="text-[10px] text-floodlight-muted uppercase font-bold">Openers</div>
                  <div className="font-display font-black text-base text-amber-400 mt-0.5">
                    {selectedLineup.openers_rating} <span className="text-[10px] font-normal">pts</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-night-raised border border-night-border text-center">
                  <div className="text-[10px] text-floodlight-muted uppercase font-bold">Middle Order</div>
                  <div className="font-display font-black text-base text-orange-400 mt-0.5">
                    {selectedLineup.middle_order_rating} <span className="text-[10px] font-normal">pts</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-night-raised border border-night-border text-center">
                  <div className="text-[10px] text-floodlight-muted uppercase font-bold">Finishers</div>
                  <div className="font-display font-black text-base text-emerald-400 mt-0.5">
                    {selectedLineup.finishers_rating} <span className="text-[10px] font-normal">pts</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-night-raised border border-night-border text-center">
                  <div className="text-[10px] text-floodlight-muted uppercase font-bold">Pace:Spin</div>
                  <div className="font-display font-black text-base text-blue-400 mt-0.5">
                    {selectedLineup.pace_spin_ratio || '3:2'}
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-turf/10 border border-turf/30 space-y-1">
                  <div className="text-[11px] font-bold text-turf flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Lineup Strengths
                  </div>
                  {(selectedLineup.strengths && selectedLineup.strengths.length > 0
                    ? selectedLineup.strengths
                    : ['Balanced matchday XI configuration.']
                  ).map((st, i) => (
                    <div key={i} className="text-xs text-floodlight">
                      • {st}
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-hammer/10 border border-hammer/30 space-y-1">
                  <div className="text-[11px] font-bold text-hammer flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Lineup Vulnerabilities
                  </div>
                  {(selectedLineup.weaknesses && selectedLineup.weaknesses.length > 0
                    ? selectedLineup.weaknesses
                    : ['No critical matchday vulnerabilities detected.']
                  ).map((wk, i) => (
                    <div key={i} className="text-xs text-floodlight">
                      • {wk}
                    </div>
                  ))}
                </div>
              </div>

              {/* Batting Order Roster */}
              {selectedSubmission && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted">
                    Starting 11 Batting Order
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {selectedSubmission.players.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-2 rounded bg-night-raised border border-night-border flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-night font-mono font-bold text-[10px] text-flare flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-floodlight truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] text-floodlight-muted">
                          {p.role} · <span className="text-flare font-medium">{p.batting_style || p.country}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-night rounded-card border border-night-border p-12 text-center text-floodlight-muted">
              Select a team to inspect their Playing XI scorecard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

