'use client';

import React, { useState, useMemo } from 'react';
import { Player, PlayerRole } from '@/shared/types';
import { ALL_PLAYERS } from '@/shared/player-data';
import { formatCurrency } from '@/shared/constants';
import { Search, X, Check, Filter } from 'lucide-react';

interface PoolPickerModalProps {
  selectedIds: string[];
  onSave: (newSelectedIds: string[]) => void;
  onClose: () => void;
}

export const PoolPickerModal: React.FC<PoolPickerModalProps> = ({
  selectedIds,
  onSave,
  onClose,
}) => {
  const [currentSelection, setCurrentSelection] = useState<Set<string>>(new Set(selectedIds.length > 0 ? selectedIds : ALL_PLAYERS.map(p => p.id)));
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  // Filtered player list
  const filteredPlayers = useMemo(() => {
    return ALL_PLAYERS.filter(p => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesCountry = p.country.toLowerCase().includes(term);
        if (!matchesName && !matchesCountry) return false;
      }
      if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;
      if (countryFilter === 'INDIA' && p.country !== 'India') return false;
      if (countryFilter === 'OVERSEAS' && p.country === 'India') return false;
      if (tierFilter !== 'ALL' && p.tier !== tierFilter) return false;
      return true;
    });
  }, [searchTerm, roleFilter, countryFilter, tierFilter]);

  const togglePlayer = (id: string) => {
    setCurrentSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyPreset = (preset: 'ALL' | 'INDIAN' | 'STARS' | 'UNCAPPED') => {
    let ids: string[] = [];
    if (preset === 'ALL') {
      ids = ALL_PLAYERS.map(p => p.id);
    } else if (preset === 'INDIAN') {
      ids = ALL_PLAYERS.filter(p => p.country === 'India').map(p => p.id);
    } else if (preset === 'STARS') {
      ids = ALL_PLAYERS.filter(p => p.tier === 'A').map(p => p.id);
    } else if (preset === 'UNCAPPED') {
      ids = ALL_PLAYERS.filter(p => !p.capped).map(p => p.id);
    }
    setCurrentSelection(new Set(ids));
  };

  const handleSave = () => {
    onSave(Array.from(currentSelection));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-night rounded-card border border-night-border shadow-2xl flex flex-col h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-night-border flex items-center justify-between bg-night-raised">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-floodlight">Select Auction Player Pool</h2>
            <p className="text-xs text-floodlight-muted">
              {currentSelection.size} of {ALL_PLAYERS.length} players selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-floodlight-muted hover:text-white hover:bg-night"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls & Presets */}
        <div className="p-3 sm:p-4 border-b border-night-border bg-night-raised/50 space-y-3">
          {/* Search bar & Presets */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-floodlight-subtle" />
              <input
                type="text"
                placeholder="Search player name or country..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-night pl-9 pr-3 py-2 text-xs sm:text-sm rounded-pill text-floodlight border border-night-border focus:border-flare focus:outline-none placeholder:text-floodlight-subtle"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => applyPreset('ALL')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                All (255)
              </button>
              <button
                onClick={() => applyPreset('INDIAN')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                Indian Only
              </button>
              <button
                onClick={() => applyPreset('STARS')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                Stars Only (A)
              </button>
              <button
                onClick={() => applyPreset('UNCAPPED')}
                className="px-2.5 py-1 rounded-pill text-xs font-semibold bg-night border border-night-border hover:border-flare text-floodlight whitespace-nowrap"
              >
                Uncapped
              </button>
            </div>
          </div>

          {/* Role & Country filter chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-floodlight-subtle text-[11px] font-bold mr-1">ROLE:</span>
            {['ALL', 'BAT', 'BOWL', 'AR', 'WK'].map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 rounded-pill font-bold transition-all ${
                  roleFilter === role
                    ? 'bg-flare text-white shadow-flare'
                    : 'bg-night text-floodlight-muted border border-night-border hover:text-floodlight'
                }`}
              >
                {role}
              </button>
            ))}

            <span className="text-floodlight-subtle text-[11px] font-bold ml-2 mr-1">COUNTRY:</span>
            {['ALL', 'INDIA', 'OVERSEAS'].map(c => (
              <button
                key={c}
                onClick={() => setCountryFilter(c)}
                className={`px-2.5 py-1 rounded-pill font-bold transition-all ${
                  countryFilter === c
                    ? 'bg-flare text-white shadow-flare'
                    : 'bg-night text-floodlight-muted border border-night-border hover:text-floodlight'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Players Grid / List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {filteredPlayers.map(p => {
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
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-flare border-flare text-white'
                        : 'border-night-border bg-night text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs sm:text-sm text-floodlight truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-floodlight-muted flex items-center gap-1.5">
                      <span className="font-semibold text-flare">{p.role}</span>
                      <span>·</span>
                      <span>{p.country}</span>
                      <span>·</span>
                      <span>Tier {p.tier}</span>
                    </div>
                  </div>
                </div>

                <div className="font-display font-bold text-xs sm:text-sm text-floodlight tabular-nums flex-shrink-0 ml-2">
                  {formatCurrency(p.base_price)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-night-border bg-night-raised flex items-center justify-between">
          <div className="text-xs text-floodlight-muted">
            <span className="font-bold text-floodlight">{currentSelection.size}</span> players in pool
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

