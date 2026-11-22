'use client';

import React from 'react';
import { ArrowRight, Trophy, Zap, Shield, Sparkles } from 'lucide-react';

interface FinalCtaSectionProps {
  onCreateRoom: (sport?: 'IPL' | 'PKL') => void;
  onJoinRoom: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onCreateRoom, onJoinRoom }) => {
  return (
    <section className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[28px] border border-white/15 bg-gradient-to-br from-[#1B1914] via-[#131217] to-[#0D0A14] p-5 sm:p-10 lg:p-14 shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        
        {/* Subtle Dual-League Stadium Lighting */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-500/[0.12] blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-600/[0.15] blur-[90px] pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 sm:gap-10">
          
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[.22em] text-flare mb-3.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>THE GAVEL IS WAITING</span>
            </div>

            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[0.95] text-floodlight tracking-tight">
              READY FOR <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-purple-300 bg-clip-text text-transparent italic pe-3 inline-block">
                AUCTION NIGHT?
              </span>
            </h2>

            <p className="text-sm sm:text-base text-floodlight-muted mt-4 sm:mt-5 leading-relaxed max-w-xl">
              Choose your league. Create a room. Invite your friends. Start bidding.
            </p>

            <div className="flex items-center gap-4 mt-6 text-xs text-floodlight-subtle">
              <span className="flex items-center gap-1.5 font-medium">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> IPL Cricket
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-purple-400" /> PKL Kabaddi
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-turf" /> Virtual Currency
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={() => onCreateRoom()}
              className="min-h-14 px-8 rounded-full bg-gradient-to-r from-[#D6B65D] via-[#E8C66A] to-[#D6B65D] hover:opacity-95 text-[#17130A] font-extrabold text-sm sm:text-base shadow-flare flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <span>Create a Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onJoinRoom}
              className="min-h-14 px-8 rounded-full border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-floodlight font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              <span>Join with Code</span>
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
