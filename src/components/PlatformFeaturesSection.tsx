'use client';

import React from 'react';
import { Radio, Wallet, Users, BarChart3, Trophy, Sparkles } from 'lucide-react';

interface FeatureItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  mobileTitle: string;
  description: string;
  accent: 'amber' | 'purple';
}

const FEATURES: FeatureItem[] = [
  {
    id: 'live-auction',
    icon: Radio,
    title: 'Live Auction Room',
    mobileTitle: 'Live Auction',
    description: 'Real-time multiplayer bidding with friends',
    accent: 'amber',
  },
  {
    id: 'smart-purse',
    icon: Wallet,
    title: 'Smart Purse Management',
    mobileTitle: 'Smart Purse',
    description: 'Track and plan your spending & slots',
    accent: 'amber',
  },
  {
    id: 'squad-analyzer',
    icon: Users,
    title: 'Squad Composition Analyzer',
    mobileTitle: 'Squad Analyzer',
    description: 'Build a balanced and winning squad',
    accent: 'amber',
  },
  {
    id: 'live-scorecards',
    icon: BarChart3,
    title: 'Live Scorecards',
    mobileTitle: 'Live Scorecards',
    description: 'Team composition & remaining purse',
    accent: 'amber',
  },
  {
    id: 'leaderboard',
    icon: Trophy,
    title: 'Manager Leaderboard',
    mobileTitle: 'Leaderboard',
    description: 'Compete with friends and top managers',
    accent: 'amber',
  },
];

export const PlatformFeaturesSection: React.FC = () => {
  return (
    <section id="features" className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-flare/30 bg-flare/10 text-flare text-[10px] sm:text-xs font-bold uppercase tracking-[.22em] mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Advanced Engine</span>
        </div>
        <h3 className="font-display text-xl sm:text-3xl font-black text-floodlight uppercase tracking-tight">
          MORE THAN JUST BIDDING
        </h3>
      </div>

      {/* Desktop & Tablet: Single Horizontal Strip (Matching Reference Image) */}
      <div className="hidden sm:block rounded-[20px] sm:rounded-[24px] border border-white/10 bg-[#0F1013]/90 backdrop-blur-md p-3.5 sm:p-5 lg:p-6 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {FEATURES.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3.5 px-3 py-2.5 sm:py-2 ${
                  index === 0 ? 'pl-2' : ''
                } ${index === FEATURES.length - 1 ? 'pr-2' : ''}`}
              >
                {/* Icon Container */}
                <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>

                {/* Text Content */}
                <div className="min-w-0">
                  <h4 className="font-display text-xs lg:text-sm font-black text-floodlight truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-floodlight-muted mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: 4-Column Feature Shortcuts Grid (Matching Reference Mobile Screen) */}
      <div className="sm:hidden grid grid-cols-4 gap-2">
        {FEATURES.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col items-center justify-center text-center p-2.5 rounded-xl border border-white/10 bg-[#101114]/90 backdrop-blur-sm"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-1.5">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-floodlight leading-tight">
                {item.mobileTitle}
              </span>
            </div>
          );
        })}
      </div>

    </section>
  );
};
