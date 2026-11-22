'use client';

import React, { useState } from 'react';
import { Player, OrderType } from '@/shared/types';
import { formatCurrency, formatRoleName } from '@/shared/constants';
import { AlertCircle, Play, CheckSquare, Square, ArrowRight, Sparkles } from 'lucide-react';
import { PlayerPortrait } from './PlayerPortrait';

interface UnsoldAuctionBoardProps {
  unsoldPlayers: Player[];
  isHost: boolean;
  onReEnter: (selectedPlayerIds: string[], orderType: OrderType) => void;
  onProceedToTrading: () => void;
  onOpenDossier?: (player: Player) => void;
}

export const UnsoldAuctionBoard: React.FC<UnsoldAuctionBoardProps> = ({
  unsoldPlayers,
  isHost,
  onReEnter,
  onProceedToTrading,
  onOpenDossier,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(unsoldPlayers.map(p => p.id));
  const [orderType, setOrderType] = useState<OrderType>('base_price');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(unsoldPlayers.map(p => p.id));
  const deselectAll = () => setSelectedIds([]);

  return (
    <div className="scoreboard-panel rounded-card border border-night-border p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-night-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-flare">
            <AlertCircle className="w-4 h-4" />
            Stage 2: Unsold Player Auction Pool
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-floodlight mt-1">
            UNSOLD PLAYER ROSTER ({unsoldPlayers.length})
          </h2>
          <p className="text-xs text-floodlight-muted mt-0.5">
            Eligible players may be selected for an accelerated second chance bidding round before trading begins.
          </p>
        </div>

        {isHost && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 rounded-pill bg-night-raised border border-night-border text-xs font-bold text-floodlight hover:border-flare"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 rounded-pill bg-night-raised border border-night-border text-xs font-bold text-floodlight-muted hover:border-night-border"
            >
              Clear
            </button>
            <button
              onClick={onProceedToTrading}
              className="px-4 py-1.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-xs font-bold text-flare flex items-center gap-1.5"
            >
              <span>Skip to Trading Window</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Admin Re-entry Controls */}
      {isHost && (
        <div className="bg-night rounded-xl p-3 sm:p-4 border border-night-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-floodlight-muted">Auction Order:</span>
            <select
              value={orderType}
              onChange={e => setOrderType(e.target.value as OrderType)}
              className="bg-night-raised border border-night-border rounded-lg px-3 py-1.5 text-xs text-floodlight font-bold focus:border-flare outline-none"
            >
              <option value="base_price">Highest Base Price First</option>
              <option value="role">Group by Role (Batters, Bowlers...)</option>
              <option value="random">Randomized Order</option>
            </select>
          </div>

          <button
            disabled={selectedIds.length === 0}
            onClick={() => onReEnter(selectedIds, orderType)}
            className="px-6 py-2.5 rounded-pill bg-flare hover:bg-flare-hover disabled:opacity-40 text-white font-display text-sm font-black shadow-flare flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            START ROUND 2 ({selectedIds.length} PLAYERS)
          </button>
        </div>
      )}

      {/* Unsold Players Grid */}
      {unsoldPlayers.length === 0 ? (
        <div className="text-center p-8 text-floodlight-muted text-xs">
          No players remain in the unsold pool. All available auction players have found a franchise!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
          {unsoldPlayers.map(player => {
            const isSelected = selectedIds.includes(player.id);
            return (
              <div
                key={player.id}
                onClick={isHost ? () => toggleSelect(player.id) : undefined}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 select-none ${
                  isHost ? 'cursor-pointer' : ''
                } ${
                  isSelected
                    ? 'border-flare bg-flare/10 shadow-sm'
                    : 'border-night-border bg-night-raised/60 hover:border-night-border/80'
                }`}
              >
                {isHost && (
                  <div className="flex-shrink-0 text-flare">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-floodlight-muted" />
                    )}
                  </div>
                )}

                <div className="w-10 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <PlayerPortrait player={player} aspectRatio="4/5" showBadge={false} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-floodlight truncate">
                    {player.name}
                  </div>
                  <div className="text-[10px] text-floodlight-muted flex items-center gap-1.5 mt-0.5">
                    <span>{player.role}</span>
                    <span>·</span>
                    <span className="text-flare font-semibold">{formatCurrency(player.base_price)}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] bg-night-border px-1.5 py-0.5 rounded font-bold text-floodlight-subtle">
                    {player.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
