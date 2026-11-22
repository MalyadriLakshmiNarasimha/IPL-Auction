'use client';

import React, { useState, useMemo } from 'react';
import { AuctionResults, TeamScoreBreakdown, Player, BoughtPlayer } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { DownloadReportModal } from '@/components/DownloadReportModal';
import { SmartPurseAnalyzer } from '@/components/SmartPurseAnalyzer';
import { SquadCompositionAnalyzer } from '@/components/SquadCompositionAnalyzer';
import { PlayerPortrait } from '@/components/PlayerPortrait';
import { DEFAULT_ROOM_SETTINGS } from '@/shared/constants';
import { Participant } from '@/shared/types';
import {
  Shield,
  Trophy,
  Briefcase,
  Users,
  Target,
  FileText,
  DollarSign,
  ArrowLeftRight,
  TrendingUp,
  Info,
} from 'lucide-react';

interface TeamDashboardViewProps {
  results: AuctionResults;
  currentUserId: string;
  onOpenDossier?: (player: Player) => void;
}

export const TeamDashboardView: React.FC<TeamDashboardViewProps> = ({
  results,
  currentUserId,
  onOpenDossier,
}) => {
  const teams = useMemo(() => results.leaderboard || [], [results.leaderboard]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    teams.find(t => t.participant_id === currentUserId)?.participant_id || teams[0]?.participant_id || ''
  );

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const squadScore = useMemo(
    () => teams.find(t => t.participant_id === selectedTeamId) || teams[0] || null,
    [teams, selectedTeamId]
  );

  const managerScore = useMemo(
    () => results.manager_leaderboard?.find(m => m.participant_id === selectedTeamId) || undefined,
    [results.manager_leaderboard, selectedTeamId]
  );

  const lineupScore = useMemo(
    () => results.playing_xi_leaderboard?.find(l => l.participant_id === selectedTeamId) || undefined,
    [results.playing_xi_leaderboard, selectedTeamId]
  );

  const submission = useMemo(
    () => results.playing_xi_submissions?.find(s => s.participant_id === selectedTeamId) || undefined,
    [results.playing_xi_submissions, selectedTeamId]
  );

  // Franchise trades
  const teamTrades = useMemo(() => {
    if (!results.trades || !squadScore?.franchise) return [];
    return results.trades.filter(
      t =>
        t.team_a_short === squadScore.franchise.short_code ||
        t.team_b_short === squadScore.franchise.short_code
    );
  }, [results.trades, squadScore]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Franchise Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-floodlight flex items-center gap-2">
            <Shield className="w-5 h-5 text-flare" />
            FRANCHISE EXECUTIVE COMMAND DASHBOARD
          </h2>
          <p className="text-xs text-floodlight-muted">
            Holistic analytics portal covering squad depth, executive rating, matchday lineup, and transaction ledgers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Franchise Select Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-xs sm:max-w-md">
            {teams.map(t => {
              const isSelected = t.participant_id === selectedTeamId;
              return (
                <button
                  key={t.participant_id}
                  onClick={() => setSelectedTeamId(t.participant_id)}
                  className={`px-3 py-1.5 rounded-pill text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                    isSelected
                      ? 'bg-flare text-white border-flare shadow-sm'
                      : 'bg-night-raised text-floodlight-muted hover:text-white border-night-border'
                  }`}
                >
                  {t.franchise && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: t.franchise.color }}
                    />
                  )}
                  <span>{t.franchise?.short_code}</span>
                </button>
              );
            })}
          </div>

          {squadScore && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2 rounded-pill bg-flare hover:bg-flare-hover text-white text-xs font-bold shadow-flare flex items-center gap-1.5 flex-shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF Report</span>
            </button>
          )}
        </div>
      </div>

      {squadScore && (
        <div className="space-y-6">
          {/* Tri-Pillar Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Squad Evaluation */}
            <div className="p-5 rounded-card bg-night border border-night-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-floodlight-muted">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Complete Squad Score
                  </span>
                  <span className="font-black text-amber-400">Rank #{squadScore.rank}</span>
                </div>
                <div className="font-display text-3xl font-black text-flare mt-2 tabular-nums">
                  {squadScore.total_score}
                  <span className="text-sm text-floodlight-muted font-normal"> / 100</span>
                </div>
                <p className="text-[11px] text-floodlight-subtle mt-1">
                  5-Pillar evaluation covering verified 2026 statistics, batting depth, and bowling threat.
                </p>
              </div>

              <div className="pt-3 border-t border-night-border mt-3 grid grid-cols-2 gap-2 text-[11px] text-floodlight-muted">
                <div>Batting: {squadScore.batting_strength_score || 0}/20</div>
                <div>Bowling: {squadScore.bowling_strength_score || 0}/20</div>
              </div>
            </div>

            {/* Manager Performance */}
            <div className="p-5 rounded-card bg-night border border-night-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-floodlight-muted">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-turf" /> Manager Strategy
                  </span>
                  <span className="font-black text-turf">Rank #{managerScore?.rank || 1}</span>
                </div>
                <div className="font-display text-3xl font-black text-turf mt-2 tabular-nums">
                  {managerScore?.total_manager_score || 0}
                  <span className="text-sm text-floodlight-muted font-normal"> / 100</span>
                </div>
                <p className="text-[11px] text-floodlight-subtle mt-1">
                  Evaluated on purse efficiency, bargain hunting surplus, and trade quality.
                </p>
              </div>

              <div className="pt-3 border-t border-night-border mt-3 grid grid-cols-2 gap-2 text-[11px] text-floodlight-muted">
                <div>VFM Index: {managerScore?.value_for_money_score || 0}/30</div>
                <div>Purse Reserve: {managerScore?.purse_efficiency_score || 0}/25</div>
              </div>
            </div>

            {/* Playing XI Matchday */}
            <div className="p-5 rounded-card bg-night border border-night-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-floodlight-muted">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> Matchday Playing XI
                  </span>
                  <span className="font-black text-blue-400">Rank #{lineupScore?.rank || 1}</span>
                </div>
                <div className="font-display text-3xl font-black text-blue-400 mt-2 tabular-nums">
                  {lineupScore?.total_score || 0}
                  <span className="text-sm text-floodlight-muted font-normal"> / 100</span>
                </div>
                <p className="text-[11px] text-floodlight-subtle mt-1">
                  Lineup balance rating across openers, middle order, finishers, and death bowling.
                </p>
              </div>

              <div className="pt-3 border-t border-night-border mt-3 grid grid-cols-2 gap-2 text-[11px] text-floodlight-muted">
                <div>Pace/Spin: {lineupScore?.pace_spin_ratio || '3:2'}</div>
                <div>Overseas: {lineupScore?.overseas_count || 0}/4</div>
              </div>
            </div>
          </div>

          {/* Post-Auction Smart Purse & Squad Composition Analytics */}
          {(() => {
            const squad = squadScore.squad || [];
            const spentByRole = { BAT: 0, BOWL: 0, AR: 0, WK: 0 };
            const roleCounts = { BAT: 0, BOWL: 0, AR: 0, WK: 0, overseas: 0 };

            for (const item of squad) {
              const r = (item.player.role || '').toUpperCase();
              const price = item.bought_for ?? item.purchase_price ?? 0;
              if (r.startsWith('BAT')) {
                spentByRole.BAT += price;
                roleCounts.BAT += 1;
              } else if (r.startsWith('BOWL')) {
                spentByRole.BOWL += price;
                roleCounts.BOWL += 1;
              } else if (r.startsWith('ALL') || r === 'AR') {
                spentByRole.AR += price;
                roleCounts.AR += 1;
              } else if (r.startsWith('WICKET') || r === 'WK') {
                spentByRole.WK += price;
                roleCounts.WK += 1;
              }
              if (item.player.country !== 'India' && item.player.nationality !== 'India') {
                roleCounts.overseas += 1;
              }
            }

            const analysisParticipant: Participant = {
              id: squadScore.participant_id,
              socket_id: squadScore.participant_id,
              room_code: results.room_code,
              display_name: squadScore.display_name,
              is_host: false,
              is_spectator: false,
              is_connected: true,
              last_active: Date.now(),
              franchise: squadScore.franchise,
              purse_remaining: squadScore.purse_remaining,
              squad,
              spent_by_role: spentByRole,
              role_counts: roleCounts,
              squad_shortages: [],
              squad_excesses: [],
              has_withdrawn_current: false,
            };
            const analysisSettings = {
              ...DEFAULT_ROOM_SETTINGS,
              purse: squadScore.total_spent + squadScore.purse_remaining,
              squad_size: Math.max(15, squad.length || 15),
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SmartPurseAnalyzer participant={analysisParticipant} settings={analysisSettings} />
                <SquadCompositionAnalyzer participant={analysisParticipant} settings={analysisSettings} />
              </div>
            );
          })()}

          {/* Detailed Squad Roster & Points */}
          <div className="bg-night rounded-card border border-night-border p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-floodlight flex items-center gap-2">
                <Target className="w-4 h-4 text-flare" />
                Squad Roster & Player Profiles ({squadScore.squad?.length || 0} Players)
              </h3>
              <div className="text-xs text-floodlight-muted">
                Purse Outlay: <span className="text-flare font-bold">{formatCurrency(squadScore.total_spent)}</span> · Remaining:{' '}
                <span className="text-turf font-bold">{formatCurrency(squadScore.purse_remaining)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {squadScore.squad?.map((s: BoughtPlayer) => {
                const isOverseas = s.player.country !== 'India' && s.player.nationality !== 'India';
                return (
                  <div
                    key={s.player_id}
                    className="p-3 rounded-card bg-night-raised border border-night-border hover:border-flare/40 transition-all flex items-center gap-3.5"
                  >
                    <div className="w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden shadow-md">
                      <PlayerPortrait player={s.player} aspectRatio="4/5" size="responsive" showBadge={false} />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-night border border-night-border text-floodlight">
                            {s.player.role}
                          </span>
                          <div className="flex items-center gap-1">
                            {isOverseas && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-flare/20 text-flare">
                                OS
                              </span>
                            )}
                            <span className="font-mono font-bold text-floodlight-muted text-xs">
                              {s.player.batting_style || 'Right Handed'}
                            </span>
                          </div>
                        </div>

                        <div className="font-bold text-sm text-floodlight mt-1.5 truncate">
                          {s.player.name}
                        </div>

                        <div className="text-[11px] text-floodlight-muted mt-0.5 truncate">
                          {s.player.country}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-night-border mt-2 flex items-center justify-between text-xs">
                        <span className="font-mono text-flare font-bold">
                          {formatCurrency(s.bought_for ?? s.purchase_price ?? 0)}
                        </span>
                        {onOpenDossier && (
                          <button
                            onClick={() => onOpenDossier(s.player)}
                            className="text-[10px] text-flare hover:underline font-bold flex items-center gap-0.5"
                          >
                            <Info className="w-3 h-3" /> Dossier
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade Ledger for this franchise */}
          {teamTrades.length > 0 && (
            <div className="bg-night rounded-card border border-night-border p-5 space-y-3">
              <h3 className="font-display text-base font-bold text-floodlight flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                Player Trades Ratified ({teamTrades.length})
              </h3>
              <div className="space-y-2">
                {teamTrades.map(tx => (
                  <div
                    key={tx.id}
                    className="p-3 rounded bg-night-raised border border-night-border text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-flare">{tx.team_a_short}</span> gave{' '}
                      <span className="font-semibold text-white">{tx.player_a.name}</span> to{' '}
                      <span className="font-bold text-flare">{tx.team_b_short}</span> in exchange for{' '}
                      <span className="font-semibold text-white">{tx.player_b.name}</span>
                    </div>
                    <span className="text-[10px] text-floodlight-muted" suppressHydrationWarning>
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for PDF / Print */}
      {isReportModalOpen && squadScore && (
        <DownloadReportModal
          squadScore={squadScore}
          managerScore={managerScore}
          lineupScore={lineupScore}
          submission={submission}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};
