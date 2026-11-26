'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Star, X, ArrowUpRight, Flame, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/shared/constants';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManagerMilestone {
  room_code: string;
  name: string;
  sport_type: 'IPL' | 'PKL';
  host_name: string;
  completed_at: string;
  champion_name: string | null;
  user_team_name: string | null;
  user_manager_name: string | null;
  user_squad_count: number | null;
  user_squad_rating: number | null;
  user_purse_spent: number | null;
  user_purse_remaining: number | null;
  user_rank: number | null;
  total_money_spent: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [milestones, setMilestones] = useState<ManagerMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const authRes = await apiFetch<{ authenticated: boolean }>('/api/auth/me');
        if (authRes.ok && authRes.data?.authenticated) {
          const { ok, data } = await apiFetch('/api/history');
          if (isMounted && ok && data?.completed) {
            setMilestones(data.completed);
          }
        }
      } catch {}
      if (isMounted) setIsLoading(false);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#101113] p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Subtle dual-accent glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-floodlight leading-none">Manager Leaderboard</h2>
              <p className="text-xs text-floodlight-muted mt-1">Your personal achievements across completed auctions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 flex items-center justify-center text-floodlight-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative my-4 overflow-y-auto pr-1 flex-1 space-y-3">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2].map(i => (
                <div key={i} className="h-28 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : milestones.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-flare/10 border border-flare/20 flex items-center justify-center text-flare mx-auto mb-3">
                <Medal className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-floodlight">No Completed Auctions Yet</h3>
              <p className="text-xs text-floodlight-muted mt-1 max-w-sm mx-auto mb-4">
                Participate in an auction room to record your personal manager ratings and podium finishes!
              </p>
              <Link
                href="/create"
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-flare text-[#17130A] text-xs font-bold shadow-flare inline-block"
              >
                Start an Auction
              </Link>
            </div>
          ) : (
            milestones.map((m, idx) => {
              const rank = m.user_rank;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;
              const isPkl = m.sport_type === 'PKL';

              return (
                <div
                  key={m.room_code || idx}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isTop1
                      ? 'border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-[#141518]'
                      : isTop2
                      ? 'border-slate-300/20 bg-gradient-to-r from-slate-400/10 to-[#141518]'
                      : isTop3
                      ? 'border-amber-700/20 bg-gradient-to-r from-amber-700/10 to-[#141518]'
                      : 'border-white/10 bg-[#141518]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-sm shrink-0 ${
                        isTop1
                          ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                          : isTop2
                          ? 'bg-slate-300 text-black'
                          : isTop3
                          ? 'bg-amber-700 text-white'
                          : 'bg-white/10 text-floodlight'
                      }`}
                    >
                      {isTop1 ? <Crown className="w-5 h-5" /> : rank ? `#${rank}` : <Medal className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-floodlight truncate">{m.name}</span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isPkl
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {m.sport_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-floodlight-muted mt-0.5">
                        Team: <strong className="text-floodlight">{m.user_team_name || 'Assigned Franchise'}</strong>
                        {m.user_squad_count && ` • ${m.user_squad_count} Players`}
                        {m.user_purse_spent && ` • Spent ${formatCurrency(m.user_purse_spent)}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    {m.user_squad_rating !== null && m.user_squad_rating !== undefined && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end font-display text-base font-black text-flare">
                          <Star className="w-3.5 h-3.5 fill-current text-flare" />
                          <span>{m.user_squad_rating}</span>
                        </div>
                        <div className="text-[9px] text-floodlight-subtle">Squad Score</div>
                      </div>
                    )}

                    <Link
                      href={`/results/${m.room_code}`}
                      onClick={onClose}
                      className="px-3.5 py-1.5 rounded-lg bg-flare hover:bg-flare-hover text-[#17130A] text-xs font-bold shadow-flare flex items-center gap-1 transition-all"
                    >
                      <span>Results</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="relative pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-floodlight-muted text-center sm:text-left">
            Milestones update automatically when an auction concludes.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/leaderboard"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-floodlight flex items-center gap-1.5 transition-colors"
            >
              <span>Full Leaderboard</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
