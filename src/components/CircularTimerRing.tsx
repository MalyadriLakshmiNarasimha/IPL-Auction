'use client';

import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '@/lib/sound';

interface CircularTimerRingProps {
  timerSeconds: number;
  timerEndsAt: number;
  serverTime?: number;
  isPaused: boolean;
  size?: number;
  roleColor?: string;
  // Optional backward-compat props
  initials?: string;
  role?: string;
  imageUrl?: string;
  playerName?: string;
}

export const CircularTimerRing: React.FC<CircularTimerRingProps> = ({
  timerSeconds,
  timerEndsAt,
  isPaused,
  size = 92,
  roleColor = '#DCC477',
}) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(timerSeconds);
  const [progress, setProgress] = useState<number>(1);
  const lastHeartbeatSec = useRef<number>(-1);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (timerEndsAt <= 0) {
      setRemaining(timerSeconds);
      setProgress(1);
      return;
    }
    if (isPaused) return;

    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, timerEndsAt - now);
      const remainingSec = Math.ceil(remainingMs / 1000);
      setRemaining(remainingSec);

      const totalMs = timerSeconds * 1000;
      const currentMs = Math.max(0, timerEndsAt - now);
      const newProgress = totalMs > 0 ? Math.min(1, Math.max(0, currentMs / totalMs)) : 0;
      setProgress(newProgress);

      // Play heartbeat sound on last 5 seconds
      if (remainingSec <= 5 && remainingSec > 0 && remainingSec !== lastHeartbeatSec.current) {
        lastHeartbeatSec.current = remainingSec;
        soundManager.playHeartbeat();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [timerEndsAt, isPaused, timerSeconds]);

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const isAnnouncing = timerEndsAt <= 0;
  // Deterministic calculation during initial hydration matching SSR
  const currentProgress = !isMounted ? 1 : isAnnouncing ? 1 : progress;
  const strokeDashoffset = circumference * (1 - currentProgress);

  const isUrgent = isMounted && !isAnnouncing && remaining <= 5 && remaining > 0;
  const ringColor = isAnnouncing ? '#DCC477' : isUrgent ? '#EF4444' : '#F9CD05';

  return (
    <div
      className="relative flex items-center justify-center select-none flex-shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Auction Timer: ${isAnnouncing ? 'Player Announcement' : `${remaining} seconds remaining`}`}
    >
      {/* SVG Circular Ring */}
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-night-border/70"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 0.15s linear, stroke 0.3s ease',
            filter: isUrgent
              ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))'
              : 'drop-shadow(0 0 6px rgba(249, 205, 5, 0.4))',
          }}
        />
      </svg>

      {/* Center Countdown Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {isAnnouncing ? (
          <div className="flex flex-col items-center animate-pulse text-center">
            <span className="text-[10px] uppercase font-black text-flare tracking-widest leading-none">
              INTRO
            </span>
            <span className="text-[8px] text-floodlight-muted font-bold mt-0.5">READY</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <span
              className={`font-display text-2xl sm:text-3xl font-black tabular-nums leading-none tracking-tight transition-colors ${
                isUrgent ? 'text-hammer animate-pulse' : 'text-floodlight'
              }`}
            >
              {remaining}
            </span>
            <span className="text-[9px] uppercase font-bold text-floodlight-muted tracking-wider leading-none mt-0.5">
              SEC
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
