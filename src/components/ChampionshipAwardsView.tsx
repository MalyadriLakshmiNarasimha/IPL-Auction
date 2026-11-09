'use client';

import React from 'react';
import { Award as AwardType } from '@/shared/types';
import {
  Trophy,
  Zap,
  Shield,
  Scale,
  Briefcase,
  ArrowLeftRight,
  Flame,
  Award,
  Crown,
} from 'lucide-react';

interface ChampionshipAwardsViewProps {
  awards: AwardType[];
}

export const ChampionshipAwardsView: React.FC<ChampionshipAwardsViewProps> = ({ awards }) => {
  const getAwardIcon = (id: string) => {
    switch (id) {
      case 'award-champion':
        return <Crown className="w-6 h-6 text-amber-400" />;
      case 'award-batting':
        return <Zap className="w-6 h-6 text-orange-400" />;
      case 'award-bowling':
        return <Shield className="w-6 h-6 text-blue-400" />;
      case 'award-balanced':
        return <Scale className="w-6 h-6 text-purple-400" />;
      case 'award-manager':
        return <Briefcase className="w-6 h-6 text-turf" />;
      case 'award-trading':
        return <ArrowLeftRight className="w-6 h-6 text-cyan-400" />;
      case 'award-playing-xi':
        return <Flame className="w-6 h-6 text-flare" />;
      default:
        return <Award className="w-6 h-6 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-floodlight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-flare" />
            IPL 2026 OFFICIAL CHAMPIONSHIP HONORS
          </h2>
          <p className="text-xs text-floodlight-muted">
            Recognizing franchise excellence across all tactical, executive, and matchday disciplines.
          </p>
        </div>
        <span className="px-3 py-1 rounded-pill bg-flare/20 text-flare text-xs font-bold font-mono">
          7 Certified Laurels
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {awards.map((award, idx) => {
          const isGrandChampion = award.id === 'award-champion';
          return (
            <div
              key={award.id || idx}
              className={`p-5 rounded-card border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                isGrandChampion
                  ? 'md:col-span-2 lg:col-span-3 bg-gradient-to-r from-amber-500/20 via-night to-night-raised border-amber-400/50 shadow-2xl shadow-amber-500/10'
                  : 'bg-night rounded-card border-night-border hover:border-flare/40'
              }`}
            >
              {isGrandChampion && (
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-night-raised border border-night-border inline-block">
                    {getAwardIcon(award.id)}
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-night-raised border border-night-border">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: award.franchise_color }}
                    />
                    <span className="font-mono font-black text-xs text-floodlight">
                      {award.franchise_short_code}
                    </span>
                  </div>
                </div>

                <h3
                  className={`font-display font-black text-floodlight ${
                    isGrandChampion ? 'text-xl sm:text-2xl text-amber-400' : 'text-base'
                  }`}
                >
                  {award.title}
                </h3>
                <p className="text-xs text-floodlight-muted mt-1 leading-relaxed">
                  {award.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-night-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-floodlight-subtle uppercase block font-bold">
                    Conferred To
                  </span>
                  <span className="font-bold text-floodlight text-sm">{award.winner_name}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-floodlight-subtle uppercase block font-bold">
                    Honors Highlight
                  </span>
                  <span className="font-mono font-bold text-flare">{award.value_highlight}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

