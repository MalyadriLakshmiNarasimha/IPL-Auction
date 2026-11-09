'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/shared/constants';
import { Gavel, Flame } from 'lucide-react';
import { PlayerPortrait } from '@/components/PlayerPortrait';
import { ALL_PLAYERS } from '@/shared/player-data';

interface DemoPlayer {
  name: string;
  role: string;
  country: string;
  basePrice: number;
  initials: string;
}

const DEMO_PLAYERS: DemoPlayer[] = [
  { name: 'Virat Kohli', role: 'BAT', country: 'India', basePrice: 20000000, initials: 'VK' },
  { name: 'Jasprit Bumrah', role: 'BOWL', country: 'India', basePrice: 20000000, initials: 'JB' },
  { name: 'Heinrich Klaasen', role: 'WK', country: 'South Africa', basePrice: 20000000, initials: 'HK' },
  { name: 'Hardik Pandya', role: 'AR', country: 'India', basePrice: 20000000, initials: 'HP' },
];

const DEMO_TEAMS = [
  { name: 'Royal Challengers', code: 'RCB', color: '#E31B23' },
  { name: 'Chennai Super Kings', code: 'CSK', color: '#F9CD05' },
  { name: 'Mumbai Indians', code: 'MI', color: '#004BA0' },
  { name: 'Kolkata Knight Riders', code: 'KKR', color: '#3A225D' },
];

export const MiniAuctionDemo: React.FC = () => {
  const [playerIdx, setPlayerIdx] = useState(0);
  const [currentBid, setCurrentBid] = useState(20000000);
  const [currentTeam, setCurrentTeam] = useState(DEMO_TEAMS[0]);
  const [timer, setTimer] = useState(7);
  const [isSold, setIsSold] = useState(false);

  const player = DEMO_PLAYERS[playerIdx];

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Trigger Sold
          setIsSold(true);
          setTimeout(() => {
            // Next player
            setPlayerIdx(p => (p + 1) % DEMO_PLAYERS.length);
            const nextPrice = DEMO_PLAYERS[(playerIdx + 1) % DEMO_PLAYERS.length].basePrice;
            setCurrentBid(nextPrice);
            setCurrentTeam(DEMO_TEAMS[Math.floor(Math.random() * DEMO_TEAMS.length)]);
            setIsSold(false);
          }, 2000);
          return 7;
        }

        // Random bot bid every ~1.5s
        if (prev === 5 || prev === 3 || prev === 2) {
          const inc = [2500000, 5000000, 10000000][Math.floor(Math.random() * 3)];
          setCurrentBid(b => b + inc);
          setCurrentTeam(t => {
            const others = DEMO_TEAMS.filter(x => x.code !== t.code);
            return others[Math.floor(Math.random() * others.length)];
          });
        }

        return prev - 1;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [playerIdx]);

  return (
    <div className="scoreboard-panel rounded-card border border-night-border p-4 sm:p-5 relative overflow-hidden shadow-2xl max-w-sm mx-auto text-center select-none">
      {/* Live Badge */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-flare/20 border border-flare/40 text-flare font-bold">
          <span className="w-2 h-2 rounded-full bg-flare animate-ping" />
          SIMULATED LIVE
        </span>
        <span className="text-floodlight-muted font-mono">{timer}s left</span>
      </div>

      {/* Large 4:5 Player Portrait */}
      <div className="w-36 sm:w-44 mx-auto my-3">
        <PlayerPortrait
          player={ALL_PLAYERS.find(p => p.name === player.name) ?? null}
          aspectRatio="4/5"
          size="responsive"
          showBadge={true}
        />
      </div>

      <div className="font-bold text-base text-floodlight mt-1">{player.name}</div>
      <div className="text-xs text-floodlight-muted">
        {player.role} · {player.country} · Base {formatCurrency(player.basePrice)}
      </div>

      {/* Flip numeral bid */}
      <div className="my-3 py-2 bg-night-raised rounded-lg border border-night-border/80">
        <div className="text-[10px] uppercase font-bold text-floodlight-muted">Current Bid</div>
        <div className="font-display text-4xl sm:text-5xl font-black text-floodlight tabular-nums leading-tight">
          {formatCurrency(currentBid)}
        </div>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentTeam.color }}
          />
          <span className="text-floodlight">{currentTeam.name}</span>
        </div>
      </div>

      {/* Sold Stamp overlay when sold */}
      <AnimatePresence>
        {isSold && (
          <motion.div
            initial={{ scale: 2, rotate: -15, opacity: 0 }}
            animate={{ scale: 1, rotate: -8, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-10"
          >
            <div
              className="px-6 py-2 rounded-lg border-4 font-display text-5xl font-black uppercase tracking-widest shadow-2xl"
              style={{
                borderColor: currentTeam.color,
                color: currentTeam.color,
                backgroundColor: '#121F42EE',
              }}
            >
              SOLD!
            </div>
            <div className="text-sm font-bold text-floodlight mt-2">
              to {currentTeam.code} for {formatCurrency(currentBid)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

