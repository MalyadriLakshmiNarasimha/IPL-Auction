'use client';

import React, { useState } from 'react';
import { Player } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { X, Flame, Activity, ShieldCheck, User } from 'lucide-react';
import { PlayerPortrait } from './PlayerPortrait';

interface PlayerDossierModalProps {
  player: Player;
  onClose: () => void;
}

export const PlayerDossierModal: React.FC<PlayerDossierModalProps> = ({ player, onClose }) => {
  const stats = player.stats_2026;

  const roleColor = (() => {
    const r = (player.role || '').toUpperCase();
    if (r.startsWith('BAT')) return '#F5B83D';
    if (r.startsWith('BOWL')) return '#4C8DFF';
    if (r.startsWith('ALL') || r === 'AR') return '#2FCB8F';
    if (r.startsWith('WICKET') || r === 'WK') return '#A56BFF';
    return '#FF7A1A';
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0D0E11] border border-night-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Strip with Team Accent */}
        <div
          className="p-4 sm:p-5 flex items-center justify-between border-b border-night-border relative"
          style={{ background: `linear-gradient(135deg, ${roleColor}22 0%, #101114 100%)` }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-16 sm:w-20 flex-shrink-0">
              <PlayerPortrait player={player} aspectRatio="4/5" showBadge={false} />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white"
                  style={{ backgroundColor: roleColor }}
                >
                  {player.role}
                </span>
                <span className="text-[11px] font-bold text-flare uppercase tracking-wider">
                  {player.category || 'IPL Talent'}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    player.has_photo
                      ? 'bg-turf/10 text-turf border-turf/30'
                      : 'bg-night-border/80 text-floodlight-muted border-night-border'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {player.has_photo ? 'Official Headshot' : 'Card Placeholder'}
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-floodlight truncate mt-1">
                {player.name}
              </h2>
              {player.photo_source && (
                <div className="text-[10px] text-floodlight-subtle truncate mt-0.5">
                  {player.photo_source}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-night-raised hover:bg-night-border text-floodlight-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-floodlight-muted">
          {/* Quick Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-night-raised border border-night-border">
              <div className="text-[10px] text-floodlight-muted font-bold uppercase">Nationality</div>
              <div className="font-bold text-sm text-floodlight mt-0.5">{player.country}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-night-raised border border-night-border">
              <div className="text-[10px] text-floodlight-muted font-bold uppercase">Base Price</div>
              <div className="font-display font-black text-sm text-flare mt-0.5">{formatCurrency(player.base_price)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-night-raised border border-night-border">
              <div className="text-[10px] text-floodlight-muted font-bold uppercase">Status</div>
              <div className="font-bold text-sm text-turf mt-0.5">{player.capped ? 'Capped International' : 'Uncapped'}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-night-raised border border-night-border">
              <div className="text-[10px] text-floodlight-muted font-bold uppercase">Batting Style</div>
              <div className="font-bold text-sm text-floodlight mt-0.5 truncate">{player.batting_style || 'Right Handed'}</div>
            </div>
          </div>

          {/* Batting & Bowling Styles */}
          <div className="rounded-xl bg-night p-3.5 border border-night-border flex flex-col sm:flex-row justify-between gap-3">
            <div>
              <span className="text-[10px] text-floodlight-muted uppercase font-bold block">Batting Style</span>
              <span className="font-bold text-sm text-floodlight">{player.batting_style || 'Right Handed Bat'}</span>
            </div>
            <div>
              <span className="text-[10px] text-floodlight-muted uppercase font-bold block">Bowling Specialization</span>
              <span className="font-bold text-sm text-floodlight">{player.bowling_style || 'None / Part-Time'}</span>
            </div>
            <div>
              <span className="text-[10px] text-floodlight-muted uppercase font-bold block">Registered IPL Franchise</span>
              <span className="font-bold text-sm text-flare">{player.team || 'Auction Central Pool'}</span>
            </div>
          </div>

          {/* Verified Cricket Performance Metrics */}
          {stats && (
            <div className="rounded-xl bg-night p-4 border border-night-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-night-border pb-2 gap-1">
                <span className="font-bold text-sm text-floodlight flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-flare" />
                  {stats.stat_label || (stats.verification_status === 'verified' ? 'Verified Official IPL Record' : 'IPL Performance')}
                </span>
                <span className="text-[10px] text-floodlight-subtle">
                  Source: {stats.source} · Verified: {stats.last_updated}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Matches / Innings</div>
                  <div className="font-display font-bold text-sm text-floodlight">{stats.matches} / {stats.innings}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Total Runs</div>
                  <div className="font-display font-bold text-sm text-flare">{stats.runs || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Highest Score</div>
                  <div className="font-display font-bold text-sm text-floodlight">{stats.highest_score || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Strike Rate</div>
                  <div className="font-display font-bold text-sm text-turf">{stats.strike_rate || 0}</div>
                </div>

                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">50s / 100s</div>
                  <div className="font-display font-bold text-sm text-floodlight">{stats.fifties || 0} / {stats.hundreds || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Fours / Sixes</div>
                  <div className="font-display font-bold text-sm text-floodlight">{stats.fours || 0} / {stats.sixes || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Wickets Taken</div>
                  <div className="font-display font-bold text-sm text-flare">{stats.wickets || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Economy Rate</div>
                  <div className="font-display font-bold text-sm text-turf">{stats.economy_rate || 0}</div>
                </div>

                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Best Bowling</div>
                  <div className="font-display font-bold text-sm text-floodlight">{stats.best_bowling || '0/0'}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Bowling Average</div>
                  <div className="font-display font-bold text-sm text-floodlight">{stats.bowling_average || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Dot Balls / Maidens</div>
                  <div className="font-display font-bold text-sm text-floodlight">{stats.dot_balls || 0} / {stats.maidens || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
                  <div className="text-[10px] uppercase font-bold text-floodlight-muted">Fielding Dismissals</div>
                  <div className="font-display font-bold text-sm text-floodlight">{(stats.catches || 0) + (stats.stumpings || 0)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Strategic Scouting Assessment */}
          <div className="rounded-xl bg-night-raised p-4 border border-night-border space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider text-floodlight flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-turf" />
              Scouting Assessment & Squad Fit
            </span>
            <p className="leading-relaxed text-floodlight-muted">
              {player.name} provides high strategic utility as an auction asset. With established domestic and international
              match experience, this player bolsters squad depth and tactical flexibility. In competitive auction environments,
              securing this profile provides immediate balance to the team roster.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-night border-t border-night-border flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-flare hover:bg-flare-hover text-night-bg font-black text-xs shadow-md transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
