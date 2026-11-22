'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/shared/constants';

interface SplitFlapNumberProps {
  amount: number;
  isLeading: boolean;
  leaderTeamName?: string;
  leaderShortCode?: string;
  leaderColor?: string;
}

export const SplitFlapNumber: React.FC<SplitFlapNumberProps> = ({
  amount,
  isLeading,
  leaderTeamName,
  leaderShortCode,
  leaderColor = '#FF7A1A',
}) => {
  const [prevAmount, setPrevAmount] = useState(amount);
  const [pulse, setPulse] = useState(false);

  const formatted = amount > 0 ? formatCurrency(amount) : 'NO BIDS';

  useEffect(() => {
    if (amount !== prevAmount) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 800);
      setPrevAmount(amount);
      return () => clearTimeout(timer);
    }
  }, [amount, prevAmount]);

  return (
    <div
      className={`scoreboard-panel rounded-card p-4 sm:p-6 text-center transition-all duration-300 relative overflow-hidden ${
        pulse ? 'shadow-flare ring-2 ring-flare' : ''
      }`}
      style={{
        boxShadow: pulse
          ? '0 0 35px rgba(255, 122, 26, 0.55), inset 0 2px 4px rgba(0,0,0,0.6)'
          : isLeading
          ? '0 0 25px rgba(31, 163, 107, 0.35)'
          : undefined,
      }}
    >
      {/* Background flare sheen */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-flare/10 to-transparent pointer-events-none transition-opacity duration-500 ${
          pulse ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="text-xs font-semibold uppercase tracking-wider text-floodlight-muted mb-1 flex items-center justify-center gap-2">
        <span>CURRENT BID</span>
        {amount > 0 && (
          <span className="w-2 h-2 rounded-full bg-flare animate-ping inline-block" />
        )}
      </div>

      {/* Numerical Display with Big Shoulders font */}
      <div className="flex items-center justify-center h-20 sm:h-24 overflow-hidden my-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={formatted}
            initial={{ y: -30, opacity: 0, rotateX: 45 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: 30, opacity: 0, rotateX: -45 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="font-display text-5xl sm:text-7xl font-black tracking-tight text-floodlight tabular-nums leading-none select-none drop-shadow-md"
          >
            {formatted}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Leader Status Pill */}
      <div className="mt-2 flex items-center justify-center">
        {amount === 0 ? (
          <span className="inline-flex items-center px-3 py-1 rounded-pill text-xs font-medium bg-night-border text-floodlight-muted border border-night-border">
            Awaiting opening bid
          </span>
        ) : isLeading ? (
          <motion.span
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-pill text-xs sm:text-sm font-bold bg-turf/20 text-turf border border-turf shadow-turf"
          >
            <span className="w-2 h-2 rounded-full bg-turf animate-pulse" />
            YOU ARE LEADING
          </motion.span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-pill text-xs sm:text-sm font-semibold text-floodlight border"
            style={{
              backgroundColor: `${leaderColor}20`,
              borderColor: leaderColor,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: leaderColor }}
            />
            <span>{leaderShortCode || leaderTeamName} leading</span>
          </span>
        )}
      </div>
    </div>
  );
};

