'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/shared/constants';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  ExternalLink,
  Users,
  Award,
  TrendingUp,
} from 'lucide-react';

interface ManagerAchievement {
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

export default function LeaderboardPage() {
  const [achievements, setAchievements] = useState<ManagerAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadAchievements() {
      setIsLoading(true);
      try {
        const authRes = await apiFetch<{ authenticated: boolean }>('/api/auth/me');
        if (!authRes.ok || !authRes.data?.authenticated) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        const { ok, status, data } = await apiFetch('/api/history');
        if (status === 401) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (ok && data?.completed) {
          setIsAuthenticated(true);
          setAchievements(data.completed);
        }
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadAchievements();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen pb-24 pt-6 px-4 sm:px-6 max-w-7xl mx-auto space-y-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-flare text-[11px] font-bold uppercase tracking-widest mb-3">
            <Trophy className="w-3.5 h-3.5" />
            Manager Honors
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-floodlight tracking-tight">
            MANAGER LEADERBOARD
          </h1>
          <p className="text-xs sm:text-sm text-floodlight-muted mt-1.5 max-w-2xl">
            Personal auction milestones, tournament podium finishes and squad evaluation ratings across all completed IPL and PKL rooms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/history?tab=completed"
            className="px-4 py-2 rounded-full border border-night-border hover:border-flare/40 text-floodlight hover:text-flare text-xs font-bold transition-all"
          >
            Auction History
          </Link>
          <Link
            href="/create"
            className="px-5 py-2.5 rounded-full bg-flare text-[#17130A] font-extrabold text-xs shadow-flare transition-all"
          >
            Start New Auction
          </Link>
        </div>
      </div>

      {/* Guest Prompt */}
      {isAuthenticated === false && !isLoading && (
        <div className="rounded-2xl border border-white/10 bg-night-raised/50 p-8 sm:p-12 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-flare/10 border border-flare/20 flex items-center justify-center text-flare mx-auto mb-4">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-floodlight mb-2">Track Your Manager Achievements</h2>
          <p className="text-xs text-floodlight-muted mb-6">
            Sign in to inspect your personal podium finishes, squad ratings, and complete auction leaderboards.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/login?redirect=/leaderboard"
              className="px-6 py-2.5 rounded-full bg-flare text-[#17130A] font-extrabold text-xs shadow-flare"
            >
              Log In Now
            </Link>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse p-6" />
          ))}
        </div>
      )}

      {/* Authenticated Milestone Cards Grid */}
      {isAuthenticated && !isLoading && (
        <div>
          {achievements.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#141518] to-[#0A0B0D] p-10 sm:p-16 text-center max-w-xl mx-auto my-6 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-flare mx-auto mb-4">
                <Medal className="w-7 h-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-floodlight mb-2">No Completed Auctions Yet</h3>
              <p className="text-xs text-floodlight-muted leading-relaxed mb-6">
                Your manager milestones and tournament achievements will appear here as soon as you complete an auction.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/create"
                  className="px-6 py-2.5 rounded-full bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-xs shadow-flare transition-all"
                >
                  Enter Bidding Arena
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((item, idx) => {
                const isPkl = item.sport_type === 'PKL';
                const rank = item.user_rank;
                const is1st = rank === 1;
                const is2nd = rank === 2;
                const is3rd = rank === 3;

                return (
                  <div
                    key={item.room_code || idx}
                    className={`rounded-2xl border p-6 flex flex-col justify-between shadow-xl relative overflow-hidden transition-all hover:scale-[1.01] ${
                      is1st
                        ? 'border-amber-400/40 bg-gradient-to-b from-[#1C180E] via-[#131215] to-[#0D0D10]'
                        : is2nd
                        ? 'border-slate-300/30 bg-gradient-to-b from-[#17181C] via-[#121316] to-[#0D0D10]'
                        : is3rd
                        ? 'border-amber-700/30 bg-gradient-to-b from-[#1A1412] via-[#121316] to-[#0D0D10]'
                        : 'border-white/10 bg-gradient-to-b from-[#15161A] to-[#0D0E11]'
                    }`}
                  >
                    {/* Top League & Position Badges */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPkl
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {item.sport_type} AUCTION
                        </span>

                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                          is1st
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#17130A] shadow-md shadow-amber-500/20'
                            : is2nd
                            ? 'bg-slate-300 text-[#17130A]'
                            : is3rd
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/10 text-floodlight'
                        }`}>
                          {is1st ? <Crown className="w-3.5 h-3.5" /> : <Medal className="w-3.5 h-3.5" />}
                          <span>
                            {is1st ? '1ST PLACE' : is2nd ? '2ND PLACE' : is3rd ? '3RD PLACE' : rank ? `RANK #${rank}` : 'PARTICIPANT'}
                          </span>
                        </div>
                      </div>

                      {/* Auction Title */}
                      <h3 className="font-display text-xl font-bold text-floodlight truncate">
                        {item.name}
                      </h3>

                      <div className="text-[11px] text-floodlight-muted mt-1 flex items-center gap-2">
                        <span>Code: <strong className="font-mono text-floodlight">{item.room_code}</strong></span>
                        <span className="text-floodlight-subtle">•</span>
                        <span>{formatDate(item.completed_at)}</span>
                      </div>

                      {/* Team & Manager Details */}
                      <div className="mt-5 p-4 rounded-xl bg-night border border-night-border space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-floodlight-muted text-[11px]">Franchise / Team:</span>
                          <span className="font-bold text-floodlight truncate max-w-[170px]">
                            {item.user_team_name || 'Assigned Franchise'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-floodlight-muted text-[11px]">Manager:</span>
                          <span className="font-semibold text-floodlight truncate max-w-[170px]">
                            {item.user_manager_name || item.host_name}
                          </span>
                        </div>

                        {item.user_squad_rating !== null && item.user_squad_rating !== undefined && (
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-floodlight-muted text-[11px] flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-current text-flare" /> Squad Rating:
                            </span>
                            <span className="font-display text-base font-black text-flare">
                              {item.user_squad_rating}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-floodlight-muted text-[11px]">Players Purchased:</span>
                          <span className="font-mono font-bold text-floodlight">
                            {item.user_squad_count ?? '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-floodlight-muted text-[11px]">Total Purse Spent:</span>
                          <span className="font-mono font-bold text-floodlight">
                            {item.user_purse_spent ? formatCurrency(item.user_purse_spent) : formatCurrency(item.total_money_spent)}
                          </span>
                        </div>

                        {item.user_purse_remaining !== null && item.user_purse_remaining !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-floodlight-muted text-[11px]">Remaining Purse:</span>
                            <span className="font-mono font-bold text-turf">
                              {formatCurrency(item.user_purse_remaining)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action: VIEW FULL AUCTION RESULTS */}
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <Link
                        href={`/results/${item.room_code}`}
                        className="w-full py-2.5 rounded-xl bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-xs shadow-flare flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      >
                        <span>VIEW FULL AUCTION RESULTS</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
