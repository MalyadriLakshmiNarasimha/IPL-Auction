'use client';

import React, { useState } from 'react';
import { Player } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { CircularTimerRing } from './CircularTimerRing';
import { PlayerPortrait } from './PlayerPortrait';
import { Info, Sparkles, Flame, Zap } from 'lucide-react';
import { PlayerDossierModal } from './PlayerDossierModal';
import { PlayerStatsCarousel } from './PlayerStatsCarousel';
import { getIplCareerStats } from '@/shared/player-career-data';

interface PlayerSpotlightProps {
  player: Player | null;
  timerSeconds: number;
  timerEndsAt: number;
  serverTime: number;
  isPaused: boolean;
  passCount?: number;
  totalEligiblePassers?: number;
  onOpenDossier?: (player: Player) => void;
}

export const PlayerSpotlight: React.FC<PlayerSpotlightProps> = ({
  player,
  timerSeconds,
  timerEndsAt,
  serverTime,
  isPaused,
  passCount,
  totalEligiblePassers,
  onOpenDossier,
}) => {
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  if (!player) {
    return (
      <div className="scoreboard-panel rounded-2xl p-10 text-center text-floodlight-muted flex flex-col items-center justify-center min-h-[280px] border border-night-border/60">
        <div className="w-10 h-10 rounded-full border-2 border-flare/40 border-t-flare animate-spin mb-3" />
        <p className="text-sm font-semibold">Preparing next marquee player for auction...</p>
      </div>
    );
  }

  const roleColor = (() => {
    const r = (player.role || '').toUpperCase();
    if (r.startsWith('BAT')) return '#F5B83D';
    if (r.startsWith('BOWL')) return '#4C8DFF';
    if (r.startsWith('ALL') || r === 'AR') return '#2FCB8F';
    if (r.startsWith('WICKET') || r === 'WK') return '#A56BFF';
    return '#FF7A1A';
  })();

  const careerStats = player.ipl_career_stats || getIplCareerStats(player);

  return (
    <>
      <div className="scoreboard-panel rounded-2xl border border-night-border/80 p-3 sm:p-5 relative overflow-hidden flex flex-col gap-3 sm:gap-4 shadow-xl bg-night-card/90 backdrop-blur-md">
        {/* Spotlight Cone Glow Ambiance */}
        <div
          className="absolute -top-24 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: roleColor }}
        />
        <div className="absolute top-0 right-0 w-48 h-48 bg-flare/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: Role, Category & Dossier Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 z-10 border-b border-night-border/70 pb-2.5">
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-sm flex items-center gap-1"
              style={{ backgroundColor: roleColor }}
            >
              <Zap className="w-3 h-3" />
              {player.role}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-flare/15 text-flare border border-flare/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {player.category || 'IPL Marquee'}
            </span>
            {player.jersey_number && (
              <span className="px-2 py-0.5 rounded-full bg-night-raised border border-night-border text-[10px] font-bold text-floodlight-muted">
                #{player.jersey_number}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenDossier) onOpenDossier(player);
              else setIsDossierOpen(true);
            }}
            className="px-2.5 py-1 rounded-full bg-night-raised hover:bg-night-border border border-night-border text-[11px] font-bold text-flare flex items-center gap-1 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Player</span> Dossier
          </button>
        </div>

        {/* Player Main Details: 4:5 Portrait on Left + Profile & Timer on Right */}
        <div className="flex flex-row items-center gap-3 sm:gap-6 z-10">
          {/* Prominent 4:5 Portrait */}
          <div className="flex-shrink-0 w-28 xs:w-36 sm:w-44 md:w-52 group">
            <PlayerPortrait
              player={player}
              aspectRatio="4/5"
              priority={true}
              showBadge={false}
            />
          </div>

          {/* Profile Details & Prominent Timer */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              {/* Tags Row */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                <span className="text-xs text-floodlight font-semibold">
                  {player.country}
                </span>
                {player.home_state && player.home_state !== player.country && (
                  <span className="text-[11px] text-floodlight-muted hidden sm:inline">
                    · {player.home_state}
                  </span>
                )}
                {player.team_code && (
                  <span className="text-[10px] bg-night-border/80 px-2 py-0.5 rounded-full font-bold text-flare">
                    {player.team_code}
                  </span>
                )}
                <span className="text-[9px] sm:text-[10px] text-turf font-bold px-1.5 py-0.5 rounded bg-turf/10 border border-turf/20">
                  {player.capped ? 'Capped' : 'Uncapped'}
                </span>
              </div>

              {/* Player Name */}
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-floodlight tracking-tight truncate leading-tight">
                {player.name}
              </h2>

              {/* Style Subtitle */}
              <div className="text-[11px] sm:text-xs text-floodlight-muted flex items-center gap-1.5 mt-0.5 sm:mt-1 truncate">
                <span className="truncate">{player.batting_style || 'Right Handed'}</span>
                <span>·</span>
                <span className="truncate">{player.bowling_style || 'Right Arm Medium'}</span>
              </div>
            </div>

            {/* Base Price & Live Timer Row */}
            <div className="mt-3 pt-2.5 border-t border-night-border/60 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] sm:text-xs font-semibold text-floodlight-muted uppercase tracking-wider">
                  Base Price
                </div>
                <div className="font-display text-lg sm:text-2xl font-black text-flare tabular-nums">
                  {formatCurrency(player.base_price)}
                </div>
                {(totalEligiblePassers ?? 0) > 0 && (
                  <div
                    className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-night-border/40 border border-night-border w-fit text-[11px] font-mono"
                    title={`${passCount ?? 0} of ${totalEligiblePassers} managers passed`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${(passCount ?? 0) > 0 ? 'bg-amber-400 animate-pulse' : 'bg-floodlight-muted'}`} />
                    <span className="text-floodlight font-semibold">{passCount ?? 0}/{totalEligiblePassers}</span>
                    <span className="text-floodlight-muted text-[10px]">Passed</span>
                  </div>
                )}
              </div>

              {/* Prominent Circular Countdown Timer Ring */}
              <div className="flex-shrink-0">
                <CircularTimerRing
                  timerSeconds={timerSeconds}
                  timerEndsAt={timerEndsAt}
                  isPaused={isPaused}
                  size={76}
                  roleColor={roleColor}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dual Player Statistics System with Automatic 5-Second Rotation */}
        <PlayerStatsCarousel player={player} />
      </div>

      {isDossierOpen && (
        <PlayerDossierModal
          player={player}
          onClose={() => setIsDossierOpen(false)}
        />
      )}
    </>
  );
};
