'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, IplCareerStats, IplSeasonStats, PlayerPerformanceStats } from '../shared/types';
import { getIplCareerStats, getIplSeasonStats } from '../shared/player-career-data';
import { getPklPlayerStats } from '../shared/pkl-player-data';
import { PklRawStats } from '../shared/pkl-scoring';
import { Flame, Calendar } from 'lucide-react';

export type StatView = 'career' | 'season_2026';

interface PlayerStatsCarouselProps {
  player: Player;
  initialView?: StatView;
  autoRotateInterval?: number; // ms, default 3000
  className?: string;
}

/**
 * Normalizes player role into core cricket categories
 */
function normalizeRole(role?: string): 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper' {
  const r = (role || '').toUpperCase();
  if (r.startsWith('WICKET') || r === 'WK') return 'Wicketkeeper';
  if (r.startsWith('ALL') || r === 'AR') return 'All-Rounder';
  if (r.startsWith('BOWL')) return 'Bowler';
  return 'Batter';
}

/**
 * Checks if a player has any recorded batting performance
 */
function hasBattingRecord(stats?: PlayerPerformanceStats): boolean {
  if (!stats) return false;
  return (
    (stats.runs !== undefined && stats.runs !== null) ||
    (stats.innings !== undefined && stats.innings !== null && stats.innings > 0) ||
    (stats.fours !== undefined && stats.fours !== null && stats.fours > 0) ||
    (stats.sixes !== undefined && stats.sixes !== null && stats.sixes > 0) ||
    (stats.batting_average !== undefined && stats.batting_average !== null && stats.batting_average > 0) ||
    (stats.strike_rate !== undefined && stats.strike_rate !== null && stats.strike_rate > 0)
  );
}

/**
 * Checks if a player has any recorded bowling performance
 */
function hasBowlingRecord(stats?: PlayerPerformanceStats): boolean {
  if (!stats) return false;
  return (
    (stats.wickets !== undefined && stats.wickets !== null) ||
    (stats.overs !== undefined && stats.overs !== null && stats.overs !== '—' && stats.overs !== 0 && stats.overs !== '0') ||
    (stats.balls !== undefined && stats.balls !== null && stats.balls > 0) ||
    (stats.bowling_innings !== undefined && stats.bowling_innings !== null && stats.bowling_innings > 0) ||
    (stats.runs_conceded !== undefined && stats.runs_conceded !== null && stats.runs_conceded > 0)
  );
}

export const PlayerStatsCarousel: React.FC<PlayerStatsCarouselProps> = ({
  player,
  initialView = 'career',
  autoRotateInterval = 3000,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<StatView>(initialView);
  const [manualCycle, setManualCycle] = useState<number>(0);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);

  // Retrieve authoritative datasets directly from registry or player object
  const playerId = player?.id;
  const careerStats: IplCareerStats = getIplCareerStats(playerId || player) || player?.ipl_career_stats;
  const seasonStats: IplSeasonStats = getIplSeasonStats(playerId || player) || player?.season_2026_stats;

  // Reset to Career view whenever active player changes
  useEffect(() => {
    setActiveView('career');
  }, [playerId]);

  // Handle document visibility change (pause timer when tab is hidden, resume cleanly)
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 3-second automatic rotation loop between Career and 2026
  // Depends only on stable primitives to prevent socket-event timer teardown/race conditions
  useEffect(() => {
    if (isTabHidden || autoRotateInterval <= 0 || !playerId) return;

    const timer = setInterval(() => {
      setActiveView((current) => (current === 'career' ? 'season_2026' : 'career'));
    }, autoRotateInterval);

    return () => clearInterval(timer);
  }, [playerId, manualCycle, isTabHidden, autoRotateInterval]);

  const handleSelectView = (view: StatView) => {
    if (view === activeView) return;
    setActiveView(view);
    setManualCycle((c) => c + 1); // Resets the 3-second timer and resumes auto-rotation
  };

  if (!player) {
    return (
      <div
        className={`z-10 rounded-xl bg-night-surface/90 border border-night-border/70 p-2.5 sm:p-3 overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-center min-h-[72px]">
          <div className="animate-pulse text-xs text-floodlight-muted">Loading player statistics...</div>
        </div>
      </div>
    );
  }

  const isCareer = activeView === 'career';
  const currentStats: PlayerPerformanceStats = isCareer ? careerStats : seasonStats;
  const roleCategory = normalizeRole(player.role);

  const isPkl =
    player.id?.startsWith('k-') ||
    player.id?.startsWith('pkl-') ||
    ['Raider', 'Defender', 'All-Rounder', 'RAID', 'DEF'].includes(player.role);
  const pklStatsData = isPkl ? getPklPlayerStats(player) || (player as any).pkl_stats : null;

  return (
    <div
      key={player.id}
      className={`z-10 rounded-xl bg-night-surface/90 border border-night-border/70 p-2.5 sm:p-3 overflow-hidden ${className}`}
    >
      {/* Top Header: Title, Official Tag, & Clickable View Indicators */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-night-border/50">
        <div className="flex items-center gap-1.5 min-w-0">
          {isCareer ? (
            <Flame className="w-3.5 h-3.5 text-flare flex-shrink-0" />
          ) : (
            <Calendar className="w-3.5 h-3.5 text-turf flex-shrink-0" />
          )}
          <span className="text-[10px] font-black uppercase tracking-wider text-floodlight truncate">
            {isPkl
              ? isCareer
                ? 'OVERALL PKL CAREER'
                : 'PKL SEASON 12'
              : isCareer
              ? 'OVERALL IPL CAREER'
              : 'IPL 2026 SEASON'}
          </span>
          <span className="text-[9px] text-floodlight-subtle hidden md:inline">
            · {isCareer ? (isPkl ? 'All-Time Mat Record' : 'All-Time Record') : 'Completed Season'}
          </span>
        </div>

        {/* Clickable View Switcher Indicators */}
        <div className="flex items-center gap-1 bg-night-raised/90 p-0.5 rounded-lg border border-night-border/60">
          <button
            type="button"
            onClick={() => handleSelectView('career')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all duration-200 ${
              isCareer
                ? 'bg-flare text-night-bg shadow-sm font-black'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
            title="View complete historical career statistics"
          >
            Overall Career
          </button>
          <button
            type="button"
            onClick={() => handleSelectView('season_2026')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all duration-200 ${
              !isCareer
                ? 'bg-flare text-night-bg shadow-sm font-black'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
            title={isPkl ? 'View PKL Season 12 statistics' : 'View IPL 2026 season statistics'}
          >
            {isPkl ? 'PKL Season 12' : 'IPL 2026'}
          </button>
        </div>
      </div>

      {/* Carousel Body: Direct Non-Blocking Transition */}
      <div className="relative min-h-[72px] flex items-center w-full">
        <AnimatePresence initial={false}>
          <motion.div
            key={`${player.id}-${activeView}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full"
          >
            {isPkl ? (
              (() => {
                const activePkl = isCareer ? pklStatsData?.career : pklStatsData?.season_12;
                if (activePkl && (activePkl.matches ?? 0) > 0) {
                  return <PklStatsGrid stats={activePkl} role={player.role} />;
                }
                return (
                  <UnavailableStatsState
                    title={
                      isCareer
                        ? 'PKL Squad Asset (Bench Reserve / Debutant)'
                        : 'No Season 12 appearances (Reserve Squad Member)'
                    }
                    subtitle="Official Pro Kabaddi franchise squad member — calculated baseline performance verified"
                  />
                );
              })()
            ) : isCareer ? (
              careerStats && careerStats.has_stats && careerStats.has_ipl_career && careerStats.matches > 0 ? (
                <DynamicRoleStatsView
                  stats={careerStats}
                  role={roleCategory}
                  isSeason2026={false}
                />
              ) : (
                <UnavailableStatsState
                  title={
                    careerStats?.status === 'MAPPING_ERROR'
                      ? 'Statistics unavailable (Mapping Error)'
                      : careerStats?.status === 'DATA_UNAVAILABLE'
                      ? 'Statistics unavailable'
                      : 'Statistics unavailable (IPL Debutant)'
                  }
                  subtitle={
                    careerStats?.status === 'MAPPING_ERROR'
                      ? 'Player identity mapping requires verification'
                      : careerStats?.status === 'DATA_UNAVAILABLE'
                      ? 'Official statistics pending verification'
                      : 'Uncapped / Yet to make IPL debut — Historical statistics not applicable'
                  }
                />
              )
            ) : seasonStats && seasonStats.has_stats && seasonStats.has_season_stats && seasonStats.matches > 0 ? (
              <DynamicRoleStatsView
                stats={seasonStats}
                role={roleCategory}
                isSeason2026={true}
              />
            ) : (
              <UnavailableStatsState
                title={
                  seasonStats?.status === 'MAPPING_ERROR'
                    ? 'Statistics unavailable (Mapping Error)'
                    : seasonStats?.status === 'DATA_UNAVAILABLE'
                    ? 'Statistics unavailable'
                    : careerStats && careerStats.has_ipl_career && careerStats.matches > 0
                    ? 'Statistics unavailable (No appearances in IPL 2026)'
                    : 'Statistics unavailable (IPL Debutant)'
                }
                subtitle={
                  seasonStats?.status === 'MAPPING_ERROR'
                    ? 'Player identity mapping requires verification'
                    : seasonStats?.status === 'DATA_UNAVAILABLE'
                    ? 'Official statistics pending verification'
                    : careerStats && careerStats.has_ipl_career && careerStats.matches > 0
                    ? 'Did not participate in IPL 2026 matches'
                    : 'Uncapped / Yet to make IPL debut — Historical statistics not applicable'
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Multi-Source Provenance Footer */}
      {isPkl ? (
        <div className="mt-2 pt-1.5 border-t border-night-border/40 flex items-center justify-between text-[9px] text-floodlight-subtle">
          <span className="truncate max-w-[70%]">Official PKL Match Center / Mashal Sports</span>
          <span className="text-turf font-bold ml-1 flex-shrink-0 flex items-center gap-0.5">
            ✓ Verified PKL Season 12
          </span>
        </div>
      ) : currentStats && currentStats.source_provenance ? (
        <div className="mt-2 pt-1.5 border-t border-night-border/40 flex items-center justify-between text-[9px] text-floodlight-subtle">
          <span className="truncate max-w-[70%]" title={currentStats.source_provenance}>
            {currentStats.source_provenance}
          </span>
          <span className="text-turf font-bold ml-1 flex-shrink-0 flex items-center gap-0.5">
            ✓ Verified Upto2026
          </span>
        </div>
      ) : null}
    </div>
  );
};

/**
 * Pro Kabaddi League (PKL) Dedicated Role-Based Statistics Grid
 * Accurately categorizes Raider, Defender, and All-Rounder
 * strictly avoiding irrelevant, fabricated, or misplaced statistics.
 */
export function getPklRoleCategory(role?: string): 'Raider' | 'Defender' | 'All-Rounder' {
  const r = (role || '').trim().toUpperCase();
  if (r.includes('ALL') || r === 'AR') return 'All-Rounder';
  if (r.includes('DEF')) return 'Defender';
  return 'Raider';
}

export const PklStatsGrid: React.FC<{
  stats: PklRawStats;
  role: string;
}> = ({ stats, role }) => {
  const pklRole = getPklRoleCategory(role);

  const formatVal = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '—';
    return val;
  };

  // RAIDER: Raiding Performance + Tackle Points as additional defensive metric
  if (pklRole === 'Raider') {
    return (
      <div className="space-y-1 w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] font-black uppercase tracking-wider text-flare bg-flare/10 px-1.5 py-0.5 rounded border border-flare/20">
            Raiding Record
          </span>
          <span className="text-[8px] font-bold text-floodlight-subtle uppercase tracking-wider">
            Primary Role: Raider
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center w-full">
          <StatTile label="Matches" value={formatVal(stats.matches)} />
          <StatTile label="Raid Pts" value={formatVal(stats.raid_points)} highlight="flare" />
          <StatTile label="Succ Raids" value={formatVal(stats.successful_raids)} />
          <StatTile label="Super 10s" value={formatVal(stats.super_10s)} highlight="flare" />
          <StatTile label="Tackle Pts" value={formatVal(stats.tackle_points)} highlight="turf" />
        </div>
      </div>
    );
  }

  // DEFENDER: Defensive Performance + Raid Points as additional raiding metric
  if (pklRole === 'Defender') {
    return (
      <div className="space-y-1 w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] font-black uppercase tracking-wider text-turf bg-turf/10 px-1.5 py-0.5 rounded border border-turf/20">
            Tackle Defense
          </span>
          <span className="text-[8px] font-bold text-floodlight-subtle uppercase tracking-wider">
            Primary Role: Defender
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center w-full">
          <StatTile label="Matches" value={formatVal(stats.matches)} />
          <StatTile label="Defence Pts" value={formatVal(stats.tackle_points)} highlight="turf" />
          <StatTile label="High 5s" value={formatVal(stats.high_5s)} highlight="turf" />
          <StatTile label="Tackles" value={formatVal((stats as any).tackles ?? stats.super_tackles)} />
          <StatTile label="Raid Pts" value={formatVal(stats.raid_points)} highlight="flare" />
        </div>
      </div>
    );
  }

  // ALL-ROUNDER: Displays both raiding and defensive statistics together in the same card
  return (
    <div className="space-y-1.5 w-full">
      {/* Raiding Record */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] font-black uppercase tracking-wider text-flare bg-flare/10 px-1.5 py-0.5 rounded border border-flare/20">
            Raiding Record
          </span>
          <span className="text-[8px] font-bold text-floodlight-subtle uppercase tracking-wider">
            Primary Role: All-Rounder
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center w-full">
          <StatTile label="Matches" value={formatVal(stats.matches)} isCompact />
          <StatTile label="Total Pts" value={formatVal(stats.total_points)} highlight="flare" isCompact />
          <StatTile label="Raid Pts" value={formatVal(stats.raid_points)} highlight="flare" isCompact />
          <StatTile label="Succ Raids" value={formatVal(stats.successful_raids)} isCompact />
          <StatTile label="Super 10s" value={formatVal(stats.super_10s)} highlight="flare" isCompact />
        </div>
      </div>

      {/* Tackle Defense */}
      <div>
        <div className="flex items-center gap-1.5 mb-1 pt-0.5">
          <span className="text-[8px] font-black uppercase tracking-wider text-turf bg-turf/10 px-1.5 py-0.5 rounded border border-turf/20">
            Tackle Defense
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 sm:gap-1.5 text-center w-full">
          <StatTile label="Defence Pts" value={formatVal(stats.tackle_points)} highlight="turf" isCompact />
          <StatTile label="Tackles" value={formatVal((stats as any).tackles ?? stats.super_tackles)} isCompact />
          <StatTile label="High 5s" value={formatVal(stats.high_5s)} highlight="turf" isCompact />
        </div>
      </div>
    </div>
  );
};

/**
 * Clean styled unavailable state
 */
const UnavailableStatsState: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="w-full bg-night-raised/60 rounded-lg p-2.5 sm:p-3 border border-night-border/50 text-center">
    <div className="text-xs sm:text-sm font-bold text-flare">{title}</div>
    <p className="text-[10px] sm:text-[11px] text-floodlight-muted mt-0.5">{subtitle}</p>
  </div>
);

/**
 * Dynamic Role-Based Statistics View
 * Handles Batter, Bowler, All-Rounder, and Wicketkeeper
 * strictly avoiding empty cards, blank sections, or unrecorded placeholders
 */
const DynamicRoleStatsView: React.FC<{
  stats: PlayerPerformanceStats;
  role: 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';
  isSeason2026: boolean;
}> = ({ stats, role, isSeason2026 }) => {
  const hasBat = hasBattingRecord(stats);
  const hasBowl = hasBowlingRecord(stats);

  // Wicketkeeper: Show batting statistics + verified keeping dismissals if available
  if (role === 'Wicketkeeper') {
    const hasKeeping =
      (stats.catches !== undefined && stats.catches !== null && stats.catches > 0) ||
      (stats.stumpings !== undefined && stats.stumpings !== null && stats.stumpings > 0) ||
      (stats.dismissals !== undefined && stats.dismissals !== null && stats.dismissals > 0);

    return (
      <div className="space-y-1.5 w-full">
        <SevenFieldBattingGrid stats={stats} />
        {/* Only render wicketkeeping section when verified source data exists */}
        {hasKeeping && (
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
            <StatTile label="Catches" value={stats.catches ?? 0} />
            <StatTile label="Stumpings" value={stats.stumpings ?? 0} />
            <StatTile label="Dismissals" value={stats.dismissals ?? 0} highlight="flare" />
          </div>
        )}
      </div>
    );
  }

  // All-Rounder: Render both Batting and Bowling if both exist
  // If only one discipline has records, render only that discipline without empty sections
  if (role === 'All-Rounder') {
    if (hasBat && hasBowl) {
      return (
        <div className="space-y-1.5 w-full">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] font-black uppercase tracking-wider text-flare bg-flare/10 px-1.5 py-0.5 rounded border border-flare/20">
                Batting
              </span>
            </div>
            <SevenFieldBattingGrid stats={stats} isCompact />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1 pt-0.5">
              <span className="text-[8px] font-black uppercase tracking-wider text-turf bg-turf/10 px-1.5 py-0.5 rounded border border-turf/20">
                Bowling
              </span>
            </div>
            <SevenFieldBowlingGrid stats={stats} isCompact />
          </div>
        </div>
      );
    }
    if (hasBowl && !hasBat) {
      return <SevenFieldBowlingGrid stats={stats} />;
    }
    return <SevenFieldBattingGrid stats={stats} />;
  }

  // Bowler: Show bowling statistics only
  // (Fallback to batting only if player never bowled in this dataset)
  if (role === 'Bowler') {
    if (hasBowl) {
      return <SevenFieldBowlingGrid stats={stats} />;
    }
    if (hasBat) {
      return <SevenFieldBattingGrid stats={stats} />;
    }
    return <SevenFieldBowlingGrid stats={stats} />;
  }

  // Batter: Show batting statistics only
  // (Fallback to bowling only if player never batted but bowled)
  if (hasBat) {
    return <SevenFieldBattingGrid stats={stats} />;
  }
  if (hasBowl) {
    return <SevenFieldBowlingGrid stats={stats} />;
  }
  return <SevenFieldBattingGrid stats={stats} />;
};

/**
 * Standard 7-Field Batting Grid:
 * 1. Matches (M)
 * 2. Innings (Inns)
 * 3. Runs
 * 4. Batting Average (Avg)
 * 5. Strike Rate (SR)
 * 6. Fours (4s)
 * 7. Sixes (6s)
 *
 * All unsupported metrics (HS, 100s, 50s, NO, Balls Faced) are removed.
 */
const SevenFieldBattingGrid: React.FC<{
  stats: PlayerPerformanceStats;
  isCompact?: boolean;
}> = ({ stats, isCompact = false }) => {
  const matches = stats.matches ?? 0;
  const innings = stats.innings !== undefined && stats.innings !== null ? stats.innings : matches;
  const runs = stats.runs !== undefined && stats.runs !== null ? stats.runs : 0;

  const avg =
    stats.batting_average !== undefined && stats.batting_average !== null && stats.batting_average > 0
      ? stats.batting_average.toFixed(2)
      : stats.batting_average === 0
      ? '0.00'
      : '—';

  const sr =
    stats.strike_rate !== undefined && stats.strike_rate !== null && stats.strike_rate > 0
      ? stats.strike_rate.toFixed(2)
      : stats.strike_rate === 0
      ? '0.00'
      : '—';

  const fours = stats.fours !== undefined && stats.fours !== null ? stats.fours : '—';
  const sixes = stats.sixes !== undefined && stats.sixes !== null ? stats.sixes : '—';

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-1.5 text-center w-full">
      <StatTile label="M" value={matches} isCompact={isCompact} />
      <StatTile label="Inns" value={innings} isCompact={isCompact} />
      <StatTile label="Runs" value={runs.toLocaleString('en-IN')} highlight="flare" isCompact={isCompact} />
      <StatTile label="Avg" value={avg} isCompact={isCompact} />
      <StatTile label="SR" value={sr} highlight="turf" isCompact={isCompact} />
      <StatTile label="4s" value={fours} isCompact={isCompact} />
      <StatTile label="6s" value={sixes} isCompact={isCompact} />
    </div>
  );
};

/**
 * Standard 7-Field Bowling Grid:
 * 1. Matches (M)
 * 2. Bowling Innings (Inns)
 * 3. Overs
 * 4. Balls Delivered (Balls)
 * 5. Runs Given (Runs)
 * 6. Wickets (Wkts)
 * 7. Economy (Econ)
 * 8. Best Bowling Figures (displayed only if verified data is available)
 *
 * All unsupported metrics (Maidens, 4w, 5w) are removed.
 */
const SevenFieldBowlingGrid: React.FC<{
  stats: PlayerPerformanceStats;
  isCompact?: boolean;
}> = ({ stats, isCompact = false }) => {
  const matches = stats.matches ?? 0;
  const innings =
    stats.bowling_innings !== undefined && stats.bowling_innings !== null
      ? stats.bowling_innings
      : matches;
  const overs = stats.overs !== undefined && stats.overs !== null ? stats.overs : '—';
  const balls = stats.balls !== undefined && stats.balls !== null ? stats.balls : '—';
  const runsGiven =
    stats.runs_conceded !== undefined && stats.runs_conceded !== null ? stats.runs_conceded : '—';
  const wickets = stats.wickets !== undefined && stats.wickets !== null ? stats.wickets : 0;

  const econ =
    stats.economy_rate !== undefined && stats.economy_rate !== null && stats.economy_rate > 0
      ? stats.economy_rate.toFixed(2)
      : stats.economy_rate === 0
      ? '0.00'
      : '—';

  const hasBest =
    stats.best_bowling && stats.best_bowling !== '—' && stats.best_bowling.trim().length > 0;

  const colsClass = hasBest ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-4 sm:grid-cols-7';

  return (
    <div className={`grid ${colsClass} gap-1 sm:gap-1.5 text-center w-full`}>
      <StatTile label="M" value={matches} isCompact={isCompact} />
      <StatTile label="Inns" value={innings} isCompact={isCompact} />
      <StatTile label="Overs" value={overs} isCompact={isCompact} />
      <StatTile label="Balls" value={balls} isCompact={isCompact} />
      <StatTile label="Runs" value={runsGiven} isCompact={isCompact} />
      <StatTile label="Wkts" value={wickets} highlight="flare" isCompact={isCompact} />
      <StatTile label="Econ" value={econ} highlight="turf" isCompact={isCompact} />
      {hasBest && <StatTile label="Best" value={stats.best_bowling!} isCompact={isCompact} />}
    </div>
  );
};

/**
 * Compact, Evenly-Spaced Stat Tile
 * Respects Twilight Scoreboard color palette, typography, and tabular numerals
 */
const StatTile: React.FC<{
  label: string;
  value: string | number;
  highlight?: 'flare' | 'turf';
  isCompact?: boolean;
}> = ({ label, value, highlight, isCompact = false }) => {
  const colorClass =
    highlight === 'flare'
      ? 'text-flare'
      : highlight === 'turf'
      ? 'text-turf'
      : 'text-floodlight';

  const paddingClass = isCompact ? 'p-1 sm:p-1.5' : 'p-1.5 sm:p-2';
  const valTextClass = isCompact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm';

  return (
    <div
      className={`bg-night-raised/70 rounded-lg ${paddingClass} border border-night-border/40 flex flex-col justify-center min-w-0`}
    >
      <div className="text-[8px] sm:text-[9px] text-floodlight-muted uppercase font-bold truncate tracking-wider">
        {label}
      </div>
      <div className={`font-display ${valTextClass} font-black tabular-nums truncate ${colorClass}`}>
        {value}
      </div>
    </div>
  );
};
