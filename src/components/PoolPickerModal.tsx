'use client';

import React, { useState, useMemo } from 'react';
import { Player } from '@/shared/types';
import { ALL_PLAYERS } from '@/shared/player-data';
import { formatCurrency } from '@/shared/constants';
import { Search, X, Check, ArrowUpDown, Filter, RotateCcw } from 'lucide-react';

interface PoolPickerModalProps {
  selectedIds: string[];
  onSave: (newSelectedIds: string[]) => void;
  onClose: () => void;
}

type SortOption = 'name' | 'team' | 'role' | 'nationality' | 'price';

const IPL_FRANCHISES = [
  { name: 'Chennai Super Kings', code: 'Chennai', short: 'CSK' },
  { name: 'Delhi Capitals', code: 'Delhi', short: 'DC' },
  { name: 'Gujarat Titans', code: 'Gujarat', short: 'GT' },
  { name: 'Kolkata Knight Riders', code: 'Kolkata', short: 'KKR' },
  { name: 'Lucknow Super Giants', code: 'Lucknow', short: 'LSG' },
  { name: 'Mumbai Indians', code: 'Mumbai', short: 'MI' },
  { name: 'Punjab Kings', code: 'Punjab', short: 'PBKS' },
  { name: 'Rajasthan Royals', code: 'Rajasthan', short: 'RR' },
  { name: 'Royal Challengers Bengaluru', code: 'Bengaluru', short: 'RCB' },
  { name: 'Sunrisers Hyderabad', code: 'Hyderabad', short: 'SRH' },
];

export const PoolPickerModal: React.FC<PoolPickerModalProps> = ({
  selectedIds,
  onSave,
  onClose,
}) => {
  const [currentSelection, setCurrentSelection] = useState<Set<string>>(
    new Set(selectedIds.length > 0 ? selectedIds : ALL_PLAYERS.map(p => p.id))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Role color helper
  const getRoleBadgeStyle = (role: string) => {
    const r = (role || '').toUpperCase();
    if (r.startsWith('BAT')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (r.startsWith('BOWL')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (r.startsWith('ALL') || r === 'AR') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (r.startsWith('WICKET') || r === 'WK') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  // Filtered and sorted player list
  const filteredPlayers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const filtered = ALL_PLAYERS.filter(p => {
      // 1. Search Query: matches player name, team, team code, or nationality
      if (term) {
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesTeam = p.team ? p.team.toLowerCase().includes(term) : false;
        const matchesCode = p.team_code ? p.team_code.toLowerCase().includes(term) : false;
        const matchesNat = p.country.toLowerCase().includes(term) || (p.nationality ? p.nationality.toLowerCase().includes(term) : false);

        if (!matchesName && !matchesTeam && !matchesCode && !matchesNat) {
          return false;
        }
      }

      // 2. Role Filter: Batter, Bowler, All-rounder, Wicketkeeper
      if (roleFilter !== 'ALL') {
        const pRoleNorm = (p.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const targetNorm = roleFilter.toLowerCase().replace(/[^a-z]/g, '');
        if (!pRoleNorm.includes(targetNorm) && !targetNorm.includes(pRoleNorm)) {
          // Check abbreviation mapping
          if (targetNorm.startsWith('bat') && p.role !== 'BAT') return false;
          if (targetNorm.startsWith('bowl') && p.role !== 'BOWL') return false;
          if (targetNorm.startsWith('all') && p.role !== 'AR') return false;
          if (targetNorm.startsWith('wick') && p.role !== 'WK') return false;
        }
      }

      // 3. Nationality Filter: Indian vs Overseas
      if (nationalityFilter === 'INDIAN' && p.country !== 'India') return false;
      if (nationalityFilter === 'OVERSEAS' && p.country === 'India') return false;

      // 4. Franchise Filter
      if (teamFilter !== 'ALL') {
        const matchesTeam = p.team?.toLowerCase() === teamFilter.toLowerCase();
        const matchesCode = p.team_code?.toLowerCase() === teamFilter.toLowerCase();
        if (!matchesTeam && !matchesCode) return false;
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'team':
          return (a.team || '').localeCompare(b.team || '') || a.name.localeCompare(b.name);
        case 'role': {
          const roleOrder: Record<string, number> = {
            Batter: 1, BAT: 1,
            Wicketkeeper: 2, 'Wicket Keeper': 2, WK: 2,
            'All-Rounder': 3, 'All Rounder': 3, AR: 3,
            Bowler: 4, BOWL: 4,
          };
          const orderA = roleOrder[a.role] || 9;
          const orderB = roleOrder[b.role] || 9;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        }
        case 'nationality': {
          // India first, then other nations alphabetically
          if (a.country === 'India' && b.country !== 'India') return -1;
          if (a.country !== 'India' && b.country === 'India') return 1;
          return a.country.localeCompare(b.country) || a.name.localeCompare(b.name);
        }
        case 'price':
          return b.base_price - a.base_price || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [searchTerm, roleFilter, nationalityFilter, teamFilter, sortBy]);

  const togglePlayer = (id: string) => {
    setCurrentSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyPreset = (preset: 'ALL' | 'INDIAN' | 'OVERSEAS' | 'STARS' | 'UNCAPPED') => {
    let ids: string[] = [];
    if (preset === 'ALL') {
      ids = ALL_PLAYERS.map(p => p.id);
    } else if (preset === 'INDIAN') {
      ids = ALL_PLAYERS.filter(p => p.country === 'India').map(p => p.id);
    } else if (preset === 'OVERSEAS') {
      ids = ALL_PLAYERS.filter(p => p.country !== 'India').map(p => p.id);
    } else if (preset === 'STARS') {
      ids = ALL_PLAYERS.filter(p => p.tier === 'A').map(p => p.id);
    } else if (preset === 'UNCAPPED') {
      ids = ALL_PLAYERS.filter(p => !p.capped).map(p => p.id);
    }
    setCurrentSelection(new Set(ids));
  };

  const selectVisible = () => {
    setCurrentSelection(prev => {
      const next = new Set(prev);
      for (const p of filteredPlayers) {
        next.add(p.id);
      }
      return next;
    });
  };

  const deselectVisible = () => {
    setCurrentSelection(prev => {
      const next = new Set(prev);
      for (const p of filteredPlayers) {
        next.delete(p.id);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setNationalityFilter('ALL');
    setTeamFilter('ALL');
    setSortBy('name');
  };

  const handleSave = () => {
    onSave(Array.from(currentSelection));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-night rounded-card border border-night-border shadow-2xl flex flex-col h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-night-border flex items-center justify-between bg-night-raised">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-floodlight">Select Auction Player Pool</h2>
              <span className="px-2 py-0.5 rounded-full bg-flare/10 text-flare text-xs font-bold border border-flare/20">
                {ALL_PLAYERS.length} Centralized Database
              </span>
            </div>
            <p className="text-xs text-floodlight-muted mt-0.5">
              <span className="font-bold text-floodlight">{currentSelection.size}</span> of {ALL_PLAYERS.length} players selected for auction pool
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-floodlight-muted hover:text-white hover:bg-night"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls & Presets */}
        <div className="p-3 sm:p-4 border-b border-night-border bg-night-raised/50 space-y-3">
          {/* Search bar & Sorting */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-floodlight-subtle" />
              <input
                type="text"
                placeholder="Search player name, franchise, or nationality..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-night pl-9 pr-8 py-2 text-xs sm:text-sm rounded-pill text-floodlight border border-night-border focus:border-flare focus:outline-none placeholder:text-floodlight-subtle"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-floodlight-subtle hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-night border border-night-border rounded-pill px-3 py-1.5 text-xs text-floodlight">
                <ArrowUpDown className="w-3.5 h-3.5 text-flare" />
                <span className="text-[11px] text-floodlight-subtle font-semibold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-floodlight font-semibold outline-none cursor-pointer text-xs"
                >
                  <option value="name" className="bg-night text-white">Alphabetical (A-Z)</option>
                  <option value="team" className="bg-night text-white">By Franchise</option>
                  <option value="role" className="bg-night text-white">By Role</option>
                  <option value="nationality" className="bg-night text-white">By Nationality</option>
                  <option value="price" className="bg-night text-white">By Base Price</option>
                </select>
              </div>

              {/* Reset filters button */}
              {(searchTerm || roleFilter !== 'ALL' || nationalityFilter !== 'ALL' || teamFilter !== 'ALL' || sortBy !== 'name') && (
                <button
                  onClick={resetFilters}
                  className="px-2.5 py-1.5 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight-muted hover:text-white flex items-center gap-1"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Presets Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-floodlight-subtle mr-1 hidden sm:inline">PRESETS:</span>
              <button
                onClick={() => applyPreset('ALL')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                All ({ALL_PLAYERS.length})
              </button>
              <button
                onClick={() => applyPreset('INDIAN')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                Indian Only
              </button>
              <button
                onClick={() => applyPreset('OVERSEAS')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                Overseas Only
              </button>
              <button
                onClick={() => applyPreset('STARS')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                Stars (Tier A)
              </button>
              <button
                onClick={() => applyPreset('UNCAPPED')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                Uncapped Only
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={selectVisible}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-floodlight-muted hover:text-white hover:bg-night"
              >
                + Select Visible
              </button>
              <span className="text-night-border">|</span>
              <button
                onClick={deselectVisible}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-floodlight-muted hover:text-white hover:bg-night"
              >
                - Deselect Visible
              </button>
            </div>
          </div>

          {/* Filter Chips: Role, Nationality, IPL Franchise */}
          <div className="space-y-2 pt-1 border-t border-night-border/40 text-xs">
            {/* Role Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-floodlight-subtle text-[11px] font-bold w-16 flex-shrink-0">ROLE:</span>
              {[
                { label: 'All Roles', value: 'ALL' },
                { label: 'Batter', value: 'Batter' },
                { label: 'Bowler', value: 'Bowler' },
                { label: 'All-rounder', value: 'All-Rounder' },
                { label: 'Wicketkeeper', value: 'Wicketkeeper' },
              ].map(r => (
                <button
                  key={r.value}
                  onClick={() => setRoleFilter(r.value)}
                  className={`px-2.5 py-0.5 rounded-pill font-bold transition-all ${
                    roleFilter === r.value
                      ? 'bg-flare text-white shadow-flare'
                      : 'bg-night text-floodlight-muted border border-night-border hover:text-floodlight'
                  }`}
                >
                  {r.label}
                </button>
              ))}

              <span className="text-floodlight-subtle text-[11px] font-bold ml-2 mr-1">NATIONALITY:</span>
              {[
                { label: 'All', value: 'ALL' },
                { label: 'Indian', value: 'INDIAN' },
                { label: 'Overseas', value: 'OVERSEAS' },
              ].map(c => (
                <button
                  key={c.value}
                  onClick={() => setNationalityFilter(c.value)}
                  className={`px-2.5 py-0.5 rounded-pill font-bold transition-all ${
                    nationalityFilter === c.value
                      ? 'bg-flare text-white shadow-flare'
                      : 'bg-night text-floodlight-muted border border-night-border hover:text-floodlight'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Franchise Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-floodlight-subtle text-[11px] font-bold w-16 flex-shrink-0">FRANCHISE:</span>
              <button
                onClick={() => setTeamFilter('ALL')}
                className={`px-2 py-0.5 rounded-pill text-[11px] font-bold whitespace-nowrap transition-all ${
                  teamFilter === 'ALL'
                    ? 'bg-flare text-white shadow-flare'
                    : 'bg-night text-floodlight-muted border border-night-border hover:text-floodlight'
                }`}
              >
                All Teams
              </button>
              {IPL_FRANCHISES.map(f => (
                <button
                  key={f.code}
                  onClick={() => setTeamFilter(f.code)}
                  className={`px-2 py-0.5 rounded-pill text-[11px] font-bold whitespace-nowrap transition-all ${
                    teamFilter === f.code || teamFilter === f.name
                      ? 'bg-flare text-white shadow-flare'
                      : 'bg-night text-floodlight-muted border border-night-border hover:text-floodlight'
                  }`}
                  title={f.name}
                >
                  {f.short}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Players Grid / List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {filteredPlayers.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-floodlight-muted">
              <Filter className="w-10 h-10 mb-2 stroke-1 text-floodlight-subtle" />
              <div className="font-bold text-sm text-floodlight">No players match the current filters</div>
              <p className="text-xs text-floodlight-subtle mt-1">Try relaxing your search terms or filters</p>
              <button
                onClick={resetFilters}
                className="mt-3 px-3 py-1 bg-night border border-night-border rounded-pill text-xs font-semibold hover:border-flare text-flare"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredPlayers.map(p => {
              const isSelected = currentSelection.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={`p-2.5 rounded-card border cursor-pointer select-none flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-night-raised border-flare/70 shadow-sm'
                      : 'bg-night/50 border-night-border/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border text-xs font-bold transition-all flex-shrink-0 ${
                        isSelected
                          ? 'bg-flare border-flare text-white'
                          : 'border-night-border bg-night text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>

                    <div className="truncate min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs sm:text-sm text-floodlight truncate">
                          {p.name}
                        </span>
                        {p.jersey_number && (
                          <span className="text-[10px] font-bold text-floodlight-subtle px-1 rounded bg-night border border-night-border flex-shrink-0">
                            #{p.jersey_number}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-floodlight-muted flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getRoleBadgeStyle(p.role)}`}>
                          {p.role}
                        </span>
                        <span>·</span>
                        <span className="truncate">{p.country}</span>
                        {p.team_code && (
                          <>
                            <span>·</span>
                            <span className="text-flare font-medium truncate">{p.team_code}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-display font-bold text-xs sm:text-sm text-floodlight tabular-nums">
                      {formatCurrency(p.base_price)}
                    </div>
                    <div className="text-[10px] text-floodlight-subtle">
                      Tier {p.tier} {p.capped ? '· Capped' : '· Uncapped'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-night-border bg-night-raised flex items-center justify-between">
          <div className="text-xs text-floodlight-muted">
            Showing <span className="font-bold text-floodlight">{filteredPlayers.length}</span> of {ALL_PLAYERS.length} players |{' '}
            <span className="font-bold text-flare">{currentSelection.size}</span> selected in pool
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-pill text-xs font-bold text-floodlight-muted hover:text-white border border-night-border"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-pill text-xs font-bold bg-flare hover:bg-flare-hover text-white shadow-flare"
            >
              Confirm Pool ({currentSelection.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
