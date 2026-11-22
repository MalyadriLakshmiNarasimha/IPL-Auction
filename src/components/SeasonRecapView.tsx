'use client';

import React from 'react';
import { SeasonRecap, AuctionResults } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import {
  Sparkles,
  Trophy,
  Flame,
  ArrowLeftRight,
  TrendingUp,
  DollarSign,
  Users,
  Award,
} from 'lucide-react';

interface SeasonRecapViewProps {
  recap: SeasonRecap;
  results: AuctionResults;
}

export const SeasonRecapView: React.FC<SeasonRecapViewProps> = ({ recap, results }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-black text-floodlight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-flare" />
          OFFICIAL SEASON RECAP & AUCTION ARCHIVES
        </h2>
        <p className="text-xs text-floodlight-muted">
          Macro-economic highlights, marquee bidding records, and market turnover from the 2026 auction room.
        </p>
      </div>

      {/* Macro Numbers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-card bg-night border border-night-border text-center">
          <div className="text-[10px] text-floodlight-muted uppercase font-bold">Total Purse Turnover</div>
          <div className="font-display text-xl sm:text-2xl font-black text-flare mt-1 tabular-nums">
            {formatCurrency(recap.total_spent || results.total_money_spent || 0)}
          </div>
          <div className="text-[10px] text-floodlight-subtle mt-0.5">Disbursed by Franchises</div>
        </div>

        <div className="p-4 rounded-card bg-night border border-night-border text-center">
          <div className="text-[10px] text-floodlight-muted uppercase font-bold">Players Acquired</div>
          <div className="font-display text-xl sm:text-2xl font-black text-turf mt-1 tabular-nums">
            {recap.players_sold}
          </div>
          <div className="text-[10px] text-floodlight-subtle mt-0.5">Contracted Roster Slots</div>
        </div>

        <div className="p-4 rounded-card bg-night border border-night-border text-center">
          <div className="text-[10px] text-floodlight-muted uppercase font-bold">Unsold Players</div>
          <div className="font-display text-xl sm:text-2xl font-black text-floodlight-muted mt-1 tabular-nums">
            {recap.unsold_players_count}
          </div>
          <div className="text-[10px] text-floodlight-subtle mt-0.5">Remaining Pool Reserve</div>
        </div>

        <div className="p-4 rounded-card bg-night border border-night-border text-center">
          <div className="text-[10px] text-floodlight-muted uppercase font-bold">Player Trades</div>
          <div className="font-display text-xl sm:text-2xl font-black text-cyan-400 mt-1 tabular-nums">
            {recap.total_trades_completed}
          </div>
          <div className="text-[10px] text-floodlight-subtle mt-0.5">Atomic Swaps Ratified</div>
        </div>
      </div>

      {/* High-Impact Spotlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Most Expensive Player */}
        <div className="p-5 rounded-card bg-night border border-night-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-pill bg-flare/20 text-flare text-[10px] font-bold uppercase tracking-wider">
                Marquee Record
              </span>
              <DollarSign className="w-4 h-4 text-flare" />
            </div>
            <h3 className="text-xs text-floodlight-muted font-bold uppercase">Most Expensive Signing</h3>
            {recap.highest_purchase ? (
              <div className="mt-2">
                <div className="font-display text-xl font-black text-floodlight">
                  {recap.highest_purchase.player.name}
                </div>
                <div className="text-xs text-floodlight-muted mt-0.5">
                  {recap.highest_purchase.player.role} · {recap.highest_purchase.player.country}
                </div>
                <div className="font-display text-2xl font-black text-flare mt-2 tabular-nums">
                  {formatCurrency(recap.highest_purchase.price)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-floodlight-muted mt-2">No player purchases recorded</div>
            )}
          </div>

          {recap.highest_purchase && (
            <div className="pt-3 border-t border-night-border mt-3 text-xs flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: recap.highest_purchase.franchise.color }}
              />
              <span className="font-bold text-floodlight">{recap.highest_purchase.franchise.name}</span>
            </div>
          )}
        </div>

        {/* Best Value Bargain */}
        <div className="p-5 rounded-card bg-night border border-night-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-pill bg-turf/20 text-turf text-[10px] font-bold uppercase tracking-wider">
                Value Masterpiece
              </span>
              <TrendingUp className="w-4 h-4 text-turf" />
            </div>
            <h3 className="text-xs text-floodlight-muted font-bold uppercase">Top Bargain of the Auction</h3>
            {recap.best_bargain ? (
              <div className="mt-2">
                <div className="font-display text-xl font-black text-floodlight">
                  {recap.best_bargain.player.name}
                </div>
                <div className="text-xs text-floodlight-muted mt-0.5">
                  {recap.best_bargain.player.role} · {recap.best_bargain.player.country}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-display text-xl font-black text-floodlight tabular-nums">
                    {formatCurrency(recap.best_bargain.price)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-turf/20 text-turf">
                    +{formatCurrency(recap.best_bargain.surplus)} Value Surplus
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-floodlight-muted mt-2">No bargain picks identified</div>
            )}
          </div>

          {recap.best_bargain && (
            <div className="pt-3 border-t border-night-border mt-3 text-xs flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: recap.best_bargain.franchise.color }}
              />
              <span className="font-bold text-floodlight">{recap.best_bargain.franchise.name}</span>
            </div>
          )}
        </div>

        {/* Highest Spending Franchise */}
        <div className="p-5 rounded-card bg-night border border-night-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-pill bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                Heavy Spender
              </span>
              <Flame className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-xs text-floodlight-muted font-bold uppercase">Highest Gross Expenditure</h3>
            {recap.highest_spending_team ? (
              <div className="mt-2">
                <div className="font-display text-xl font-black text-floodlight">
                  {recap.highest_spending_team.franchise.name}
                </div>
                <div className="text-xs text-floodlight-muted mt-0.5">
                  Aggressive Auction Acquisition Strategy
                </div>
                <div className="font-display text-2xl font-black text-flare mt-2 tabular-nums">
                  {formatCurrency(recap.highest_spending_team.spent)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-floodlight-muted mt-2">No team spending recorded</div>
            )}
          </div>

          {recap.highest_spending_team && (
            <div className="pt-3 border-t border-night-border mt-3 text-xs flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: recap.highest_spending_team.franchise.color }}
              />
              <span className="font-bold text-floodlight">
                {recap.highest_spending_team.franchise.short_code}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

