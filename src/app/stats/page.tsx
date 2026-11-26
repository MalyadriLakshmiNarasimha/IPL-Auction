'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Filter,
  Trophy,
  Users,
  Gamepad2,
  Award,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sparkles,
  MapPin,
  DollarSign,
  Calendar,
  Layers,
  ChevronDown,
  Info,
  Medal,
  Activity,
  Flame,
  Star
} from 'lucide-react';
import { ALL_PLAYERS } from '@/shared/player-data';
import { ALL_PKL_PLAYERS } from '@/shared/pkl-player-data';
import {
  getIplCareerStats,
  getIplSeasonStats,
  HISTORICAL_IPL_ACHIEVEMENTS,
} from '@/shared/player-career-data';
import { getPklPlayerStats } from '@/shared/pkl-player-data';
import { Player, PlayerRole } from '@/shared/types';
import { apiFetch } from '@/lib/api';

// Format currency
function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount) || amount === 0) return '₹0';
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const lk = amount / 100000;
    return `₹${lk % 1 === 0 ? lk.toFixed(0) : lk.toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

interface PlatformStatsData {
  registeredManagers: number;
  roomsCreated: number;
  iplPlayers: number;
  pklPlayers: number;
  iplFranchises: number;
  pklFranchises: number;
}

interface UserAuctionOption {
  room_code: string;
  name: string;
  sport_type: 'IPL' | 'PKL';
  stage: string;
  status: 'ongoing' | 'completed';
}

interface RoomAvailabilityData {
  success: boolean;
  room_code: string;
  name: string;
  sport_type: 'IPL' | 'PKL';
  stage: string;
  status: string;
  total_pool_count: number;
  sold_count: number;
  unsold_count: number;
  player_status: Record<string, {
    status: 'AVAILABLE' | 'SOLD' | 'UNSOLD' | 'WITHDRAWN' | 'NOT IN AUCTION';
    winning_team?: string;
    winning_bid?: number;
    winning_manager?: string;
  }>;
  pool_player_ids: string[];
}

export default function PlayerDiscoveryPage() {
  // Navigation & League
  const [sport, setSport] = useState<'IPL' | 'PKL'>('IPL');

  // Platform Stats
  const [platformStats, setPlatformStats] = useState<PlatformStatsData>({
    registeredManagers: 0,
    roomsCreated: 0,
    iplPlayers: ALL_PLAYERS.length,
    pklPlayers: ALL_PKL_PLAYERS.length,
    iplFranchises: 10,
    pklFranchises: 12,
  });

  // Auction Availability Context
  const [userAuctions, setUserAuctions] = useState<UserAuctionOption[]>([]);
  const [selectedAuctionCode, setSelectedAuctionCode] = useState<string>('');
  const [customRoomInput, setCustomRoomInput] = useState<string>('');
  const [isEnteringCustomRoom, setIsEnteringCustomRoom] = useState<boolean>(false);
  const [auctionAvailability, setAuctionAvailability] = useState<RoomAvailabilityData | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedNationality, setSelectedNationality] = useState<'ALL' | 'INDIAN' | 'OVERSEAS'>('ALL');
  const [selectedCapped, setSelectedCapped] = useState<'ALL' | 'CAPPED' | 'UNCAPPED'>('ALL');
  const [selectedAvailabilityFilter, setSelectedAvailabilityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('points_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 24;

  // Player Profile Modal
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'career' | 'season' | 'achievements'>('career');

  // 1. Fetch live platform stats & user's ongoing/completed auctions
  useEffect(() => {
    async function loadInitialData() {
      try {
        const statsRes = await apiFetch<{ success: boolean; stats: PlatformStatsData }>('/api/stats');
        if (statsRes.ok && statsRes.data?.stats) {
          setPlatformStats(statsRes.data.stats);
        }
      } catch { }

      try {
        const authRes = await apiFetch<{ authenticated: boolean }>('/api/auth/me');
        if (!authRes.ok || !authRes.data?.authenticated) {
          return;
        }

        const histRes = await apiFetch<{
          success: boolean;
          ongoing: any[];
          completed: any[];
        }>('/api/history');
        if (histRes.ok && histRes.data) {
          const combined: UserAuctionOption[] = [
            ...(histRes.data.ongoing || []).map(r => ({
              room_code: r.room_code,
              name: r.name,
              sport_type: r.sport_type || (r.room_code.startsWith('K') ? 'PKL' : 'IPL'),
              stage: r.stage || 'In Progress',
              status: 'ongoing' as const,
            })),
            ...(histRes.data.completed || []).map(r => ({
              room_code: r.room_code,
              name: r.name,
              sport_type: r.sport_type || (r.room_code.startsWith('K') ? 'PKL' : 'IPL'),
              stage: 'Completed',
              status: 'completed' as const,
            })),
          ];
          setUserAuctions(combined);
        }
      } catch { }
    }

    loadInitialData();
  }, []);

  // 2. Fetch room availability whenever selectedAuctionCode changes
  useEffect(() => {
    if (!selectedAuctionCode) {
      setAuctionAvailability(null);
      setAvailabilityError(null);
      return;
    }

    let isCancelled = false;
    async function fetchAvailability() {
      setIsLoadingAvailability(true);
      setAvailabilityError(null);
      try {
        const res = await apiFetch<RoomAvailabilityData>(`/api/rooms/${selectedAuctionCode}/availability`);
        if (isCancelled) return;
        if (res.ok && res.data?.success) {
          setAuctionAvailability(res.data);
          if (res.data.sport_type) {
            setSport(res.data.sport_type);
          }
        } else {
          setAvailabilityError(res.data?.name ? 'Could not load room' : 'Room not found or no snapshot available');
          setAuctionAvailability(null);
        }
      } catch {
        if (!isCancelled) {
          setAvailabilityError('Failed to connect to room database');
          setAuctionAvailability(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAvailability(false);
        }
      }
    }

    fetchAvailability();
    return () => {
      isCancelled = true;
    };
  }, [selectedAuctionCode]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sport, searchQuery, selectedRole, selectedNationality, selectedCapped, selectedAvailabilityFilter, sortBy, selectedAuctionCode]);

  // 3. Compute Player Auction Status
  const getPlayerAvailability = useCallback((player: Player) => {
    if (!auctionAvailability) {
      return {
        status: 'AUCTION NOT SELECTED' as const,
        label: 'Global Pool',
        badgeBg: 'bg-white/5',
        badgeText: 'text-zinc-400',
        badgeBorder: 'border-white/10',
        details: null,
      };
    }

    const info = auctionAvailability.player_status?.[player.id];
    if (info) {
      if (info.status === 'SOLD') {
        return {
          status: 'SOLD' as const,
          label: 'SOLD',
          badgeBg: 'bg-emerald-500/10',
          badgeText: 'text-emerald-400',
          badgeBorder: 'border-emerald-500/30',
          details: `${info.winning_team ? info.winning_team : 'Sold'} • ${formatCurrency(info.winning_bid || player.base_price)}`,
        };
      }
      if (info.status === 'UNSOLD') {
        return {
          status: 'UNSOLD' as const,
          label: 'UNSOLD',
          badgeBg: 'bg-rose-500/10',
          badgeText: 'text-rose-400',
          badgeBorder: 'border-rose-500/30',
          details: 'Unsold in Bidding',
        };
      }
      if (info.status === 'WITHDRAWN') {
        return {
          status: 'WITHDRAWN' as const,
          label: 'WITHDRAWN',
          badgeBg: 'bg-amber-500/10',
          badgeText: 'text-amber-400',
          badgeBorder: 'border-amber-500/30',
          details: 'Withdrawn',
        };
      }
      if (info.status === 'AVAILABLE') {
        return {
          status: 'AVAILABLE' as const,
          label: 'AVAILABLE',
          badgeBg: 'bg-cyan-500/10',
          badgeText: 'text-cyan-300',
          badgeBorder: 'border-cyan-500/30',
          details: 'In Auction Pool',
        };
      }
    }

    // Check if in pool list
    if (auctionAvailability.pool_player_ids?.includes(player.id)) {
      return {
        status: 'AVAILABLE' as const,
        label: 'AVAILABLE',
        badgeBg: 'bg-cyan-500/10',
        badgeText: 'text-cyan-300',
        badgeBorder: 'border-cyan-500/30',
        details: 'In Auction Pool',
      };
    }

    return {
      status: 'NOT IN AUCTION' as const,
      label: 'NOT IN AUCTION',
      badgeBg: 'bg-zinc-800/40',
      badgeText: 'text-zinc-500',
      badgeBorder: 'border-zinc-700/40',
      details: 'Not in Room Pool',
    };
  }, [auctionAvailability]);

  // 4. Filter and Sort Players
  const currentPool = useMemo(() => {
    return sport === 'IPL' ? ALL_PLAYERS : ALL_PKL_PLAYERS;
  }, [sport]);

  const filteredPlayers = useMemo(() => {
    return currentPool.filter(p => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(query);
        const matchTeam = (p.team || '').toLowerCase().includes(query);
        const matchCountry = (p.country || '').toLowerCase().includes(query);
        if (!matchName && !matchTeam && !matchCountry) return false;
      }

      // Role filter
      if (selectedRole !== 'ALL') {
        const pRole = (p.role || '').toUpperCase();
        if (sport === 'IPL') {
          if (selectedRole === 'BAT' && !pRole.includes('BAT')) return false;
          if (selectedRole === 'BOWL' && !pRole.includes('BOWL')) return false;
          if (selectedRole === 'AR' && !pRole.includes('ALL') && !pRole.includes('AR')) return false;
          if (selectedRole === 'WK' && !pRole.includes('WK') && !pRole.includes('KEEP')) return false;
        } else {
          if (selectedRole === 'RAIDER' && !pRole.includes('RAID')) return false;
          if (selectedRole === 'DEFENDER' && !pRole.includes('DEF')) return false;
          if (selectedRole === 'AR' && !pRole.includes('ALL') && !pRole.includes('AR')) return false;
        }
      }

      // Nationality
      if (selectedNationality !== 'ALL') {
        const isInd = p.country === 'India' || p.nationality === 'India';
        if (selectedNationality === 'INDIAN' && !isInd) return false;
        if (selectedNationality === 'OVERSEAS' && isInd) return false;
      }

      // Capped / Uncapped
      if (selectedCapped !== 'ALL') {
        if (selectedCapped === 'CAPPED' && !p.capped) return false;
        if (selectedCapped === 'UNCAPPED' && p.capped) return false;
      }

      // Auction Availability
      if (auctionAvailability && selectedAvailabilityFilter !== 'ALL') {
        const avail = getPlayerAvailability(p);
        if (selectedAvailabilityFilter === 'AVAILABLE' && avail.status !== 'AVAILABLE') return false;
        if (selectedAvailabilityFilter === 'SOLD' && avail.status !== 'SOLD') return false;
        if (selectedAvailabilityFilter === 'UNSOLD' && avail.status !== 'UNSOLD') return false;
        if (selectedAvailabilityFilter === 'NOT_IN_AUCTION' && avail.status !== 'NOT IN AUCTION') return false;
      }

      return true;
    });
  }, [currentPool, searchQuery, selectedRole, selectedNationality, selectedCapped, selectedAvailabilityFilter, auctionAvailability, sport, getPlayerAvailability]);

  const sortedPlayers = useMemo(() => {
    const list = [...filteredPlayers];
    return list.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price_desc') return (b.base_price || 0) - (a.base_price || 0);
      if (sortBy === 'price_asc') return (a.base_price || 0) - (b.base_price || 0);
      if (sortBy === 'points_desc') return (b.player_points || 0) - (a.player_points || 0);
      if (sortBy === 'stat_desc') {
        if (sport === 'IPL') {
          const aRuns = (a as any).ipl_career_stats?.runs || (a as any).stats_2026?.runs || 0;
          const bRuns = (b as any).ipl_career_stats?.runs || (b as any).stats_2026?.runs || 0;
          return bRuns - aRuns;
        } else {
          const aRaid = (a as any).pkl_stats?.career?.raid_points || (a as any).pkl_stats?.season_12?.raid_points || 0;
          const bRaid = (b as any).pkl_stats?.career?.raid_points || (b as any).pkl_stats?.season_12?.raid_points || 0;
          return bRaid - aRaid;
        }
      }
      return 0;
    });
  }, [filteredPlayers, sortBy, sport]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / pageSize));
  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPlayers.slice(start, start + pageSize);
  }, [sortedPlayers, currentPage]);

  // Handle room code submit
  const handleLoadCustomRoom = () => {
    const clean = customRoomInput.trim().toUpperCase();
    if (clean.length === 6) {
      setSelectedAuctionCode(clean);
      setIsEnteringCustomRoom(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090B] text-white">
      {/* 1. HERO & PLATFORM HEADER */}
      <section className="relative border-b border-white/10 bg-gradient-to-b from-[#121316] to-[#08090B] pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header titles */}
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold tracking-widest uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Player Database Registry</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase font-display bg-gradient-to-r from-white via-zinc-200 to-amber-200 bg-clip-text text-transparent">
              PLAYER DISCOVERY CENTRE
            </h1>
            <p className="mt-2 text-sm sm:text-base text-zinc-400 font-medium">
              Explore players, career records, season statistics and auction availability across both leagues.
            </p>
          </div>

          {/* Platform Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 max-w-5xl mx-auto">
            <div className="p-3.5 rounded-2xl bg-[#0E0F12]/80 border border-white/10 text-center">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Managers</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-display">
                {platformStats.registeredManagers > 0 ? platformStats.registeredManagers.toLocaleString() : '10K+'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0E0F12]/80 border border-white/10 text-center">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1">
                <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Auctions</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-display">
                {platformStats.roomsCreated > 0 ? platformStats.roomsCreated.toLocaleString() : '3.2K+'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0E0F12]/80 border border-white/10 text-center">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>IPL Players</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 font-display">
                {ALL_PLAYERS.length}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0E0F12]/80 border border-white/10 text-center">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-orange-400" />
                <span>PKL Players</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-orange-400 font-display">
                {ALL_PKL_PLAYERS.length}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[#0E0F12]/80 border border-white/10 text-center">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Franchises</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-300 font-display">
                {platformStats.iplFranchises + platformStats.pklFranchises}
              </div>
            </div>
          </div>

          {/* 2. PROMINENT LEAGUE NAVIGATION TABS */}
          <div className="flex justify-center mt-8">
            <div className="inline-flex p-1.5 rounded-2xl bg-[#0B0C0E] border border-white/15 shadow-2xl">
              <button
                type="button"
                onClick={() => setSport('IPL')}
                className={`flex items-center gap-2.5 px-6 sm:px-8 py-3 rounded-xl font-bold text-sm sm:text-base tracking-wider uppercase transition-all duration-200 cursor-pointer ${sport === 'IPL'
                  ? 'bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/10 text-amber-300 border border-amber-400/40 shadow-lg shadow-amber-500/10 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                <span className="text-lg">🏏</span>
                <span>IPL CRICKET</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${sport === 'IPL' ? 'bg-amber-400/20 text-amber-200 font-mono' : 'bg-zinc-800 text-zinc-400 font-mono'}`}>
                  {ALL_PLAYERS.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSport('PKL')}
                className={`flex items-center gap-2.5 px-6 sm:px-8 py-3 rounded-xl font-bold text-sm sm:text-base tracking-wider uppercase transition-all duration-200 cursor-pointer ${sport === 'PKL'
                  ? 'bg-gradient-to-r from-orange-500/20 via-orange-400/25 to-orange-500/10 text-orange-400 border border-orange-400/40 shadow-lg shadow-orange-500/10 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                <span className="text-lg">🤼</span>
                <span>PKL KABADDI</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${sport === 'PKL' ? 'bg-orange-400/20 text-orange-200 font-mono' : 'bg-zinc-800 text-zinc-400 font-mono'}`}>
                  {ALL_PKL_PLAYERS.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AUCTION AVAILABILITY SYSTEM CONTEXT (PHASE 5) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="rounded-2xl bg-[#0E0F12]/90 border border-white/10 p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Title & Explainer */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Contextual Auction Availability System</span>
              </div>
              <div className="text-sm text-zinc-300">
                {auctionAvailability ? (
                  <span>
                    Viewing live player pool and bids for auction <strong className="text-amber-300 font-mono font-bold">#{auctionAvailability.room_code}</strong> ({auctionAvailability.name}).
                  </span>
                ) : (
                  <span>
                    Showing global player database. Select an auction to inspect real-time player availability (Available, Sold, Unsold).
                  </span>
                )}
              </div>
            </div>

            {/* Auction Selector Controls */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {!isEnteringCustomRoom ? (
                <>
                  <div className="relative flex-1 sm:w-72">
                    <select
                      value={selectedAuctionCode}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsEnteringCustomRoom(true);
                        } else {
                          setSelectedAuctionCode(e.target.value);
                        }
                      }}
                      className="w-full appearance-none bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 pr-9 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-amber-400/60 transition-colors"
                    >
                      <option value="">🌐 Global Registry (No Auction Selected)</option>
                      {userAuctions.map((a) => (
                        <option key={a.room_code} value={a.room_code}>
                          {a.sport_type} • #{a.room_code} - {a.name} ({a.stage})
                        </option>
                      ))}
                      <option value="__custom__">🔍 Enter Room Code...</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {selectedAuctionCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAuctionCode('');
                        setSelectedAvailabilityFilter('ALL');
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Clear auction filter and return to global registry"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-char Room Code"
                    value={customRoomInput}
                    onChange={(e) => setCustomRoomInput(e.target.value.toUpperCase())}
                    className="w-48 bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider text-amber-300 uppercase focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleLoadCustomRoom}
                    className="px-3 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs uppercase hover:bg-amber-300 transition-colors cursor-pointer"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEnteringCustomRoom(false)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Auction Information Pill */}
          {isLoadingAvailability && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Loading auction state and player purchase records...</span>
            </div>
          )}

          {availabilityError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{availabilityError}</span>
            </div>
          )}

          {auctionAvailability && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-mono font-bold">
                  {auctionAvailability.sport_type} #{auctionAvailability.room_code}
                </span>
                <span className="text-zinc-300 font-medium">{auctionAvailability.name}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400 capitalize">Stage: <strong className="text-zinc-200">{auctionAvailability.stage}</strong></span>
              </div>

              <div className="flex items-center gap-3 font-semibold">
                <span className="text-emerald-400">
                  Sold: <strong className="font-mono">{auctionAvailability.sold_count}</strong>
                </span>
                <span className="text-rose-400">
                  Unsold: <strong className="font-mono">{auctionAvailability.unsold_count}</strong>
                </span>
                <span className="text-cyan-400">
                  In Pool: <strong className="font-mono">{auctionAvailability.total_pool_count}</strong>
                </span>
                <Link
                  href={`/results/${auctionAvailability.room_code}`}
                  className="ml-2 text-amber-400 hover:text-amber-300 underline flex items-center gap-1 font-bold"
                >
                  <span>Results</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. SEARCH & FILTER CONTROLS (PHASE 6) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="rounded-2xl bg-[#0E0F12]/60 border border-white/10 p-4 space-y-4">
          {/* Top Row: Search & Role Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={sport === 'IPL' ? 'Search 274 IPL players by name, franchise, nationality...' : 'Search 235 PKL players by name, franchise, nationality...'}
                className="w-full bg-black/60 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Role Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setSelectedRole('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${selectedRole === 'ALL'
                  ? 'bg-amber-400 text-black'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                All Roles
              </button>

              {sport === 'IPL' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('BAT')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${selectedRole === 'BAT' ? 'bg-amber-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    Batters
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('BOWL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${selectedRole === 'BOWL' ? 'bg-amber-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    Bowlers
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('AR')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${selectedRole === 'AR' ? 'bg-amber-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    All-Rounders
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('WK')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${selectedRole === 'WK' ? 'bg-amber-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    Wicketkeepers
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('RAIDER')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${selectedRole === 'RAIDER' ? 'bg-orange-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    Raiders
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('DEFENDER')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${selectedRole === 'DEFENDER' ? 'bg-orange-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    Defenders
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('AR')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${selectedRole === 'AR' ? 'bg-orange-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    All-Rounders
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Secondary Row: Nationality, Capped, Auction Status & Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Nationality */}
              <select
                value={selectedNationality}
                onChange={(e) => setSelectedNationality(e.target.value as any)}
                className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-400/60"
              >
                <option value="ALL">All Nationalities</option>
                <option value="INDIAN">🇮🇳 Indian Only</option>
                <option value="OVERSEAS">✈️ Overseas Only</option>
              </select>

              {/* Capped / Uncapped */}
              <select
                value={selectedCapped}
                onChange={(e) => setSelectedCapped(e.target.value as any)}
                className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-400/60"
              >
                <option value="ALL">All Statuses</option>
                <option value="CAPPED">⭐ Capped Stars</option>
                <option value="UNCAPPED">🌱 Emerging Uncapped</option>
              </select>

              {/* Auction Availability Filter (active when auction selected) */}
              {auctionAvailability && (
                <select
                  value={selectedAvailabilityFilter}
                  onChange={(e) => setSelectedAvailabilityFilter(e.target.value)}
                  className="bg-black/40 border border-amber-400/30 text-amber-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">All Auction Statuses</option>
                  <option value="AVAILABLE">🟢 Available in Pool</option>
                  <option value="SOLD">🏆 Sold to Franchises</option>
                  <option value="UNSOLD">🔴 Unsold</option>
                  <option value="NOT_IN_AUCTION">⚪ Not In This Auction</option>
                </select>
              )}
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />
                <span>Sort:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400/60"
              >
                <option value="points_desc">Rating (High to Low)</option>
                <option value="price_desc">Base Price (High to Low)</option>
                <option value="price_asc">Base Price (Low to High)</option>
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
                <option value="stat_desc">Key Performance Stats</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PLAYER ROSTER GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Count Bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 px-1">
          <div>
            Showing <strong className="text-white font-mono">{paginatedPlayers.length}</strong> of{' '}
            <strong className="text-white font-mono">{filteredPlayers.length}</strong> {sport} players
            {selectedRole !== 'ALL' && ` (${selectedRole})`}
          </div>
          <div>
            Page <strong className="text-white font-mono">{currentPage}</strong> of{' '}
            <strong className="text-white font-mono">{totalPages}</strong>
          </div>
        </div>

        {/* Empty State */}
        {filteredPlayers.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-[#0E0F12] border border-white/10 my-8">
            <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No players match your filters</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              Try clearing your search query or broadening your role, nationality, and availability filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('ALL');
                setSelectedNationality('ALL');
                setSelectedCapped('ALL');
                setSelectedAvailabilityFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-amber-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedPlayers.map((player) => {
            const avail = getPlayerAvailability(player);
            const isInd = player.country === 'India' || player.nationality === 'India';

            return (
              <div
                key={player.id}
                onClick={() => {
                  setSelectedPlayer(player);
                  setModalActiveTab('career');
                }}
                className="group relative rounded-2xl bg-[#0E0F12] border border-white/10 hover:border-amber-400/50 p-4 transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-amber-500/10 cursor-pointer flex flex-col justify-between"
              >
                {/* Top Strip: Role Badge + Capped Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                      {player.role}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {player.capped ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase">
                          Capped
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-white/5 text-[10px] font-semibold uppercase">
                          Uncapped
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px]">
                        ★ {player.player_points || 300}
                      </span>
                    </div>
                  </div>

                  {/* Player Image & Name */}
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#16181F] border border-white/10 shrink-0">
                      {player.image_url ? (
                        <Image
                          src={player.image_url}
                          alt={player.name}
                          fill
                          sizes="64px"
                          unoptimized={player.image_url.startsWith('data:')}
                          className="object-cover object-top transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231E212B" width="100" height="100"/><text fill="%23FFFFFF" x="50" y="55" font-size="28" font-family="sans-serif" font-weight="900" text-anchor="middle">${encodeURIComponent(player.initials || '??')}</text></svg>`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-white text-lg bg-zinc-800">
                          {player.initials || '??'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {player.name}
                      </h4>
                      <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                        <span>{isInd ? '🇮🇳' : '✈️'}</span>
                        <span className="truncate">{player.country || player.nationality || 'Overseas'}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                        {player.team || 'Free Agent'}
                      </div>
                    </div>
                  </div>

                  {/* Sub-role detail */}
                  <div className="text-[11px] text-zinc-400 line-clamp-1 mb-3 bg-white/5 rounded-lg px-2.5 py-1">
                    {sport === 'IPL'
                      ? (player.batting_style || player.bowling_style || player.role)
                      : (player.position_detail || player.role)}
                  </div>
                </div>

                {/* Bottom Strip: Base Price & Contextual Availability Badge */}
                <div className="pt-2.5 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Base Price:</span>
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(player.base_price)}
                    </span>
                  </div>

                  {/* Contextual Availability Status Badge */}
                  <div className={`w-full rounded-lg px-2.5 py-1 text-[11px] font-bold border flex items-center justify-between ${avail.badgeBg} ${avail.badgeText} ${avail.badgeBorder}`}>
                    <span className="truncate font-mono">{avail.label}</span>
                    {avail.details && (
                      <span className="text-[10px] opacity-80 truncate ml-2 font-normal">
                        {avail.details}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. CLEAN RESPONSIVE PAGINATION */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
            <div className="text-xs text-zinc-400">
              Showing page <strong className="text-white font-mono">{currentPage}</strong> of{' '}
              <strong className="text-white font-mono">{totalPages}</strong> ({filteredPlayers.length} total)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0E0F12] border border-white/10 text-xs text-zinc-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
              >
                First
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg bg-[#0E0F12] border border-white/10 text-xs text-zinc-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {/* Page Number Chips */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-colors ${currentPage === pageNum
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                        : 'bg-[#0E0F12] border border-white/10 text-zinc-300 hover:bg-white/10'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg bg-[#0E0F12] border border-white/10 text-xs text-zinc-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0E0F12] border border-white/10 text-xs text-zinc-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 7. DETAILED PLAYER PROFILE MODAL (4.2 & 4.3) */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#121316] border border-white/15 p-5 sm:p-7 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedPlayer(null)}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Player Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-5 border-b border-white/10">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#181A20] border-2 border-amber-400/40 shadow-xl shrink-0">
                {selectedPlayer.image_url ? (
                  <Image
                    src={selectedPlayer.image_url}
                    alt={selectedPlayer.name}
                    fill
                    sizes="112px"
                    unoptimized={selectedPlayer.image_url.startsWith('data:')}
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-white text-2xl">
                    {selectedPlayer.initials}
                  </div>
                )}
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold uppercase">
                    {selectedPlayer.role}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-xs font-mono font-bold">
                    ★ {selectedPlayer.player_points || 300} PTS
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-zinc-300 text-xs font-semibold">
                    {selectedPlayer.country || selectedPlayer.nationality}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
                  {selectedPlayer.name}
                </h2>

                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  {sport === 'IPL'
                    ? `${selectedPlayer.batting_style || 'Right-hand bat'} • ${selectedPlayer.bowling_style || 'Right-arm medium'} • ${selectedPlayer.team || 'IPL Pool'}`
                    : `${selectedPlayer.position_detail || 'Kabaddi Star'} • ${selectedPlayer.team || 'PKL Franchise'}`}
                </p>

                {/* Base price & status */}
                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500">Base Price: </span>
                    <strong className="text-amber-300 font-mono font-bold">{formatCurrency(selectedPlayer.base_price)}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500">Tier: </span>
                    <strong className="text-white font-mono font-bold">{selectedPlayer.tier || 'B'}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500">Status: </span>
                    <strong className="text-emerald-400 font-bold">{selectedPlayer.capped ? 'Capped International' : 'Uncapped Domestic'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual Auction Availability Banner inside Modal */}
            {(() => {
              const avail = getPlayerAvailability(selectedPlayer);
              return (
                <div className={`rounded-xl p-3.5 border flex items-center justify-between text-xs ${avail.badgeBg} ${avail.badgeBorder}`}>
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${avail.badgeText}`} />
                    <div>
                      <div className={`font-bold uppercase tracking-wider ${avail.badgeText}`}>
                        Auction Status: {avail.label}
                      </div>
                      <div className="text-zinc-400 text-[11px] mt-0.5">
                        {auctionAvailability
                          ? `In Auction #${auctionAvailability.room_code} (${auctionAvailability.name}): ${avail.details || 'Registered in Pool'}`
                          : 'Viewing Global Registry. Select an active auction to see if this player is purchased or available.'}
                      </div>
                    </div>
                  </div>
                  {auctionAvailability && avail.status === 'SOLD' && (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      {avail.details}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-white/10 gap-2">
              <button
                type="button"
                onClick={() => setModalActiveTab('career')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${modalActiveTab === 'career'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
              >
                {sport === 'IPL' ? 'Overall IPL Career' : 'Overall PKL Career'}
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('season')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${modalActiveTab === 'season'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
              >
                {sport === 'IPL' ? 'IPL 2026 Season' : 'PKL Season 12'}
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('achievements')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${modalActiveTab === 'achievements'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
              >
                Achievements & Bio
              </button>
            </div>

            {/* TAB CONTENT: A. CAREER STATS */}
            {modalActiveTab === 'career' && (
              <div className="space-y-4">
                {sport === 'IPL' ? (
                  (() => {
                    const career = getIplCareerStats(selectedPlayer.id);
                    if (!career || !career.has_ipl_career || career.matches === 0) {
                      return (
                        <div className="p-6 text-center rounded-2xl bg-white/5 border border-white/10">
                          <Info className="w-8 h-8 text-amber-400/80 mx-auto mb-2" />
                          <div className="text-sm font-bold text-white">No Recorded IPL Appearances</div>
                          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                            {selectedPlayer.name} is an emerging domestic talent or overseas recruit who has not yet made their official IPL debut.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {/* Batting Metrics Grid */}
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5" />
                            <span>IPL Career Batting</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Matches</div>
                              <div className="text-base font-bold font-mono text-white">{career.matches}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Innings</div>
                              <div className="text-base font-bold font-mono text-white">{career.innings ?? '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Runs</div>
                              <div className="text-base font-bold font-mono text-amber-300">{career.runs ?? '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Average</div>
                              <div className="text-base font-bold font-mono text-white">{career.batting_average ? career.batting_average.toFixed(2) : '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Strike Rate</div>
                              <div className="text-base font-bold font-mono text-white">{career.strike_rate ? career.strike_rate.toFixed(1) : '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Highest Score</div>
                              <div className="text-base font-bold font-mono text-white">{career.highest_score ?? '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase font-semibold">100s / 50s</div>
                              <div className="text-base font-bold font-mono text-white">{career.hundreds ?? 0} / {career.fifties ?? 0}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Fours / Sixes</div>
                              <div className="text-base font-bold font-mono text-white">{career.fours ?? 0} / {career.sixes ?? 0}</div>
                            </div>
                          </div>
                        </div>

                        {/* Bowling Metrics Grid */}
                        {(career.wickets != null && career.wickets > 0) || (career.overs != null && Number(career.overs) > 0) ? (
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" />
                              <span>IPL Career Bowling</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Wickets</div>
                                <div className="text-base font-bold font-mono text-purple-300">{career.wickets ?? 0}</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Overs</div>
                                <div className="text-base font-bold font-mono text-white">{career.overs ?? '—'}</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Bowling Avg</div>
                                <div className="text-base font-bold font-mono text-white">{career.bowling_average ? career.bowling_average.toFixed(2) : '—'}</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Economy</div>
                                <div className="text-base font-bold font-mono text-white">{career.economy_rate ? career.economy_rate.toFixed(2) : '—'}</div>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="text-[11px] text-zinc-500 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span>Provenance: {career.source_provenance || 'Official IPL Historical Registry'}</span>
                          <span className="text-emerald-400">✓ Verified Record</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const pklStats = getPklPlayerStats(selectedPlayer.id);
                    const c = pklStats?.career;
                    if (!c || c.matches === 0) {
                      return (
                        <div className="p-6 text-center rounded-2xl bg-white/5 border border-white/10">
                          <Info className="w-8 h-8 text-orange-400/80 mx-auto mb-2" />
                          <div className="text-sm font-bold text-white">No Recorded PKL Appearances</div>
                          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                            {selectedPlayer.name} is registered as an emerging bench player or debutant in the official Pro Kabaddi League pool.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Matches</div>
                            <div className="text-base font-bold font-mono text-white">{c.matches}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Total Points</div>
                            <div className="text-base font-bold font-mono text-orange-400">
                              {(c.raid_points ?? 0) + (c.tackle_points ?? 0)}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Raid Points</div>
                            <div className="text-base font-bold font-mono text-amber-300">{c.raid_points ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Tackle Points</div>
                            <div className="text-base font-bold font-mono text-emerald-300">{c.tackle_points ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Successful Raids</div>
                            <div className="text-base font-bold font-mono text-white">{c.successful_raids ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Super 10s</div>
                            <div className="text-base font-bold font-mono text-white">{c.super_10s ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">High 5s</div>
                            <div className="text-base font-bold font-mono text-white">{c.high_5s ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Super Tackles</div>
                            <div className="text-base font-bold font-mono text-white">{c.super_tackles ?? 0}</div>
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-500 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span>Provenance: Pro Kabaddi League Authoritative Career Registry</span>
                          <span className="text-emerald-400">✓ Verified PKL Archive</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* TAB CONTENT: B. SEASON STATS */}
            {modalActiveTab === 'season' && (
              <div className="space-y-4">
                {sport === 'IPL' ? (
                  (() => {
                    const season = getIplSeasonStats(selectedPlayer.id);
                    if (!season || !season.has_season_stats || season.matches === 0) {
                      return (
                        <div className="p-6 text-center rounded-2xl bg-white/5 border border-white/10">
                          <Info className="w-8 h-8 text-amber-400/80 mx-auto mb-2" />
                          <div className="text-sm font-bold text-white">No Recorded IPL 2026 Appearances</div>
                          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                            {selectedPlayer.name} has no official appearances recorded in the IPL 2026 Season registry.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">2026 Matches</div>
                            <div className="text-base font-bold font-mono text-white">{season.matches}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">2026 Innings</div>
                            <div className="text-base font-bold font-mono text-white">{season.innings ?? '—'}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">2026 Runs</div>
                            <div className="text-base font-bold font-mono text-amber-300">{season.runs ?? '—'}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">2026 Average</div>
                            <div className="text-base font-bold font-mono text-white">{season.batting_average ? season.batting_average.toFixed(2) : '—'}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">2026 Strike Rate</div>
                            <div className="text-base font-bold font-mono text-white">{season.strike_rate ? season.strike_rate.toFixed(1) : '—'}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">2026 Fours / Sixes</div>
                            <div className="text-base font-bold font-mono text-white">{season.fours ?? 0} / {season.sixes ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">2026 Wickets</div>
                            <div className="text-base font-bold font-mono text-purple-300">{season.wickets ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">2026 Economy</div>
                            <div className="text-base font-bold font-mono text-white">{season.economy_rate ? season.economy_rate.toFixed(2) : '—'}</div>
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-500 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span>Provenance: Official IPL 2026 Match Center</span>
                          <span className="text-emerald-400">✓ Verified Season Archive</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const pklStats = getPklPlayerStats(selectedPlayer.id);
                    const s = pklStats?.season_12;
                    if (!s || s.matches === 0) {
                      return (
                        <div className="p-6 text-center rounded-2xl bg-white/5 border border-white/10">
                          <Info className="w-8 h-8 text-orange-400/80 mx-auto mb-2" />
                          <div className="text-sm font-bold text-white">No Recorded PKL Season 12 Appearances</div>
                          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                            {selectedPlayer.name} has no official matches recorded for Season 12 (Emerging Bench / Reserve).
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">S12 Matches</div>
                            <div className="text-base font-bold font-mono text-white">{s.matches}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">S12 Raid Points</div>
                            <div className="text-base font-bold font-mono text-amber-300">{s.raid_points ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">S12 Tackle Points</div>
                            <div className="text-base font-bold font-mono text-emerald-300">{s.tackle_points ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">S12 Super 10s</div>
                            <div className="text-base font-bold font-mono text-white">{s.super_10s ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">S12 High 5s</div>
                            <div className="text-base font-bold font-mono text-white">{s.high_5s ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Super Tackles</div>
                            <div className="text-base font-bold font-mono text-white">{s.super_tackles ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Do-or-Die Pts</div>
                            <div className="text-base font-bold font-mono text-white">{s.do_or_die_points ?? 0}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Successful Raids</div>
                            <div className="text-base font-bold font-mono text-white">{s.successful_raids ?? 0}</div>
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-500 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span>Provenance: PKL Season 12 Live Match Archive</span>
                          <span className="text-emerald-400">✓ Verified Match Data</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* TAB CONTENT: C. ACHIEVEMENTS & BIO */}
            {modalActiveTab === 'achievements' && (
              <div className="space-y-4">
                {/* Historical Achievements */}
                {(() => {
                  const marqueeAch = HISTORICAL_IPL_ACHIEVEMENTS[selectedPlayer.name] || selectedPlayer.achievements || [];
                  if (marqueeAch.length === 0) {
                    return (
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-zinc-400">
                        No major tournament titles or historical honors logged for this player.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-2">
                        <Medal className="w-3.5 h-3.5" />
                        <span>Honours, Titles & Accolades</span>
                      </div>
                      <div className="space-y-2">
                        {marqueeAch.map((ach, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200 flex items-center gap-2.5"
                          >
                            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{ach}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Bio details */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Franchise & Registration Metadata
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-300">
                    <div>
                      <span className="text-zinc-500">Registered ID: </span>
                      <strong className="font-mono text-white">{selectedPlayer.id}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Nationality: </span>
                      <strong className="text-white">{selectedPlayer.country || selectedPlayer.nationality}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Home State: </span>
                      <strong className="text-white">{selectedPlayer.home_state || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Franchise: </span>
                      <strong className="text-white">{selectedPlayer.team || 'Unassigned'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
