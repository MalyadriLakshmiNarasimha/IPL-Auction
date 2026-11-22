'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRight, Trophy, Zap, Radio, Sparkles } from 'lucide-react';
import { OFFICIAL_IPL_FRANCHISES } from '@/shared/constants';
import { PKL_FRANCHISES } from '@/shared/pkl-player-data';

interface SportsSelectionSectionProps {
  iplPlayerCount: number;
  pklPlayerCount: number;
  onEnterArena: (sport: 'IPL' | 'PKL') => void;
}

export const SportsSelectionSection: React.FC<SportsSelectionSectionProps> = ({
  iplPlayerCount = 274,
  pklPlayerCount = 180,
  onEnterArena,
}) => {
  return (
    <section id="arenas" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-14">
      
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-flare/30 bg-flare/10 px-3 py-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-[.2em] text-flare mb-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multi-Sport Platform</span>
        </div>
        <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-floodlight">
          CHOOSE YOUR ARENA
        </h2>
        <p className="text-[13px] sm:text-sm text-floodlight-muted mt-1.5 max-w-lg mx-auto leading-relaxed">
          Select between India&apos;s two marquee sporting leagues. Experience custom auction mechanics, genuine franchise rosters, and dedicated purse models.
        </p>
      </div>

      {/* Two-Column League Cards Grid (Matching Reference Design) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* ========================================================
            CARD 1: IPL AUCTION CARD (Black + Gold Identity)
           ======================================================== */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onEnterArena('IPL')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEnterArena('IPL');
            }
          }}
          className="group relative rounded-2xl sm:rounded-[24px] border border-amber-500/40 hover:border-amber-400 bg-[#0E0E12] p-4 sm:p-5 lg:p-6 shadow-[0_15px_45px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(245,158,11,0.22)] transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          {/* Card Background Stadium Image with Dark Overlay */}
          <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none select-none">
            <Image
              src="/images/card-bg-cricket.jpg"
              alt="Cricket stadium background"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover opacity-20 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C0D10]/95 via-[#0C0D10]/85 to-[#0C0D10]/90" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div>
            {/* Main Row: Trophy on Left, Details in Center, Circular Action Arrow on Right */}
            <div className="flex items-center gap-3.5 sm:gap-5">
              
              {/* Left: Trophy Image with Soft Gold Glow */}
              <div className="relative shrink-0 w-16 sm:w-24 lg:w-28 h-20 sm:h-32 lg:h-36 flex items-center justify-center">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
                <Image
                  src="/images/trophy-ipl.png"
                  alt="IPL Championship Trophy"
                  fill
                  sizes="(max-width: 640px) 64px, 112px"
                  className="object-contain filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Middle: Brand Badge, Title, Subtitle, Stats */}
              <div className="flex-1 min-w-0">
                
                {/* Styled Badge */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/40 bg-amber-400/10 text-amber-300 text-[10px] sm:text-xs font-black tracking-widest uppercase">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>TATA IPL</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display text-xl sm:text-3xl lg:text-4xl font-black text-floodlight tracking-tight group-hover:text-amber-100 transition-colors">
                  IPL AUCTION
                </h3>
                
                {/* Subtitle */}
                <p className="text-[12px] sm:text-sm font-semibold text-flare mt-0.5">
                  Cricket • Build Your Dream XI
                </p>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2.5 pt-2.5 border-t border-white/10 text-center">
                  <div className="rounded-lg bg-white/[0.03] p-1 sm:p-1.5 border border-white/5">
                    <div className="font-display text-sm sm:text-base font-black text-amber-300">
                      {OFFICIAL_IPL_FRANCHISES.length}
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-floodlight-subtle">
                      Franchises
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/[0.03] p-1 sm:p-1.5 border border-white/5">
                    <div className="font-display text-sm sm:text-base font-black text-floodlight">
                      {iplPlayerCount}+
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-floodlight-subtle">
                      Players
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/[0.03] p-1 sm:p-1.5 border border-white/5">
                    <div className="font-display text-sm sm:text-base font-black text-floodlight flex items-center justify-center gap-1">
                      <Radio className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-amber-400 animate-pulse" />
                      <span>Live</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-floodlight-subtle">
                      Auction
                    </div>
                  </div>
                </div>

              </div>

              {/* Right: Circular Action Arrow Button */}
              <div className="shrink-0 self-center">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-[#D6B65D] to-[#E8C66A] text-[#17130A] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:translate-x-1 transition-all">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ========================================================
            CARD 2: PKL AUCTION CARD (Black + Purple Identity)
           ======================================================== */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onEnterArena('PKL')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEnterArena('PKL');
            }
          }}
          className="group relative rounded-2xl sm:rounded-[24px] border border-purple-500/40 hover:border-purple-400 bg-[#0E0E12] p-4 sm:p-5 lg:p-6 shadow-[0_15px_45px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(168,85,247,0.22)] transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden focus:outline-none focus:ring-2 focus:ring-purple-400/50"
        >
          {/* Card Background Arena Image with Dark Overlay */}
          <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none select-none">
            <Image
              src="/images/card-bg-kabaddi.jpg"
              alt="Kabaddi arena background"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover opacity-20 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C0D10]/95 via-[#0C0D10]/85 to-[#0C0D10]/90" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/12 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div>
            {/* Main Row: Trophy on Left, Details in Center, Circular Action Arrow on Right */}
            <div className="flex items-center gap-3.5 sm:gap-5">
              
              {/* Left: Trophy Image with Soft Purple Glow */}
              <div className="relative shrink-0 w-16 sm:w-24 lg:w-28 h-20 sm:h-32 lg:h-36 flex items-center justify-center">
                <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-xl pointer-events-none" />
                <Image
                  src="/images/trophy-pkl.png"
                  alt="PKL Championship Trophy"
                  fill
                  sizes="(max-width: 640px) 64px, 112px"
                  className="object-contain filter drop-shadow-[0_8px_16px_rgba(168,85,247,0.35)] group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Middle: Brand Badge, Title, Subtitle, Stats */}
              <div className="flex-1 min-w-0">
                
                {/* Styled Badge */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-purple-500/40 bg-purple-400/10 text-purple-300 text-[10px] sm:text-xs font-black tracking-widest uppercase">
                    <Zap className="w-3 h-3 text-purple-400" />
                    <span>PKL</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display text-xl sm:text-3xl lg:text-4xl font-black text-floodlight tracking-tight group-hover:text-purple-100 transition-colors">
                  PKL AUCTION
                </h3>
                
                {/* Subtitle */}
                <p className="text-[12px] sm:text-sm font-semibold text-purple-300 mt-0.5">
                  Kabaddi • Build Your Dream Seven
                </p>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2.5 pt-2.5 border-t border-white/10 text-center">
                  <div className="rounded-lg bg-white/[0.03] p-1 sm:p-1.5 border border-white/5">
                    <div className="font-display text-sm sm:text-base font-black text-purple-300">
                      {PKL_FRANCHISES.length}
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-floodlight-subtle">
                      Franchises
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/[0.03] p-1 sm:p-1.5 border border-white/5">
                    <div className="font-display text-sm sm:text-base font-black text-floodlight">
                      {Math.max(pklPlayerCount, 180)}+
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-floodlight-subtle">
                      Players
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/[0.03] p-1 sm:p-1.5 border border-white/5">
                    <div className="font-display text-sm sm:text-base font-black text-floodlight flex items-center justify-center gap-1">
                      <Radio className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-purple-400 animate-pulse" />
                      <span>Live</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-floodlight-subtle">
                      Auction
                    </div>
                  </div>
                </div>

              </div>

              {/* Right: Circular Action Arrow Button */}
              <div className="shrink-0 self-center">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:translate-x-1 transition-all">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
