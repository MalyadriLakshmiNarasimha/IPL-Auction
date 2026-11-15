'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, IplCareerStats, IplSeasonStats, PlayerPerformanceStats } from '../shared/types';
import { getIplCareerStats, getIplSeasonStats } from '../shared/player-career-data';
import { Flame, Calendar } from 'lucide-react';

export type StatView = 'career' | 'season_2026';

interface PlayerStatsCarouselProps {
  player: Player;
  initialView?: StatView;
  autoRotateInterval?: number; // ms, default 3000
  className?: string;
}

function getRoleCategory(role?: string, stats?: PlayerPerformanceStats): 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper' {
  const r = (role || '').toUpperCase();
  if (r.startsWith('WICKET') || r === 'WK') return 'Wicketkeeper';
  if (r.startsWith('ALL') || r === 'AR') return 'All-Rounder';
  if (r.startsWith('BOWL')) return 'Bowler';
  // If classified as Batter but has wickets (all-rounder performance)
  if (stats && (stats.wickets ?? 0) > 0 && (stats.runs ?? 0) > 0) {
    return 'All-Rounder';
  }
  // If classified as Batter but only has bowling data
  if (stats && (stats.wickets ?? 0) > 0 && (!stats.runs || stats.runs === 0)) {
    return 'Bowler';
  }
  return 'Batter';
}

export const PlayerStatsCarousel: React.FC<PlayerStatsCarouselProps> = ({
  player,
  initialView = 'career',
  autoRotateInterval = 3000,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<StatView>(initialView);
  const [direction, setDirection] = useState<number>(1);
  const [manualCycle, setManualCycle] = useState<number>(0);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);

  // Retrieve authoritative datasets directly from registry / player object
  const careerStats: IplCareerStats = getIplCareerStats(player) || player?.ipl_career_stats;
  const seasonStats: IplSeasonStats = getIplSeasonStats(player) || player?.season_2026_stats;

  // Reset to Career view whenever active player changes
  useEffect(() => {
    setActiveView('career');
    setDirection(1);
  }, [player?.id]);

  // Handle document visibility change (pause when tab is hidden)
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 3-second automatic rotation loop between Career and 2026
  useEffect(() => {
    if (isTabHidden || autoRotateInterval <= 0 || !player) return;

    const timer = setInterval(() => {
      setActiveView((current) => {
        const next: StatView = current === 'career' ? 'season_2026' : 'career';
        setDirection(next === 'season_2026' ? 1 : -1);
        return next;
      });
    }, autoRotateInterval);

    return () => clearInterval(timer);
  }, [player?.id, manualCycle, isTabHidden, autoRotateInterval, player]);

  const handleSelectView = (view: StatView) => {
    if (view === activeView) return;
    setDirection(view === 'season_2026' ? 1 : -1);
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
  const roleCategory = getRoleCategory(player.role, currentStats);

  // Slide animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 380, damping: 32 },
        opacity: { duration: 0.2 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 380, damping: 32 },
        opacity: { duration: 0.16 },
      },
    }),
  };

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
            {isCareer ? 'OVERALL IPL CAREER' : 'IPL 2026 SEASON'}
          </span>
          <span className="text-[9px] text-floodlight-subtle hidden md:inline">
            · {isCareer ? 'All-Time Record' : 'Completed Season'}
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
            title="View complete historical IPL career statistics"
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
            title="View IPL 2026 season statistics"
          >
            IPL 2026
          </button>
        </div>
      </div>

      {/* Carousel Body: Horizontal Slide Transition */}
      <div className="relative overflow-hidden min-h-[72px] flex items-center">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={`${player.id}-${activeView}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            {/* Check if statistics are available */}
            {isCareer ? (
              careerStats && careerStats.has_stats && careerStats.has_ipl_career && careerStats.matches > 0 ? (
                <RoleSpecificStatsGrid stats={careerStats} role={roleCategory} />
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
              <RoleSpecificStatsGrid stats={seasonStats} role={roleCategory} />
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
      {currentStats && currentStats.source_provenance && (
        <div className="mt-2 pt-1.5 border-t border-night-border/40 flex items-center justify-between text-[9px] text-floodlight-subtle">
          <span className="truncate max-w-[70%]" title={currentStats.source_provenance}>
            {currentStats.source_provenance}
          </span>
          <span className="text-turf font-bold ml-1 flex-shrink-0 flex items-center gap-0.5">
            ✓ Verified Upto2026
          </span>
        </div>
      )}
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
 * Role-Specific Stats Grid
 */
const RoleSpecificStatsGrid: React.FC<{
  stats: PlayerPerformanceStats;
  role: 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';
}> = ({ stats, role }) => {
  if (role === 'Batter') {
    return <BatterStatsGrid stats={stats} />;
  }
  if (role === 'Bowler') {
    return <BowlerStatsGrid stats={stats} />;
  }
  if (role === 'All-Rounder') {
    return <AllRounderStatsGrid stats={stats} />;
  }
  return <WicketkeeperStatsGrid stats={stats} />;
};

/**
 * Batter: Matches, Innings, Runs, Average, Strike Rate, 4s, 6s
 * Unsupported fields display '—' (never zero)
 */
const BatterStatsGrid: React.FC<{ stats: PlayerPerformanceStats }> = ({ stats }) => {
  const avg = stats.batting_average !== undefined && stats.batting_average > 0 ? stats.batting_average.toFixed(2) : '—';
  const sr = stats.strike_rate !== undefined && stats.strike_rate > 0 ? stats.strike_rate.toFixed(2) : '—';
  const hs = stats.highest_score !== undefined && stats.highest_score !== null ? String(stats.highest_score) : '—';
  const hundreds = stats.hundreds !== undefined && stats.hundreds !== null ? stats.hundreds : '—';
  const fifties = stats.fifties !== undefined && stats.fifties !== null ? stats.fifties : '—';
  const notOuts = stats.not_outs !== undefined && stats.not_outs !== null ? stats.not_outs : '—';
  const fours = stats.fours !== undefined && stats.fours !== null ? stats.fours : '—';
  const sixes = stats.sixes !== undefined && stats.sixes !== null ? stats.sixes : '—';

  return (
    <div className="space-y-1.5 w-full">
      {/* Primary Row: Matches, Innings, Runs, HS, Avg, SR */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 text-center">
        <StatTile label="Matches" value={stats.matches} />
        <StatTile label="Innings" value={stats.innings ?? stats.matches} />
        <StatTile label="Runs" value={stats.runs?.toLocaleString('en-IN') ?? 0} highlight="flare" />
        <StatTile label="BEST (HS)" value={hs} />
        <StatTile label="Average" value={avg} />
        <StatTile label="Strike Rate" value={sr} highlight="turf" />
      </div>

      {/* Secondary Row: 4s, 6s (CSV fields) + 100s, 50s, NO ('—' if missing) */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
        <StatPill label="4s" value={fours} highlight="flare" />
        <StatPill label="6s" value={sixes} highlight="flare" />
        <StatPill label="100s" value={hundreds} />
        <StatPill label="50s" value={fifties} />
        <StatPill label="NO" value={notOuts} />
      </div>
    </div>
  );
};

/**
 * Bowler: Matches, Bowling Innings, Overs, Balls, Runs Conceded, Wickets, Economy
 * Unsupported fields display '—' (never zero)
 */
const BowlerStatsGrid: React.FC<{ stats: PlayerPerformanceStats }> = ({ stats }) => {
  const econ = stats.economy_rate !== undefined && stats.economy_rate > 0 ? stats.economy_rate.toFixed(2) : '—';
  const avg = stats.bowling_average !== undefined && stats.bowling_average > 0 ? stats.bowling_average.toFixed(2) : '—';
  const sr = stats.bowling_strike_rate !== undefined && stats.bowling_strike_rate > 0 ? stats.bowling_strike_rate.toFixed(1) : '—';
  const best = stats.best_bowling || '—';
  const maidens = stats.maidens !== undefined && stats.maidens !== null ? stats.maidens : '—';
  const fourW = stats.four_wickets !== undefined && stats.four_wickets !== null ? stats.four_wickets : '—';
  const fiveW = stats.five_wickets !== undefined && stats.five_wickets !== null ? stats.five_wickets : '—';
  const balls = stats.balls !== undefined && stats.balls !== null ? stats.balls : '—';
  const runsConceded = stats.runs_conceded !== undefined && stats.runs_conceded !== null ? stats.runs_conceded : '—';

  return (
    <div className="space-y-1.5 w-full">
      {/* Primary Row: Matches, B-Innings, Overs, Wickets, Economy, Runs Conceded */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 text-center">
        <StatTile label="Matches" value={stats.matches} />
        <StatTile label="B-Innings" value={stats.bowling_innings ?? stats.matches} />
        <StatTile label="Overs" value={stats.overs ?? '—'} />
        <StatTile label="Wickets" value={stats.wickets ?? 0} highlight="flare" />
        <StatTile label="Economy" value={econ} highlight="turf" />
        <StatTile label="Runs Given" value={runsConceded} />
      </div>

      {/* Secondary Row: Balls, BEST, Maidens, 4w, 5w ('—' if missing) */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
        <StatPill label="Balls" value={balls} />
        <StatPill label="BEST" value={best} />
        <StatPill label="Mdns" value={maidens} />
        <StatPill label="4w" value={fourW} />
        <StatPill label="5w" value={fiveW} />
      </div>
    </div>
  );
};

/**
 * All-Rounder: Both Batting and Bowling Sections from CSV datasets
 */
const AllRounderStatsGrid: React.FC<{ stats: PlayerPerformanceStats }> = ({ stats }) => {
  const batAvg = stats.batting_average !== undefined && stats.batting_average > 0 ? stats.batting_average.toFixed(2) : '—';
  const batSr = stats.strike_rate !== undefined && stats.strike_rate > 0 ? stats.strike_rate.toFixed(2) : '—';
  const econ = stats.economy_rate !== undefined && stats.economy_rate > 0 ? stats.economy_rate.toFixed(2) : '—';
  const fours = stats.fours !== undefined && stats.fours !== null ? stats.fours : '—';
  const sixes = stats.sixes !== undefined && stats.sixes !== null ? stats.sixes : '—';
  const runsConceded = stats.runs_conceded !== undefined && stats.runs_conceded !== null ? stats.runs_conceded : '—';

  return (
    <div className="space-y-1.5 w-full">
      {/* Batting Section */}
      <div className="grid grid-cols-6 gap-1 sm:gap-1.5 text-center">
        <StatTile label="Matches" value={stats.matches} />
        <StatTile label="Runs" value={stats.runs?.toLocaleString('en-IN') ?? 0} highlight="flare" />
        <StatTile label="Bat Avg" value={batAvg} />
        <StatTile label="Bat SR" value={batSr} highlight="turf" />
        <StatTile label="4s" value={fours} />
        <StatTile label="6s" value={sixes} />
      </div>

      {/* Bowling Section */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
        <StatPill label="Wickets" value={stats.wickets ?? 0} highlight="flare" />
        <StatPill label="Economy" value={econ} highlight="turf" />
        <StatPill label="Overs" value={stats.overs ?? '—'} />
        <StatPill label="Balls" value={stats.balls ?? '—'} />
        <StatPill label="Runs Given" value={runsConceded} />
      </div>
    </div>
  );
};

/**
 * Wicketkeeper: Batting metrics + Dismissals presentation
 */
const WicketkeeperStatsGrid: React.FC<{ stats: PlayerPerformanceStats }> = ({ stats }) => {
  const avg = stats.batting_average !== undefined && stats.batting_average > 0 ? stats.batting_average.toFixed(2) : '—';
  const sr = stats.strike_rate !== undefined && stats.strike_rate > 0 ? stats.strike_rate.toFixed(2) : '—';
  const fours = stats.fours !== undefined && stats.fours !== null ? stats.fours : '—';
  const sixes = stats.sixes !== undefined && stats.sixes !== null ? stats.sixes : '—';
  const catches = stats.catches !== undefined && stats.catches !== null ? stats.catches : '—';
  const stumpings = stats.stumpings !== undefined && stats.stumpings !== null ? stats.stumpings : '—';
  const dismissals = stats.dismissals !== undefined && stats.dismissals !== null ? stats.dismissals : '—';

  return (
    <div className="space-y-1.5 w-full">
      {/* Batting Section */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center">
        <StatTile label="Matches" value={stats.matches} />
        <StatTile label="Innings" value={stats.innings ?? stats.matches} />
        <StatTile label="Runs" value={stats.runs?.toLocaleString('en-IN') ?? 0} highlight="flare" />
        <StatTile label="Average" value={avg} />
        <StatTile label="Strike Rate" value={sr} highlight="turf" />
      </div>

      {/* Secondary Row: 4s, 6s + Keeping Dismissals */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
        <StatPill label="4s" value={fours} highlight="flare" />
        <StatPill label="6s" value={sixes} highlight="flare" />
        <StatPill label="Catches" value={catches} />
        <StatPill label="Stumpings" value={stumpings} />
        <StatPill label="Dismissals" value={dismissals} />
      </div>
    </div>
  );
};

/**
 * Individual Stat Tile (Card)
 */
const StatTile: React.FC<{
  label: string;
  value: string | number;
  highlight?: 'flare' | 'turf';
}> = ({ label, value, highlight }) => {
  const colorClass =
    highlight === 'flare'
      ? 'text-flare'
      : highlight === 'turf'
      ? 'text-turf'
      : 'text-floodlight';

  return (
    <div className="bg-night-raised/70 rounded-lg p-1.5 sm:p-2 border border-night-border/40 flex flex-col justify-center min-w-0">
      <div className="text-[8px] sm:text-[9px] text-floodlight-muted uppercase font-bold truncate">
        {label}
      </div>
      <div className={`font-display text-xs sm:text-sm font-black tabular-nums truncate ${colorClass}`}>
        {value}
      </div>
    </div>
  );
};

/**
 * Compact Stat Pill
 */
const StatPill: React.FC<{
  label: string;
  value: string | number;
  highlight?: 'flare' | 'turf';
}> = ({ label, value, highlight }) => {
  const colorClass =
    highlight === 'flare'
      ? 'text-flare'
      : highlight === 'turf'
      ? 'text-turf'
      : 'text-floodlight';

  return (
    <div className="flex flex-col items-center justify-center min-w-0 py-0.5">
      <span className="text-[8px] text-floodlight-subtle uppercase font-bold truncate">
        {label}
      </span>
      <span className={`font-display text-[11px] sm:text-xs font-black tabular-nums truncate ${colorClass}`}>
        {value}
      </span>
    </div>
  );
};
