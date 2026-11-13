'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, IplCareerStats, IplSeasonStats, PlayerPerformanceStats } from '../shared/types';
import { getIplCareerStats, getIplSeasonStats } from '../shared/player-career-data';
import { Flame, Calendar, Award } from 'lucide-react';

export type StatView = 'career' | 'season_2026';

interface PlayerStatsCarouselProps {
  player: Player;
  initialView?: StatView;
  autoRotateInterval?: number; // ms, default 5000
  className?: string;
}

function getRoleCategory(role?: string): 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper' {
  const r = (role || '').toUpperCase();
  if (r.startsWith('WICKET') || r === 'WK') return 'Wicketkeeper';
  if (r.startsWith('ALL') || r === 'AR') return 'All-Rounder';
  if (r.startsWith('BOWL')) return 'Bowler';
  return 'Batter';
}

export const PlayerStatsCarousel: React.FC<PlayerStatsCarouselProps> = ({
  player,
  initialView = 'career',
  autoRotateInterval = 5000,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<StatView>(initialView);
  const [direction, setDirection] = useState<number>(1);
  const [manualCycle, setManualCycle] = useState<number>(0);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);

  // Retrieve authoritative datasets
  const careerStats: IplCareerStats = player.ipl_career_stats || getIplCareerStats(player);
  const seasonStats: IplSeasonStats = player.season_2026_stats || getIplSeasonStats(player);
  const roleCategory = getRoleCategory(player.role);

  // Reset to Career view whenever a new player is loaded
  useEffect(() => {
    setActiveView('career');
    setDirection(1);
  }, [player.id]);

  // Handle document visibility change (pause when tab is hidden)
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 5-second automatic rotation loop
  useEffect(() => {
    if (isTabHidden || autoRotateInterval <= 0) return;

    const timer = setInterval(() => {
      setActiveView((current) => {
        const next: StatView = current === 'career' ? 'season_2026' : 'career';
        setDirection(next === 'season_2026' ? 1 : -1);
        return next;
      });
    }, autoRotateInterval);

    return () => clearInterval(timer);
  }, [player.id, manualCycle, isTabHidden, autoRotateInterval]);

  const handleSelectView = (view: StatView) => {
    if (view === activeView) return;
    setDirection(view === 'season_2026' ? 1 : -1);
    setActiveView(view);
    setManualCycle((c) => c + 1); // Resets the 5-second timer and resumes auto-rotation
  };

  const isCareer = activeView === 'career';
  const currentStats: PlayerPerformanceStats = isCareer ? careerStats : seasonStats;

  // Slide animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 380, damping: 32 },
        opacity: { duration: 0.22 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 380, damping: 32 },
        opacity: { duration: 0.18 },
      },
    }),
  };

  return (
    <div
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
              careerStats.has_stats && careerStats.has_ipl_career && careerStats.matches > 0 ? (
                <RoleSpecificStatsGrid stats={careerStats} role={roleCategory} />
              ) : (
                <UnavailableStatsState
                  title="Statistics unavailable (IPL Debutant)"
                  subtitle="Uncapped / Yet to make IPL debut — Historical statistics not applicable"
                />
              )
            ) : seasonStats.has_stats && seasonStats.has_season_stats && seasonStats.matches > 0 ? (
              <RoleSpecificStatsGrid stats={seasonStats} role={roleCategory} />
            ) : (
              <UnavailableStatsState
                title={
                  careerStats.has_ipl_career && careerStats.matches > 0
                    ? 'Statistics unavailable (No appearances in IPL 2026)'
                    : 'Statistics unavailable (IPL Debutant)'
                }
                subtitle={
                  careerStats.has_ipl_career && careerStats.matches > 0
                    ? 'Did not participate in IPL 2026 matches'
                    : 'Uncapped / Yet to make IPL debut — Historical statistics not applicable'
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
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
 * Batter: Matches, Innings, Runs, HS (BEST), Avg, SR, 100s, 50s, 4s, 6s, Not Outs
 */
const BatterStatsGrid: React.FC<{ stats: PlayerPerformanceStats }> = ({ stats }) => {
  const avg = stats.batting_average && stats.batting_average > 0 ? stats.batting_average.toFixed(2) : '—';
  const sr = stats.strike_rate && stats.strike_rate > 0 ? stats.strike_rate.toFixed(2) : '—';
  const hs = stats.highest_score !== undefined && stats.highest_score !== null ? stats.highest_score : '—';

  return (
    <div className="space-y-1.5 w-full">
      {/* Primary Row: Matches, Innings, Runs, HS, Avg, SR */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 text-center">
        <StatTile label="Matches" value={stats.matches} />
        <StatTile label="Innings" value={stats.innings ?? stats.matches} />
        <StatTile label="Runs" value={stats.runs?.toLocaleString('en-IN') ?? 0} highlight="flare" />
        <StatTile label="BEST (HS)" value={hs} highlight="flare" />
        <StatTile label="Average" value={avg} />
        <StatTile label="Strike Rate" value={sr} highlight="turf" />
      </div>

      {/* Secondary Row: 100s, 50s, 4s, 6s, Not Outs */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
        <StatPill label="100s" value={stats.hundreds ?? 0} />
        <StatPill label="50s" value={stats.fifties ?? 0} />
        <StatPill label="4s" value={stats.fours ?? 0} />
        <StatPill label="6s" value={stats.sixes ?? 0} />
        <StatPill label="NO" value={stats.not_outs ?? 0} />
      </div>
    </div>
  );
};

/**
 * Bowler: Matches, Innings, Overs, Wickets, BEST (Mandatory), Econ, Avg, SR, 4w, 5w, Maidens
 */
const BowlerStatsGrid: React.FC<{ stats: PlayerPerformanceStats }> = ({ stats }) => {
  const econ = stats.economy_rate && stats.economy_rate > 0 ? stats.economy_rate.toFixed(2) : '—';
  const avg = stats.bowling_average && stats.bowling_average > 0 ? stats.bowling_average.toFixed(2) : '—';
  const sr = stats.bowling_strike_rate && stats.bowling_strike_rate > 0 ? stats.bowling_strike_rate.toFixed(1) : '—';
  const best = stats.best_bowling || '—';

  return (
    <div className="space-y-1.5 w-full">
      {/* Primary Row: Matches, Bowling Innings, Overs, Wickets, BEST, Economy */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 text-center">
        <StatTile label="Matches" value={stats.matches} />
        <StatTile label="B-Innings" value={stats.bowling_innings ?? stats.matches} />
        <StatTile label="Overs" value={stats.overs ?? '—'} />
        <StatTile label="Wickets" value={stats.wickets ?? 0} highlight="flare" />
        <StatTile label="BEST" value={best} highlight="flare" />
        <StatTile label="Economy" value={econ} highlight="turf" />
      </div>

      {/* Secondary Row: Bowling Avg, Strike Rate, 4w, 5w, Maidens */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
        <StatPill label="B-Avg" value={avg} />
        <StatPill label="B-SR" value={sr} />
        <StatPill label="4w" value={stats.four_wickets ?? 0} />
        <StatPill label="5w" value={stats.five_wickets ?? 0} />
        <StatPill label="Mdns" value={stats.maidens ?? 0} />
      </div>
    </div>
  );
};

/**
 * All-Rounder: Both Batting and Bowling Sections + BEST bowling figures
 */
const AllRounderStatsGrid: React.FC<{ stats: PlayerPerformanceStats }> = ({ stats }) => {
  const batAvg = stats.batting_average && stats.batting_average > 0 ? stats.batting_average.toFixed(2) : '—';
  const batSr = stats.strike_rate && stats.strike_rate > 0 ? stats.strike_rate.toFixed(2) : '—';
  const hs = stats.highest_score !== undefined && stats.highest_score !== null ? stats.highest_score : '—';
  const econ = stats.economy_rate && stats.economy_rate > 0 ? stats.economy_rate.toFixed(2) : '—';
  const bowlAvg = stats.bowling_average && stats.bowling_average > 0 ? stats.bowling_average.toFixed(2) : '—';
  const best = stats.best_bowling || '—';

  return (
    <div className="space-y-1.5 w-full">
      {/* Batting Section */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center">
        <StatTile label="Matches" value={stats.matches} />
        <StatTile label="Runs" value={stats.runs?.toLocaleString('en-IN') ?? 0} highlight="flare" />
        <StatTile label="BEST (HS)" value={hs} />
        <StatTile label="Bat Avg" value={batAvg} />
        <StatTile label="Bat SR" value={batSr} highlight="turf" />
      </div>

      {/* Bowling Section */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
        <StatPill label="Wickets" value={stats.wickets ?? 0} highlight="flare" />
        <StatPill label="BEST" value={best} highlight="flare" />
        <StatPill label="Economy" value={econ} highlight="turf" />
        <StatPill label="Bowl Avg" value={bowlAvg} />
        <StatPill label="Overs" value={stats.overs ?? '—'} />
      </div>
    </div>
  );
};

/**
 * Wicketkeeper: Batting metrics + Catches, Stumpings, Total Dismissals
 */
const WicketkeeperStatsGrid: React.FC<{ stats: PlayerPerformanceStats }> = ({ stats }) => {
  const avg = stats.batting_average && stats.batting_average > 0 ? stats.batting_average.toFixed(2) : '—';
  const sr = stats.strike_rate && stats.strike_rate > 0 ? stats.strike_rate.toFixed(2) : '—';
  const hs = stats.highest_score !== undefined && stats.highest_score !== null ? stats.highest_score : '—';
  const catches = stats.catches ?? 0;
  const stumpings = stats.stumpings ?? 0;
  const dismissals = stats.dismissals ?? catches + stumpings;

  return (
    <div className="space-y-1.5 w-full">
      {/* Batting Section */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center">
        <StatTile label="Matches" value={stats.matches} />
        <StatTile label="Runs" value={stats.runs?.toLocaleString('en-IN') ?? 0} highlight="flare" />
        <StatTile label="BEST (HS)" value={hs} highlight="flare" />
        <StatTile label="Average" value={avg} />
        <StatTile label="Strike Rate" value={sr} highlight="turf" />
      </div>

      {/* Keeping / Dismissals Section */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-center bg-night-raised/40 p-1 rounded-lg border border-night-border/30">
        <StatPill label="Catches" value={catches} />
        <StatPill label="Stumpings" value={stumpings} />
        <StatPill label="Dismissals" value={dismissals} highlight="flare" />
        <StatPill label="100s / 50s" value={`${stats.hundreds ?? 0} / ${stats.fifties ?? 0}`} />
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
