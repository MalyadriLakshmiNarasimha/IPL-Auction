'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/shared/constants';
import { FullAuctionLeaderboardData } from '@/shared/auction-results-engine';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Gavel,
  Shield,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ArrowLeft,
  Calendar,
  Users,
  Layers,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function AuctionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const code = ((params?.code as string) || '').toUpperCase();

  const [data, setData] = useState<FullAuctionLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Expanded teams for squad inspection (Section B)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Filters for Section G (Purchase History)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOLD' | 'UNSOLD'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  useEffect(() => {
    try {
      const cached = localStorage.getItem('ipl_auth_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setCurrentUserId(parsed.id || parsed.user_id || null);
      }
    } catch {}

    async function loadResults() {
      setIsLoading(true);
      setError(null);
      try {
        const { ok, status, data: resData } = await apiFetch<FullAuctionLeaderboardData>(`/api/results/${code}`);
        if (ok && resData && resData.overview) {
          setData(resData);
        } else {
          setError(`Results for auction room ${code} could not be found or have not concluded yet.`);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load auction results');
      } finally {
        setIsLoading(false);
      }
    }

    if (code) {
      loadResults();
    }
  }, [code]);

  const toggleTeamExpand = (teamName: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamName)) next.delete(teamName);
      else next.add(teamName);
      return next;
    });
  };

  // Section G Filtered purchases
  const filteredPurchases = useMemo(() => {
    if (!data?.player_purchase_history) return [];
    return data.player_purchase_history.filter(item => {
      const matchesSearch =
        !searchQuery ||
        item.player_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.winning_team && item.winning_team.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter;

      const matchesRole =
        roleFilter === 'ALL' || item.primary_role.toUpperCase() === roleFilter.toUpperCase();

      const matchesTeam =
        teamFilter === 'ALL' || item.winning_team === teamFilter;

      return matchesSearch && matchesStatus && matchesRole && matchesTeam;
    });
  }, [data, searchQuery, statusFilter, roleFilter, teamFilter]);

  // Unique roles and teams for filters
  const uniqueRoles = useMemo(() => {
    if (!data?.player_purchase_history) return [];
    return Array.from(new Set(data.player_purchase_history.map(p => p.primary_role))).filter(Boolean);
  }, [data]);

  const uniqueTeams = useMemo(() => {
    if (!data?.team_rankings) return [];
    return data.team_rankings.map(t => t.team_name);
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090B] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-flare border-t-transparent animate-spin mb-4" />
        <h2 className="font-display text-2xl font-bold text-floodlight tracking-wide">
          ANALYZING AUCTION RECORDS FOR {code}...
        </h2>
        <p className="text-xs text-floodlight-muted mt-1">Aggregating squad metrics, bidding records and championship honors</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#08090B] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-flare mb-4">
          <Gavel className="w-7 h-7" />
        </div>
        <h2 className="font-display text-3xl font-bold text-floodlight mb-2">AUCTION RESULTS PENDING</h2>
        <p className="text-sm text-floodlight-muted max-w-md mb-6">{error || 'No verified results record exists for this room.'}</p>
        <div className="flex gap-3">
          <Link
            href="/history"
            className="px-5 py-2.5 rounded-full bg-flare text-[#17130A] font-extrabold text-xs shadow-flare flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to History</span>
          </Link>
          <Link
            href={`/room/${code}`}
            className="px-5 py-2.5 rounded-full border border-night-border text-floodlight font-bold text-xs hover:bg-white/5"
          >
            Enter Room
          </Link>
        </div>
      </div>
    );
  }

  const { overview, team_rankings, squad_comparison, purse_awards, player_awards, bidding_records } = data;
  const isPkl = overview.sport_type === 'PKL';

  return (
    <div className="min-h-screen pb-24 pt-6 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/history?tab=completed"
          className="inline-flex items-center gap-2 text-xs font-bold text-floodlight-muted hover:text-flare transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Completed Auctions</span>
        </Link>
        <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-floodlight">
          ROOM: {overview.room_code}
        </span>
      </div>

      {/* ============================================================ */}
      {/* SECTION A — AUCTION OVERVIEW                                 */}
      {/* ============================================================ */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#15161A] via-[#101114] to-[#0A0B0D] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                isPkl
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {overview.sport_type} AUCTION
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-floodlight-muted">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(overview.completed_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-floodlight tracking-tight">
              {overview.name}
            </h1>
            <p className="text-xs sm:text-sm text-floodlight-muted mt-1.5">
              Official Post-Auction Scorecard, Squad Rankings, Bidding Records and Honors
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/room/${overview.room_code}`}
              className="px-4 py-2 rounded-full border border-night-border hover:border-flare/40 text-floodlight hover:text-flare text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>Live Room</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 6 Key Stat Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] uppercase font-bold text-floodlight-subtle tracking-wider">Total Teams</div>
            <div className="font-display text-2xl font-black text-floodlight mt-1">{overview.total_teams}</div>
            <div className="text-[10px] text-floodlight-muted mt-0.5">{overview.total_managers} Managers</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] uppercase font-bold text-floodlight-subtle tracking-wider">Players Sold</div>
            <div className="font-display text-2xl font-black text-turf mt-1">{overview.total_sold}</div>
            <div className="text-[10px] text-floodlight-muted mt-0.5">of {overview.total_pool} in Pool</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] uppercase font-bold text-floodlight-subtle tracking-wider">Unsold Players</div>
            <div className="font-display text-2xl font-black text-amber-400 mt-1">{overview.total_unsold}</div>
            <div className="text-[10px] text-floodlight-muted mt-0.5">Available for Transfer</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] uppercase font-bold text-floodlight-subtle tracking-wider">Total Valid Bids</div>
            <div className="font-display text-2xl font-black text-flare mt-1">{overview.total_bids}</div>
            <div className="text-[10px] text-floodlight-muted mt-0.5">Transactions Logged</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 sm:col-span-2">
            <div className="text-[10px] uppercase font-bold text-floodlight-subtle tracking-wider">Total Auction Expenditure</div>
            <div className="font-display text-2xl sm:text-3xl font-black text-flare mt-1">
              {formatCurrency(overview.total_spent)}
            </div>
            <div className="text-[10px] text-floodlight-muted mt-0.5">Cumulative Purse Disbursed</div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION B — FINAL TEAM RANKINGS                              */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-flare text-xs font-black uppercase tracking-widest mb-1">
              <Trophy className="w-4 h-4" />
              <span>Section B</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-floodlight">FINAL TEAM RANKINGS</h2>
            <p className="text-xs text-floodlight-muted mt-0.5">
              Ranked strictly by the authoritative 5-pillar squad balance evaluation algorithm
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {team_rankings.map(team => {
            const isTop1 = team.rank === 1;
            const isTop2 = team.rank === 2;
            const isTop3 = team.rank === 3;
            const isUserTeam = team.participant_id === currentUserId;
            const isExpanded = expandedTeams.has(team.team_name);

            return (
              <div
                key={team.team_name}
                className={`rounded-2xl border transition-all ${
                  isTop1
                    ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-[#15161A] to-[#101114]'
                    : isTop2
                    ? 'border-slate-300/30 bg-gradient-to-r from-slate-400/10 via-[#15161A] to-[#101114]'
                    : isTop3
                    ? 'border-amber-700/30 bg-gradient-to-r from-amber-700/10 via-[#15161A] to-[#101114]'
                    : 'border-white/10 bg-[#121316]'
                } ${isUserTeam ? 'ring-2 ring-flare shadow-flare' : ''}`}
              >
                {/* Main Card Header Bar */}
                <div
                  onClick={() => toggleTeamExpand(team.team_name)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Rank Badge */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-display font-black text-lg shrink-0 ${
                      isTop1
                        ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-[#17130A] shadow-amber-500/30 shadow-md'
                        : isTop2
                        ? 'bg-slate-300 text-[#17130A]'
                        : isTop3
                        ? 'bg-amber-700 text-white'
                        : 'bg-white/5 border border-white/10 text-floodlight'
                    }`}>
                      {isTop1 ? <Crown className="w-6 h-6" /> : `#${team.rank}`}
                    </div>

                    {/* Team Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-lg sm:text-xl font-black text-floodlight truncate">
                          {team.team_name}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-floodlight-muted">
                          {team.team_short_code}
                        </span>
                        {isUserTeam && (
                          <span className="px-2 py-0.5 rounded-full bg-flare text-[#17130A] text-[9.5px] font-black uppercase tracking-wider">
                            Your Squad
                          </span>
                        )}
                        {isTop1 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9.5px] font-extrabold uppercase">
                            Champion 🏆
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-floodlight-muted mt-0.5">
                        Manager: <strong className="text-floodlight">{team.manager_name}</strong> • {team.players_purchased} Players Acquired
                      </div>
                    </div>
                  </div>

                  {/* Rating & Purse Metrics */}
                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase font-bold text-floodlight-subtle">Squad Rating</div>
                      <div className="flex items-center md:justify-end gap-1 font-display text-2xl font-black text-flare">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>{team.squad_rating}</span>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase font-bold text-floodlight-subtle">Purse Spent</div>
                      <div className="font-mono text-sm font-bold text-floodlight">
                        {formatCurrency(team.purse_spent)}
                      </div>
                      <div className="text-[10px] text-turf font-mono">
                        Rem: {formatCurrency(team.purse_remaining)}
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Toggle squad details"
                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-floodlight-muted hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Squad Details */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-5 bg-[#0C0D10] rounded-b-2xl animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-flare uppercase tracking-wider">
                        Complete Squad Roster ({team.squad.length} Players)
                      </h4>
                      <div className="flex gap-2 text-[10px] text-floodlight-muted">
                        {Object.entries(team.squad_composition).map(([role, count]) => (
                          <span key={role} className="px-2 py-0.5 rounded bg-white/5 border border-white/5">
                            {role}: <strong className="text-floodlight">{count}</strong>
                          </span>
                        ))}
                      </div>
                    </div>

                    {team.squad.length === 0 ? (
                      <p className="text-xs text-floodlight-muted py-2">No players acquired in this auction.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {team.squad.map((item, idx) => (
                          <div
                            key={item.player?.id || idx}
                            className="p-3 rounded-xl bg-night-raised border border-white/5 flex items-center gap-3"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-night-border shrink-0 relative">
                              {item.player?.id ? (
                                  <Image
                                  src={item.player.image_url || ((item.player as any).image ? `/images/players/${(item.player as any).image}` : `/images/pkl-players/${item.player.id}.webp`)}
                                  alt={item.player?.name || 'Player'}
                                  fill
                                  sizes="40px"
                                  className="object-cover object-top"
                                  onError={(e: any) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-floodlight truncate">{item.player?.name}</div>
                              <div className="text-[10px] text-floodlight-muted flex items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] uppercase font-bold text-flare">
                                  {item.player?.role}
                                </span>
                                <span>{item.player?.country || 'IND'}</span>
                              </div>
                            </div>
                            <div className="font-mono text-xs font-bold text-turf shrink-0">
                              {formatCurrency(item.bought_for)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION C — COMPLETE SQUAD COMPARISON                        */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-flare text-xs font-black uppercase tracking-widest mb-1">
            <Layers className="w-4 h-4" />
            <span>Section C</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-floodlight">COMPLETE SQUAD COMPARISON</h2>
          <p className="text-xs text-floodlight-muted mt-0.5">
            Cross-team role depth, positional breakdown and expenditure efficiency
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121316]">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-floodlight-subtle border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Manager</th>
                <th className="py-3 px-4 text-center">Squad Rating</th>
                {isPkl ? (
                  <>
                    <th className="py-3 px-4 text-center">Raiders</th>
                    <th className="py-3 px-4 text-center">Defenders</th>
                    <th className="py-3 px-4 text-center">All-Rounders</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 text-center">Batters</th>
                    <th className="py-3 px-4 text-center">Bowlers</th>
                    <th className="py-3 px-4 text-center">All-Rounders</th>
                    <th className="py-3 px-4 text-center">Wicketkeepers</th>
                  </>
                )}
                <th className="py-3 px-4 text-right">Spent</th>
                <th className="py-3 px-4 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {squad_comparison.map(item => (
                <tr key={item.team_name} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-bold text-floodlight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.team_color }} />
                    <span>{item.team_name}</span>
                  </td>
                  <td className="py-3 px-4 text-floodlight-muted">{item.manager_name}</td>
                  <td className="py-3 px-4 text-center font-display font-black text-base text-flare">
                    {item.squad_rating}
                  </td>
                  {isPkl ? (
                    <>
                      <td className="py-3 px-4 text-center font-mono font-bold text-floodlight">{item.role_counts['Raider'] || 0}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-floodlight">{item.role_counts['Defender'] || 0}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-floodlight">{item.role_counts['All-Rounder'] || 0}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-center font-mono font-bold text-floodlight">{item.role_counts['BATTER'] || item.role_counts['Batter'] || 0}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-floodlight">{item.role_counts['BOWLER'] || item.role_counts['Bowler'] || 0}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-floodlight">{item.role_counts['ALL-ROUNDER'] || item.role_counts['All-Rounder'] || 0}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-floodlight">{item.role_counts['WICKETKEEPER'] || item.role_counts['Wicketkeeper'] || 0}</td>
                    </>
                  )}
                  <td className="py-3 px-4 text-right font-mono font-semibold text-floodlight">{formatCurrency(item.purse_spent)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-turf">{formatCurrency(item.purse_remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION D — PURSE MANAGEMENT AWARDS                          */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-flare text-xs font-black uppercase tracking-widest mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Section D</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-floodlight">PURSE MANAGEMENT AWARDS</h2>
          <p className="text-xs text-floodlight-muted mt-0.5">
            Objective financial honors calculated strictly from verified room transactions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {purse_awards.map(award => (
            <div
              key={award.id}
              className="p-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#16171B] to-[#0E0F12] flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-flare mb-3">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-display text-lg font-bold text-floodlight">{award.title}</h3>
                <div className="text-[11px] text-floodlight-muted mt-0.5">{award.subtitle}</div>
                <div className="mt-4 p-3 rounded-xl bg-night border border-night-border">
                  <div className="text-sm font-black text-flare">{award.winner_team}</div>
                  <div className="text-xs text-floodlight-muted">Manager: {award.winner_manager}</div>
                  <div className="font-mono text-xs font-bold text-turf mt-2 pt-2 border-t border-white/5">
                    {award.metric_value}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-floodlight-subtle mt-3 leading-relaxed">{award.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION E — PLAYER AWARDS                                    */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-flare text-xs font-black uppercase tracking-widest mb-1">
            <Flame className="w-4 h-4" />
            <span>Section E</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-floodlight">PLAYER AWARDS & HONORS</h2>
          <p className="text-xs text-floodlight-muted mt-0.5">
            {isPkl ? 'Pro Kabaddi' : 'IPL Cricket'} standout performers, financial milestones and bargain acquisitions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {player_awards.map((award, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#15161A] to-[#0F1013] flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-flare/10 border border-flare/20 text-flare">
                    {award.category}
                  </span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-display text-lg font-bold text-floodlight">{award.award_name}</h3>

                <div className="mt-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-night-border shrink-0 relative">
                    {award.player_image ? (
                      <Image
                        src={award.player_image}
                        alt={award.player_name}
                        fill
                        sizes="48px"
                        className="object-cover object-top"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-floodlight truncate">{award.player_name}</div>
                    <div className="text-[10px] text-floodlight-muted">{award.player_role} • Won by {award.winning_team}</div>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-night border border-night-border text-center">
                  <div className="text-[10px] text-floodlight-subtle uppercase">Metric Highlight</div>
                  <div className="font-mono text-sm font-black text-flare mt-0.5">{award.highlight_metric}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION F — BIDDING RECORDS                                  */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-flare text-xs font-black uppercase tracking-widest mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Section F</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-floodlight">BIDDING TRANSACTION RECORDS</h2>
          <p className="text-xs text-floodlight-muted mt-0.5">
            Auction-specific battle records extracted from genuine bid transaction logs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Record 1: Most Contested Player */}
          {bidding_records.most_contested_player && (
            <div className="p-5 rounded-2xl border border-white/10 bg-[#121316]">
              <div className="text-[10px] font-black uppercase text-flare tracking-wider">Most Contested Player</div>
              <div className="font-display text-xl font-bold text-floodlight mt-1">
                {bidding_records.most_contested_player.player_name}
              </div>
              <div className="text-xs text-floodlight-muted mt-0.5">
                Role: {bidding_records.most_contested_player.role} • Won by {bidding_records.most_contested_player.winning_team}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-night border border-night-border flex items-center justify-between">
                <span className="text-xs text-floodlight-muted">Total Bids Made:</span>
                <span className="font-display text-xl font-black text-flare">{bidding_records.most_contested_player.bid_count} Bids</span>
              </div>
            </div>
          )}

          {/* Record 2: Most Expensive Player */}
          {bidding_records.most_expensive_player && (
            <div className="p-5 rounded-2xl border border-white/10 bg-[#121316]">
              <div className="text-[10px] font-black uppercase text-flare tracking-wider">Most Expensive Signing</div>
              <div className="font-display text-xl font-bold text-floodlight mt-1">
                {bidding_records.most_expensive_player.player_name}
              </div>
              <div className="text-xs text-floodlight-muted mt-0.5">
                Acquired by {bidding_records.most_expensive_player.team}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-night border border-night-border flex items-center justify-between">
                <span className="text-xs text-floodlight-muted">Winning Price:</span>
                <span className="font-mono text-base font-black text-turf">
                  {formatCurrency(bidding_records.most_expensive_player.amount)}
                </span>
              </div>
            </div>
          )}

          {/* Record 3: Auction Aggregate Averages */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#121316] sm:col-span-2 lg:col-span-1">
            <div className="text-[10px] font-black uppercase text-flare tracking-wider">Auction Aggregates</div>
            <div className="font-display text-xl font-bold text-floodlight mt-1">Bidding Intensity</div>
            <div className="text-xs text-floodlight-muted mt-0.5">Across all auction rounds</div>
            <div className="mt-4 p-3 rounded-xl bg-night border border-night-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-floodlight-muted">Total Bids:</span>
                <span className="font-mono font-bold text-floodlight">{bidding_records.total_bids_during_auction}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-floodlight-muted">Avg Bids / Sold Player:</span>
                <span className="font-mono font-bold text-flare">{bidding_records.average_bids_per_sold_player} bids</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION G — COMPLETE PLAYER PURCHASE HISTORY                 */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-flare text-xs font-black uppercase tracking-widest mb-1">
              <Users className="w-4 h-4" />
              <span>Section G</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-floodlight">COMPLETE PLAYER PURCHASE HISTORY</h2>
            <p className="text-xs text-floodlight-muted mt-0.5">
              Auditable log of every athlete auctioned, winning bidder, price and bid count
            </p>
          </div>
          <div className="text-xs font-mono font-bold text-floodlight-muted">
            Showing {filteredPurchases.length} of {data.player_purchase_history.length} Players
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl border border-white/10 bg-[#121316] flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-floodlight-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by player name or winning franchise..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-floodlight placeholder:text-floodlight-subtle text-xs focus:border-flare outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-floodlight text-xs font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SOLD">Sold Only</option>
              <option value="UNSOLD">Unsold Only</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-floodlight text-xs font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              {uniqueRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Team Filter */}
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-floodlight text-xs font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All Teams</option>
              {uniqueTeams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Player Purchase Records Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121316]">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-floodlight-subtle border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Primary Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Winning Team</th>
                <th className="py-3 px-4">Winning Manager</th>
                <th className="py-3 px-4 text-center">Valid Bids</th>
                <th className="py-3 px-4 text-right">Final Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-floodlight-muted">
                    No players found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.player_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-bold text-floodlight flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-night-border shrink-0 relative">
                        {p.player_image ? (
                          <Image
                            src={p.player_image}
                            alt={p.player_name}
                            fill
                            sizes="32px"
                            className="object-cover object-top"
                            onError={(e: any) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>
                      <span className="truncate max-w-[150px]">{p.player_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] uppercase font-bold text-floodlight-muted">
                        {p.primary_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        p.status === 'SOLD'
                          ? 'bg-turf/20 text-turf border border-turf/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-floodlight">
                      {p.winning_team || <span className="text-floodlight-subtle">—</span>}
                    </td>
                    <td className="py-3 px-4 text-floodlight-muted">
                      {p.winning_manager || <span className="text-floodlight-subtle">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-flare">
                      {p.total_bids}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-floodlight">
                      {p.status === 'SOLD' ? formatCurrency(p.final_price) : <span className="text-floodlight-subtle">Unsold</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
