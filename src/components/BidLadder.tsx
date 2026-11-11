'use client';

import React from 'react';
import { Bid } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { motion, AnimatePresence } from 'framer-motion';

interface BidLadderProps {
  bids: Bid[];
}

export const BidLadder: React.FC<BidLadderProps> = ({ bids = [] }) => {
  const safeBids = Array.isArray(bids) ? bids : [];
  const recentBids = safeBids.slice(0, 5);

  if (recentBids.length === 0) {
    return (
      <div className="bg-night-raised/50 rounded-card p-3 border border-night-border text-center">
        <span className="text-xs text-floodlight-subtle">No bids placed yet on this player</span>
      </div>
    );
  }

  return (
    <div className="bg-night-raised rounded-card p-3 border border-night-border shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-floodlight-muted mb-2 flex items-center justify-between">
        <span>BID LADDER (RECENT)</span>
        <span className="text-floodlight-subtle">{safeBids.length} total bids</span>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {recentBids.map((bid, index) => (
            <motion.div
              key={bid.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                index === 0
                  ? 'bg-flare/15 border border-flare/40 text-floodlight font-semibold'
                  : 'bg-night/70 text-floodlight-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: bid.franchise_color }}
                />
                <span className="font-bold text-floodlight">{bid.franchise_short_code}</span>
                <span className="text-[11px] text-floodlight-subtle truncate max-w-[90px] sm:max-w-[120px]">
                  {bid.franchise_name}
                </span>
              </div>
              <div className="font-display text-sm font-black tabular-nums text-floodlight">
                {formatCurrency(bid.amount)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

