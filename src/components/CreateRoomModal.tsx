'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, Trophy, Zap, Shield, Sparkles } from 'lucide-react';
import { SportType } from '@/shared/types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSport?: SportType;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  initialSport = 'IPL',
}) => {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<SportType>(initialSport);

  if (!isOpen) return null;

  const handleProceed = () => {
    onClose();
    router.push(`/create?sport=${selectedSport.toLowerCase()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#101113] p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient dual glows */}
        <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.22em] text-flare">Choose Your League</span>
            <h2 className="font-display text-2xl font-bold text-floodlight mt-0.5">SELECT AUCTION ARENA</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 flex items-center justify-center text-floodlight-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-floodlight-muted mt-3 leading-relaxed">
          Select which sporting league your auction room will host. Each league uses authentic franchises, real player pools, and dedicated auction rules.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6">
          {/* IPL Option */}
          <button
            type="button"
            onClick={() => setSelectedSport('IPL')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedSport === 'IPL'
                ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/15 to-[#16140E] shadow-[0_0_20px_rgba(214,182,93,0.18)]'
                : 'border-white/10 bg-[#16171A] hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                Cricket
              </span>
              <Trophy className={`w-4 h-4 ${selectedSport === 'IPL' ? 'text-amber-300' : 'text-floodlight-muted'}`} />
            </div>
            <h3 className="font-display text-xl font-bold text-floodlight">IPL AUCTION</h3>
            <div className="text-[11px] font-semibold text-amber-200/90 mt-0.5">Build Your Dream XI</div>
            <div className="text-[10px] text-floodlight-muted mt-2 space-y-0.5">
              <div>• 10 Official Franchises</div>
              <div>• 274 Verified Players</div>
              <div>• ₹100 Cr Purse</div>
            </div>
          </button>

          {/* PKL Option */}
          <button
            type="button"
            onClick={() => setSelectedSport('PKL')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedSport === 'PKL'
                ? 'border-purple-400/80 bg-gradient-to-b from-purple-500/15 to-[#16101E] shadow-[0_0_20px_rgba(168,85,247,0.22)]'
                : 'border-white/10 bg-[#16171A] hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-400/15 text-purple-300 border border-purple-400/30">
                Kabaddi
              </span>
              <Zap className={`w-4 h-4 ${selectedSport === 'PKL' ? 'text-purple-300' : 'text-floodlight-muted'}`} />
            </div>
            <h3 className="font-display text-xl font-bold text-floodlight">PKL AUCTION</h3>
            <div className="text-[11px] font-semibold text-purple-300/90 mt-0.5">Build Your Dream Seven</div>
            <div className="text-[10px] text-floodlight-muted mt-2 space-y-0.5">
              <div>• 12 Official Franchises</div>
              <div>• 235 Verified Players</div>
              <div>• ₹5 Cr Purse</div>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={handleProceed}
          className={`w-full py-3.5 rounded-pill font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            selectedSport === 'PKL'
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]'
              : 'bg-flare hover:bg-flare-hover text-[#17130A] shadow-flare'
          }`}
        >
          <span>Continue to {selectedSport} Room Setup</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-floodlight-subtle">
          <Shield className="w-3.5 h-3.5 text-turf" />
          <span>Virtual money only • Up to 30 managers per room</span>
        </div>
      </div>
    </div>
  );
};
