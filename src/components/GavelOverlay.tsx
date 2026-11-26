'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Participant, Player } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { soundManager } from '@/lib/sound';
import { Gavel, X, ArrowRight } from 'lucide-react';

interface GavelOverlayProps {
  phase: 'sold' | 'unsold';
  player: Player | null;
  winner?: Participant | null;
  price?: number;
  currentUserId: string;
  onDismiss?: () => void;
}

export const GavelOverlay: React.FC<GavelOverlayProps> = ({
  phase,
  player,
  winner,
  price = 0,
  currentUserId,
  onDismiss,
}) => {
  const isMyPurchase = winner?.id === currentUserId;
  const winnerColor = winner?.team_color || winner?.franchise?.color || '#DCC477';
  const winnerName = winner?.team_name || winner?.franchise?.name || 'Winning Team';
  const winnerCode = winner?.team_short_code || winner?.franchise?.short_code || 'TM';
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  useEffect(() => {
    setIsDismissed(false);
  }, [phase, player?.id]);

  useEffect(() => {
    // Note: The authoritative hammer strike is triggered exactly once via soundFX.playGavel()
    // immediately upon server confirmation in page.tsx before this overlay mounts.
    const soundTimer = setTimeout(() => {
      if (phase === 'sold') {
        soundManager.playSoldFanfare();
        // Trigger celebratory confetti in winner's jersey color
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: [winnerColor, '#F9CD05', '#F2EFE4'],
          });
        } catch (e) {}
      } else {
        soundManager.playUnsoldSigh();
      }
    }, 400);

    // Reliable Auto-Dismiss Safety Watchdog:
    // Guarantees the overlay never remains stuck on screen even if socket events fluctuate.
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, 4500);

    return () => {
      clearTimeout(soundTimer);
      clearTimeout(autoDismissTimer);
    };
  }, [phase, player?.id, winnerColor, handleDismiss]);

  if (!player || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      >
        {/* Animated Gavel Icon */}
        <motion.div
          initial={{ y: -80, rotate: -40, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'backOut' }}
          className="absolute top-1/4 flex flex-col items-center pointer-events-none"
        >
          <div className="p-4 rounded-full bg-night-raised border border-night-border text-floodlight shadow-scoreboard">
            <Gavel className="w-12 h-12 text-flare animate-pulse" />
          </div>
        </motion.div>

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="relative max-w-md w-full bg-night rounded-card border border-night-border p-6 text-center shadow-2xl overflow-hidden"
          style={{
            boxShadow: phase === 'sold' ? `0 0 40px ${winnerColor}40` : undefined,
          }}
        >
          {/* Quick Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-floodlight-muted hover:text-white hover:bg-white/10 transition-colors"
            title="Dismiss result overlay"
          >
            <X className="w-4 h-4" />
          </button>

          {/* STAMP */}
          {phase === 'sold' ? (
            <motion.div
              initial={{ scale: 2.5, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', damping: 12, stiffness: 200 }}
              className="inline-block px-6 py-2 rounded-lg border-4 font-display text-5xl sm:text-6xl font-black uppercase tracking-widest my-2 select-none"
              style={{
                borderColor: winnerColor,
                color: winnerColor,
                backgroundColor: `${winnerColor}15`,
                textShadow: `0 0 20px ${winnerColor}80`,
              }}
            >
              SOLD
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 2.2, rotate: 10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="inline-block px-6 py-2 rounded-lg border-4 border-floodlight-subtle text-floodlight-muted bg-night-raised font-display text-5xl font-black uppercase tracking-widest my-2 select-none"
            >
              UNSOLD
            </motion.div>
          )}

          {/* Player Details */}
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-bold text-floodlight">
              {player.name}
            </h3>
            <p className="text-sm text-floodlight-muted mt-0.5">
              {player.role} · {player.country} · Base {formatCurrency(player.base_price)}
            </p>
          </div>

          {/* Winner details */}
          {phase === 'sold' && winner && (winner.team_name || winner.franchise) && (
            <div className="mt-5 p-3 rounded-card bg-night-raised border border-night-border flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg text-white"
                  style={{ backgroundColor: winnerColor }}
                >
                  {winnerCode}
                </div>
                <div>
                  <div className="font-bold text-sm text-floodlight">
                    {winnerName}
                  </div>
                  <div className="text-xs text-floodlight-muted">
                    {winner.display_name} {isMyPurchase && '(You)'}
                  </div>
                </div>
              </div>
              <div className="font-display text-2xl font-black text-flare tabular-nums">
                {formatCurrency(price)}
              </div>
            </div>
          )}

          {isMyPurchase && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 p-2 rounded-pill bg-turf/20 border border-turf text-turf text-xs font-bold"
            >
              🎉 Player successfully drafted into your franchise squad!
            </motion.div>
          )}

          {phase === 'unsold' && (
            <p className="mt-4 text-xs text-floodlight-muted">
              Will return in the Accelerated Round at base price.
            </p>
          )}

          {/* Bottom dismissal action */}
          <div className="mt-5 pt-3 border-t border-night-border/60 flex items-center justify-between">
            <span className="text-[10px] text-floodlight-muted/80 flex items-center gap-1">
              <span>Transitioning to next player...</span>
            </span>
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-night-raised hover:bg-white/10 text-xs font-bold text-flare border border-flare/30 transition-all hover:scale-105"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Animated Auto-Advance Progress Bar */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 4.5, ease: 'linear' }}
            className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400 origin-left"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

