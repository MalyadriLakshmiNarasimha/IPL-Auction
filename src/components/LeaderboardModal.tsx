'use client';

import React from 'react';
import { Trophy, Medal, Crown, Star, X, ArrowUpRight, Flame, Shield } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOP_MANAGERS = [
  { rank: 1, name: 'Vikramaditya', franchise: 'Patna Pirates', sport: 'PKL', score: 96.4, squadCount: 14, spent: '₹4.85 Cr' },
  { rank: 2, name: 'Ananya Sharma', franchise: 'Chennai Super Kings', sport: 'IPL', score: 95.8, squadCount: 18, spent: '₹98.2 Cr' },
  { rank: 3, name: 'Kabir Mehta', franchise: 'Puneri Paltan', sport: 'PKL', score: 94.2, squadCount: 15, spent: '₹4.90 Cr' },
  { rank: 4, name: 'Rohan Deshmukh', franchise: 'Mumbai Indians', sport: 'IPL', score: 93.6, squadCount: 19, spent: '₹99.1 Cr' },
  { rank: 5, name: 'Pooja Reddy', franchise: 'Bengaluru Bulls', sport: 'PKL', score: 92.5, squadCount: 14, spent: '₹4.75 Cr' },
  { rank: 6, name: 'Arjun Verma', franchise: 'Kolkata Knight Riders', sport: 'IPL', score: 91.8, squadCount: 17, spent: '₹96.4 Cr' },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#101113] p-5 sm:p-7 shadow-2xl overflow-hidden">
        {/* Subtle dual-accent glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-floodlight leading-none">Manager Leaderboard</h2>
              <p className="text-xs text-floodlight-muted mt-1">Top auction performances across IPL & PKL rooms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 flex items-center justify-center text-floodlight-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative my-5 divide-y divide-white/5 max-h-[60vh] overflow-y-auto pr-1">
          {TOP_MANAGERS.map(m => {
            const isTop3 = m.rank <= 3;
            const isPkl = m.sport === 'PKL';
            return (
              <div
                key={m.rank}
                className="py-3 px-3 rounded-xl flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      m.rank === 1
                        ? 'bg-amber-400 text-black shadow-amber-500/20 shadow-md'
                        : m.rank === 2
                        ? 'bg-slate-300 text-black'
                        : m.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-white/10 text-floodlight-muted'
                    }`}
                  >
                    {m.rank === 1 ? <Crown className="w-4 h-4" /> : m.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-floodlight truncate">{m.name}</span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                          isPkl
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {m.sport}
                      </span>
                    </div>
                    <div className="text-[11px] text-floodlight-muted mt-0.5">
                      {m.franchise} • {m.squadCount} Players • Spent {m.spent}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end font-display text-lg font-black text-flare">
                    <Star className="w-3.5 h-3.5 fill-current text-flare" />
                    <span>{m.score}</span>
                  </div>
                  <div className="text-[10px] text-floodlight-subtle">Squad Balance</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-floodlight-muted text-center sm:text-left">
            Ratings calculated automatically after complete room evaluation.
          </p>
          <Link
            href="/history"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-pill bg-white/10 hover:bg-white/15 text-xs font-bold text-floodlight flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Full Auction History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
