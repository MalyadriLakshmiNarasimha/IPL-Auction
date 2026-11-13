'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/shared/constants';
import {
  Gavel,
  Trophy,
  Users,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface OngoingAuction {
  room_code: string;
  name: string;
  host_name: string;
  is_host: boolean;
  participant_count: number;
  status: string;
  stage: string;
  last_activity: string;
  current_player_name: string | null;
  sold_count: number;
  unsold_count: number;
  total_pool_count: number;
  user_team_name: string | null;
  user_purse_remaining: number | null;
}

interface CompletedAuction {
  room_code: string;
  name: string;
  host_name: string;
  is_host: boolean;
  participant_count: number;
  status: string;
  completed_at: string;
  sold_count: number;
  unsold_count: number;
  total_money_spent: number;
  champion_name: string | null;
  user_team_name: string | null;
  user_squad_count: number | null;
  awards: any[];
  leaderboard: any[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [ongoing, setOngoing] = useState<OngoingAuction[]>([]);
  const [completed, setCompleted] = useState<CompletedAuction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCompleted, setSelectedCompleted] = useState<CompletedAuction | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { ok, status, data } = await apiFetch('/api/history');
      if (status === 401) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      if (ok && data) {
        setIsAuthenticated(true);
        setOngoing(data.ongoing || []);
        setCompleted(data.completed || []);
        // If there are no ongoing auctions but completed exist, default to completed tab
        if ((!data.ongoing || data.ongoing.length === 0) && data.completed?.length > 0) {
          setActiveTab('completed');
        }
      }
    } catch (e) {
      console.warn('[HISTORY] Fetch failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-night-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-flare/10 border border-flare/30 text-flare text-[11px] font-bold uppercase tracking-widest mb-3">
            <Clock className="w-3.5 h-3.5" />
            Auction Records
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-floodlight tracking-tight">
            AUCTION HISTORY
          </h1>
          <p className="text-sm text-floodlight-muted mt-1 max-w-xl">
            Rejoin your active ongoing bidding battles or inspect final scorecards and championship awards from completed auctions.
          </p>
        </div>

        {/* Tab switch: exactly two categories */}
        <div className="flex items-center bg-night-raised border border-night-border rounded-xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ongoing'
                ? 'bg-flare text-[#17130A] shadow-flare'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeTab === 'ongoing' ? 'bg-[#17130A]' : 'bg-turf'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${activeTab === 'ongoing' ? 'bg-[#17130A]' : 'bg-turf'}`} />
            </span>
            <span>Ongoing Auctions</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'ongoing' ? 'bg-black/20 text-[#17130A]' : 'bg-night-border text-floodlight-muted'
            }`}>
              {ongoing.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-flare text-[#17130A] shadow-flare'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Completed Auctions</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'completed' ? 'bg-black/20 text-[#17130A]' : 'bg-night-border text-floodlight-muted'
            }`}>
              {completed.length}
            </span>
          </button>
        </div>
      </div>

      {/* Unauthenticated State */}
      {isAuthenticated === false && !isLoading && (
        <div className="rounded-2xl border border-flare/20 bg-gradient-to-b from-night-raised to-night p-8 sm:p-12 text-center max-w-xl mx-auto my-12">
          <div className="w-14 h-14 rounded-2xl bg-flare/10 border border-flare/30 flex items-center justify-center text-flare mx-auto mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="font-display text-2xl font-bold text-floodlight mb-2">
            Sign In to View Your History
          </h2>
          <p className="text-xs sm:text-sm text-floodlight-muted leading-relaxed mb-6">
            Auction history is private and tied to your account. Log in to resume ongoing auctions or review your previous championship squads.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?redirect=/history"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-xs shadow-flare transition-all"
            >
              Log In Now
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-full border border-night-border hover:bg-night-border text-floodlight font-bold text-xs transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-night-raised/50 border border-night-border animate-pulse p-6" />
          ))}
        </div>
      )}

      {/* Authenticated Content */}
      {isAuthenticated && !isLoading && (
        <div>
          {/* CATEGORY 1: ONGOING AUCTIONS */}
          {activeTab === 'ongoing' && (
            <div>
              {ongoing.length === 0 ? (
                <div className="rounded-2xl border border-white/[.08] bg-night-raised/40 p-10 sm:p-16 text-center max-w-xl mx-auto my-8">
                  <div className="w-12 h-12 rounded-xl bg-flare/10 border border-flare/20 flex items-center justify-center text-flare mx-auto mb-4">
                    <Gavel className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-floodlight mb-1">
                    No Ongoing Auctions
                  </h3>
                  <p className="text-xs text-floodlight-muted leading-relaxed mb-6">
                    You don&apos;t have any active live auctions right now. Start a new auction or join with a room code.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      href="/create"
                      className="px-5 py-2.5 rounded-full bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-xs shadow-flare transition-all"
                    >
                      Create Room
                    </Link>
                    <Link
                      href="/join"
                      className="px-5 py-2.5 rounded-full border border-night-border hover:bg-night-border text-floodlight font-bold text-xs transition-all"
                    >
                      Join Room
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {ongoing.map(room => (
                    <div
                      key={room.room_code}
                      className="group rounded-2xl border border-flare/25 bg-gradient-to-b from-[#16171A] to-[#0E0F12] p-5 sm:p-6 hover:border-flare/50 transition-all flex flex-col justify-between shadow-lg relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-flare/[.04] rounded-full blur-2xl pointer-events-none" />

                      {/* Top metadata */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-turf/15 border border-turf/30 text-turf text-[10px] font-extrabold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-turf animate-pulse" />
                            Live Auction
                          </div>

                          <button
                            onClick={(e) => handleCopyCode(room.room_code, e)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-night-border/50 hover:bg-night-border border border-night-border text-floodlight-muted hover:text-floodlight text-xs font-mono font-bold transition-all"
                            title="Click to copy room code"
                          >
                            <span>{room.room_code}</span>
                            {copiedCode === room.room_code ? (
                              <Check className="w-3 h-3 text-turf" />
                            ) : (
                              <Copy className="w-3 h-3 text-flare" />
                            )}
                          </button>
                        </div>

                        <h2 className="font-display text-xl font-bold text-floodlight group-hover:text-flare transition-colors truncate">
                          {room.name}
                        </h2>

                        <div className="flex items-center gap-2 text-xs text-floodlight-muted mt-1">
                          <span>Host: <strong className="text-floodlight">{room.host_name}</strong></span>
                          {room.is_host && (
                            <span className="px-1.5 py-0.5 rounded bg-flare/20 text-flare text-[10px] font-bold">
                              You
                            </span>
                          )}
                          <span className="text-floodlight-subtle">•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-flare" /> {room.participant_count}
                          </span>
                        </div>

                        {/* Live auction status pill */}
                        <div className="mt-4 p-3 rounded-xl bg-night border border-night-border space-y-2 text-xs">
                          {room.current_player_name ? (
                            <div className="flex items-center justify-between">
                              <span className="text-floodlight-muted text-[11px]">On the block:</span>
                              <span className="font-bold text-flare truncate max-w-[150px]">{room.current_player_name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-floodlight-muted text-[11px]">Auction stage:</span>
                              <span className="font-bold text-floodlight uppercase tracking-wider text-[11px]">{room.stage.replace('_', ' ')}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-floodlight-muted text-[11px]">Players Sold / Pool:</span>
                            <span className="font-mono text-floodlight font-semibold">
                              {room.sold_count} sold {room.total_pool_count > 0 ? `/ ${room.total_pool_count}` : ''}
                            </span>
                          </div>

                          {room.user_team_name && (
                            <div className="flex items-center justify-between pt-1 border-t border-night-border/60">
                              <span className="text-floodlight-muted text-[11px]">Your team:</span>
                              <span className="font-bold text-floodlight truncate max-w-[140px]">{room.user_team_name}</span>
                            </div>
                          )}

                          {room.user_purse_remaining !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-floodlight-muted text-[11px]">Purse remaining:</span>
                              <span className="font-mono font-bold text-turf">{formatCurrency(room.user_purse_remaining)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action: Continue Auction */}
                      <div className="mt-5 pt-3 border-t border-night-border/50 flex items-center justify-between gap-3">
                        <div className="text-[10px] text-floodlight-subtle truncate" suppressHydrationWarning>
                          Active: {formatDate(room.last_activity)}
                        </div>
                        <Link
                          href={`/room/${room.room_code}`}
                          className="px-4 py-2 rounded-full bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-xs shadow-flare flex items-center gap-1.5 transition-all group-hover:scale-105 shrink-0"
                        >
                          <span>Continue Auction</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 2: COMPLETED AUCTIONS */}
          {activeTab === 'completed' && (
            <div>
              {completed.length === 0 ? (
                <div className="rounded-2xl border border-white/[.08] bg-night-raised/40 p-10 sm:p-16 text-center max-w-xl mx-auto my-8">
                  <div className="w-12 h-12 rounded-xl bg-flare/10 border border-flare/20 flex items-center justify-center text-flare mx-auto mb-4">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-floodlight mb-1">
                    No Completed Auctions Yet
                  </h3>
                  <p className="text-xs text-floodlight-muted leading-relaxed mb-6">
                    Auctions you complete will appear here with full squad scorecards, championship awards and leaderboard archives.
                  </p>
                  <Link
                    href="/create"
                    className="px-5 py-2.5 rounded-full bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-xs shadow-flare transition-all inline-block"
                  >
                    Start an Auction
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {completed.map(room => (
                    <div
                      key={room.room_code}
                      className="group rounded-2xl border border-night-border bg-gradient-to-b from-[#141517] to-[#0D0E10] p-5 sm:p-6 hover:border-flare/40 transition-all flex flex-col justify-between shadow-lg relative"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[.06] border border-white/10 text-floodlight-muted text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-turf" />
                            Completed
                          </div>

                          <span className="font-mono text-xs text-floodlight-muted font-bold px-2 py-0.5 rounded bg-night-border/40">
                            {room.room_code}
                          </span>
                        </div>

                        <h2 className="font-display text-xl font-bold text-floodlight group-hover:text-flare transition-colors truncate">
                          {room.name}
                        </h2>

                        <div className="flex items-center gap-2 text-xs text-floodlight-muted mt-1">
                          <span>Host: <strong className="text-floodlight">{room.host_name}</strong></span>
                          <span className="text-floodlight-subtle">•</span>
                          <span suppressHydrationWarning>{formatDate(room.completed_at)}</span>
                        </div>

                        {/* Champion and summary badge */}
                        <div className="mt-4 p-3 rounded-xl bg-night border border-night-border space-y-2 text-xs">
                          {room.champion_name && (
                            <div className="flex items-center justify-between">
                              <span className="text-floodlight-muted text-[11px] flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-flare" /> Champion:
                              </span>
                              <span className="font-bold text-flare truncate max-w-[150px]">{room.champion_name}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-floodlight-muted text-[11px]">Players Sold:</span>
                            <span className="font-mono text-floodlight font-semibold">{room.sold_count}</span>
                          </div>

                          {room.total_money_spent > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-floodlight-muted text-[11px]">Total Money Spent:</span>
                              <span className="font-mono text-floodlight font-semibold">{formatCurrency(room.total_money_spent)}</span>
                            </div>
                          )}

                          {room.user_team_name && (
                            <div className="flex items-center justify-between pt-1 border-t border-night-border/60">
                              <span className="text-floodlight-muted text-[11px]">Your Team:</span>
                              <span className="font-bold text-floodlight truncate max-w-[140px]">
                                {room.user_team_name}
                                {room.user_squad_count !== null && (
                                  <span className="text-floodlight-subtle font-normal text-[10px] ml-1">
                                    ({room.user_squad_count} players)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action: View Results */}
                      <div className="mt-5 pt-3 border-t border-night-border/50 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-floodlight-muted">
                          {room.participant_count} participants
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/room/${room.room_code}`}
                            className="px-4 py-2 rounded-full border border-flare/40 hover:bg-flare hover:text-[#17130A] text-flare font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                          >
                            <span>View Results</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
