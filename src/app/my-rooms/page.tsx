'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/shared/constants';
import {
  Users,
  PlusCircle,
  LogIn,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  Search,
  Filter,
  Trophy,
  Flame,
  Activity,
  Layers,
  LogOut,
  Ban,
} from 'lucide-react';

interface MyRoom {
  room_code: string;
  name: string;
  sport_type: 'IPL' | 'PKL';
  host_name: string;
  is_host: boolean;
  user_team_name: string | null;
  user_team_short_code: string | null;
  user_team_color: string | null;
  participant_count: number;
  participating_teams: string[];
  status_group: 'active' | 'waiting' | 'completed' | 'terminated';
  status: string;
  stage: string;
  phase: string;
  termination_reason?: string | null;
  terminated_at?: string | null;
  user_participation_status?: string | null;
  sold_count: number;
  unsold_count: number;
  total_pool_count: number;
  user_purse_remaining: number | null;
  user_squad_count: number | null;
  created_at: string;
  last_activity: string;
}

type FilterTab = 'all' | 'active' | 'waiting' | 'completed' | 'terminated';

export default function MyRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<'ALL' | 'IPL' | 'PKL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [leavingCode, setLeavingCode] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const authRes = await apiFetch<{ authenticated: boolean }>('/api/auth/me');
      if (!authRes.ok || !authRes.data?.authenticated) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const { ok, status, data } = await apiFetch('/api/my-rooms');
      if (status === 401) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      if (ok && data) {
        setIsAuthenticated(true);
        setRooms(data.rooms || []);
      }
    } catch (e) {
      console.warn('[MY_ROOMS] Fetch failed:', e);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  const handleLeaveOrArchive = async (room: MyRoom) => {
    const actionLabel = room.is_host ? 'archive and close' : 'leave';
    if (!confirm(`Are you sure you want to ${actionLabel} room ${room.room_code} (${room.name})?`)) {
      return;
    }
    setLeavingCode(room.room_code);
    try {
      const { ok } = await apiFetch('/api/my-rooms', {
        method: 'POST',
        body: JSON.stringify({
          room_code: room.room_code,
          action: room.is_host ? 'archive' : 'leave',
        }),
      });
      if (ok) {
        setRooms(prev => prev.filter(r => r.room_code !== room.room_code));
      }
    } catch (e) {
      console.warn('[MY_ROOMS] Leave/archive failed:', e);
    } finally {
      setLeavingCode(null);
    }
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

  // Filter and search logic
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // 1. Tab filter
      if (activeTab !== 'all' && r.status_group !== activeTab) {
        return false;
      }
      // 2. Sport filter
      if (sportFilter !== 'ALL' && r.sport_type !== sportFilter) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesCode = r.room_code.toLowerCase().includes(q);
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesTeam = r.user_team_name?.toLowerCase().includes(q) || false;
        const matchesHost = r.host_name.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesTeam && !matchesHost) {
          return false;
        }
      }
      return true;
    });
  }, [rooms, activeTab, sportFilter, searchQuery]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: rooms.length,
      active: rooms.filter((r) => r.status_group === 'active').length,
      waiting: rooms.filter((r) => r.status_group === 'waiting').length,
      completed: rooms.filter((r) => r.status_group === 'completed').length,
      terminated: rooms.filter((r) => r.status_group === 'terminated').length,
    };
  }, [rooms]);

  const getStageLabel = (stage: string, phase: string, statusGroup: string) => {
    if (statusGroup === 'terminated' || phase === 'terminated') return 'Terminated';
    if (statusGroup === 'completed') return 'Completed';
    if (statusGroup === 'waiting') return 'Waiting in Lobby';
    if (stage === 'trading_window') return 'Trading Window';
    if (stage === 'playing_xi_selection') return 'Playing XI Selection';
    if (stage === 'retention_stage') return 'Retention Stage';
    if (stage === 'rtm_stage') return 'RTM Window';
    if (phase === 'bidding') return 'Live Bidding';
    if (phase === 'paused') return 'Auction Paused';
    return 'Live Auction';
  };

  return (
    <div className="min-h-screen pb-24 pt-6 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-night-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-widest mb-3">
            <Users className="w-3.5 h-3.5" />
            Your Auction Hub
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-floodlight tracking-tight">
            MY ROOMS
          </h1>
          <p className="text-sm text-floodlight-muted mt-1 max-w-xl">
            Manage, resume, and monitor all auction rooms you own or have joined as an active franchise manager.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#17130A] font-bold text-xs shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Room</span>
          </Link>
          <Link
            href="/join"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-floodlight border border-white/10 font-bold text-xs transition-all active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Join with Code</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
        {/* Status Category Tabs */}
        <div className="flex items-center bg-night-raised border border-night-border rounded-xl p-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-amber-400 text-[#17130A] shadow-sm'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Rooms</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'all'
                  ? 'bg-black/20 text-[#17130A]'
                  : 'bg-night-border text-floodlight-muted'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-amber-400 text-[#17130A] shadow-sm'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  activeTab === 'active' ? 'bg-[#17130A]' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  activeTab === 'active' ? 'bg-[#17130A]' : 'bg-emerald-400'
                }`}
              />
            </span>
            <span>Active Rooms</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'active'
                  ? 'bg-black/20 text-[#17130A]'
                  : 'bg-night-border text-floodlight-muted'
              }`}
            >
              {counts.active}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('waiting')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'waiting'
                ? 'bg-amber-400 text-[#17130A] shadow-sm'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Waiting Rooms</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'waiting'
                  ? 'bg-black/20 text-[#17130A]'
                  : 'bg-night-border text-floodlight-muted'
              }`}
            >
              {counts.waiting}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-amber-400 text-[#17130A] shadow-sm'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Completed</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'completed'
                  ? 'bg-black/20 text-[#17130A]'
                  : 'bg-night-border text-floodlight-muted'
              }`}
            >
              {counts.completed}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('terminated')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'terminated'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-floodlight-muted hover:text-floodlight'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Terminated</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'terminated'
                  ? 'bg-black/20 text-white'
                  : 'bg-night-border text-floodlight-muted'
              }`}
            >
              {counts.terminated}
            </span>
          </button>
        </div>

        {/* Search input and Sport toggle */}
        <div className="flex items-center gap-2.5">
          {/* Sport filter buttons */}
          <div className="flex items-center bg-night-raised border border-night-border rounded-xl p-1 text-xs font-semibold">
            {(['ALL', 'IPL', 'PKL'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  sportFilter === s
                    ? 'bg-white/15 text-amber-300 font-bold'
                    : 'text-floodlight-muted hover:text-floodlight'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-floodlight-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code or room..."
              className="w-full bg-night-raised border border-night-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-floodlight placeholder:text-floodlight-muted/60 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-floodlight-muted tracking-wider uppercase">Loading your rooms...</p>
        </div>
      ) : isAuthenticated === false ? (
        <div className="py-20 text-center max-w-md mx-auto p-8 rounded-2xl bg-night-raised border border-night-border">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-floodlight mb-2">Authentication Required</h2>
          <p className="text-sm text-floodlight-muted mb-6">
            Sign in to view your created and joined auction rooms.
          </p>
          <Link
            href="/login?redirect=/my-rooms"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#17130A] font-bold text-sm shadow-md transition-all"
          >
            <LogIn className="w-4 h-4" />
            Sign In Now
          </Link>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-20 text-center max-w-md mx-auto p-8 rounded-2xl bg-night-raised border border-night-border">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4 text-amber-300">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-floodlight mb-1">
            {activeTab === 'all'
              ? 'No Auction Rooms Found'
              : `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Rooms Found`}
          </h2>
          <p className="text-xs text-floodlight-muted mb-6 leading-relaxed">
            {searchQuery
              ? `No rooms matched "${searchQuery}". Try adjusting your search query.`
              : activeTab === 'waiting'
              ? 'You do not have any rooms currently waiting in the lobby.'
              : activeTab === 'active'
              ? 'You do not have any active live bidding auctions right now.'
              : 'Create a new auction room or join an existing auction with a room code to get started.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/create"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#17130A] font-bold text-xs shadow-md transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Auction</span>
            </Link>
            <Link
              href="/join"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-floodlight border border-white/10 font-bold text-xs transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join with Code</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredRooms.map((room) => {
            const isPkl = room.sport_type === 'PKL';
            const isTerminated = room.status_group === 'terminated' || room.status === 'terminated' || room.phase === 'terminated';
            const isLive = !isTerminated && room.status_group === 'active';
            const isWaiting = !isTerminated && room.status_group === 'waiting';
            const isCompleted = !isTerminated && room.status_group === 'completed';

            const actionHref = isCompleted
              ? `/results/${room.room_code}`
              : `/room/${room.room_code}`;
            const actionLabel = isTerminated
              ? 'View Termination Details'
              : isCompleted
              ? 'View Results'
              : isWaiting
              ? 'Enter Lobby'
              : 'Continue Auction';

            return (
              <div
                key={room.room_code}
                className={`group relative rounded-2xl bg-night-raised border transition-all duration-300 p-5 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl ${
                  isTerminated
                    ? 'border-red-500/30 hover:border-red-500/60'
                    : 'border-night-border hover:border-amber-400/40'
                }`}
              >
                {/* Top card accent glow */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isTerminated
                      ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600'
                      : isLive
                      ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500'
                      : isWaiting
                      ? 'bg-gradient-to-r from-amber-500/50 via-amber-400 to-amber-500/50'
                      : 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500'
                  }`}
                />

                {/* Header row: sport badge + room code + copy */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border ${
                          isPkl
                            ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        }`}
                      >
                        {room.sport_type}
                      </span>

                      {/* Status indicator */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isTerminated
                            ? 'bg-red-500/15 border-red-500/30 text-red-300'
                            : isLive
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : isWaiting
                            ? 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                            : 'bg-white/10 border-white/20 text-floodlight-muted'
                        }`}
                      >
                        {isLive && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                          </span>
                        )}
                        {getStageLabel(room.stage, room.phase, room.status_group)}
                      </span>
                      {isTerminated && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-500/20 border border-red-500/40 text-red-300">
                          {room.user_participation_status || 'DISQUALIFIED'}
                        </span>
                      )}
                    </div>

                    {/* Room code badge with click-to-copy */}
                    <button
                      onClick={(e) => handleCopyCode(room.room_code, e)}
                      title="Click to copy room code"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono font-bold text-amber-300 transition-colors"
                    >
                      <span>{room.room_code}</span>
                      {copiedCode === room.room_code ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-floodlight-muted" />
                      )}
                    </button>
                  </div>

                  {/* Room Name */}
                  <h3 className="font-display font-bold text-lg text-floodlight tracking-tight group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                    {room.name}
                  </h3>

                  {/* Host info */}
                  <div className="flex items-center gap-2 text-xs text-floodlight-muted mb-4">
                    <span className="inline-flex items-center gap-1">
                      <Shield className="w-3 h-3 text-amber-400" />
                      {room.is_host ? (
                        <span className="font-semibold text-amber-300/90">You (Host)</span>
                      ) : (
                        <span>Host: {room.host_name}</span>
                      )}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {room.participant_count} {room.participant_count === 1 ? 'Manager' : 'Managers'}
                    </span>
                  </div>

                  {/* Participant & Team details box */}
                  <div className="p-3 rounded-xl bg-night border border-night-border/80 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-floodlight-muted">Your Franchise:</span>
                      {room.user_team_name ? (
                        <span className="font-bold text-floodlight flex items-center gap-1.5">
                          {room.user_team_color && (
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: room.user_team_color }}
                            />
                          )}
                          {room.user_team_short_code
                            ? `${room.user_team_short_code} — ${room.user_team_name}`
                            : room.user_team_name}
                        </span>
                      ) : (
                        <span className="text-floodlight-muted/70 italic text-[11px]">
                          Not selected yet
                        </span>
                      )}
                    </div>

                    {room.user_purse_remaining !== null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-floodlight-muted">Purse Remaining:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {formatCurrency(room.user_purse_remaining)}
                        </span>
                      </div>
                    )}

                    {room.user_squad_count !== null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-floodlight-muted">Squad Size:</span>
                        <span className="font-bold text-floodlight">
                          {room.user_squad_count} {room.user_squad_count === 1 ? 'Player' : 'Players'}
                        </span>
                      </div>
                    )}

                    {/* Progress: Sold / Total Pool */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-night-border/50">
                      <span className="text-floodlight-muted">Players Auctioned:</span>
                      <span className="font-mono font-semibold text-floodlight">
                        {room.sold_count} sold
                        {room.total_pool_count > 0 && ` / ${room.total_pool_count} total`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer action button */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-floodlight-muted/80 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(room.last_activity)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={actionHref}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] ${
                        isTerminated
                          ? 'bg-red-500/15 border border-red-500/40 hover:bg-red-500/25 text-red-300'
                          : isCompleted
                          ? 'bg-night border border-amber-400/30 hover:border-amber-400 text-amber-300 hover:bg-amber-400/10'
                          : isWaiting
                          ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40'
                          : 'bg-amber-400 hover:bg-amber-300 text-[#17130A] shadow-md shadow-amber-400/10'
                      }`}
                    >
                      {isTerminated ? (
                        <Ban className="w-3.5 h-3.5" />
                      ) : isCompleted ? (
                        <Trophy className="w-3.5 h-3.5" />
                      ) : isWaiting ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    {!isCompleted && !isTerminated && (
                      <button
                        type="button"
                        disabled={leavingCode === room.room_code}
                        onClick={() => handleLeaveOrArchive(room)}
                        title={room.is_host ? 'Archive room' : 'Leave room'}
                        aria-label={room.is_host ? `Archive room ${room.room_code}` : `Leave room ${room.room_code}`}
                        className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 transition-colors disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
