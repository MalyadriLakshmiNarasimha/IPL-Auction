'use client';

import React, { useEffect, useRef } from 'react';
import { soundManager } from '@/lib/sound';

interface CircularTimerRingProps {
  initials: string;
  role: string;
  roleColor: string;
  timerSeconds: number;
  timerEndsAt: number;
  serverTime: number;
  isPaused: boolean;
}

export const CircularTimerRing: React.FC<CircularTimerRingProps> = ({
  initials,
  roleColor,
  timerSeconds,
  timerEndsAt,
  serverTime,
  isPaused,
}) => {
  const [remaining, setRemaining] = React.useState<number>(timerSeconds);
  const lastHeartbeatSec = useRef<number>(-1);

  useEffect(() => {
    if (isPaused || timerEndsAt <= 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, timerEndsAt - now);
      const remainingSec = Math.ceil(remainingMs / 1000);
      setRemaining(remainingSec);

      // Play heartbeat sound on last 5 seconds
      if (remainingSec <= 5 && remainingSec > 0 && remainingSec !== lastHeartbeatSec.current) {
        lastHeartbeatSec.current = remainingSec;
        soundManager.playHeartbeat();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerEndsAt, isPaused]);

  const size = 110;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalMs = timerSeconds * 1000;
  const currentMs = Math.max(0, timerEndsAt - Date.now());
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, currentMs / totalMs)) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const isUrgent = remaining <= 5 && remaining > 0;
  const ringColor = isUrgent ? '#E05252' : '#D6B65D';

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* SVG Circular Ring */}
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-night-border"
          fill="transparent"
        />
        {/* Progress ring */}
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
            filter: isUrgent ? 'drop-shadow(0 0 8px rgba(255, 59, 78, 0.7))' : undefined,
          }}
        />
      </svg>

      {/* Center Initials Avatar & Seconds Badge */}
      <div
        className={`absolute inset-2 rounded-full flex flex-col items-center justify-center font-bold transition-all duration-300 ${
          isUrgent ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor: '#121F42',
          border: `2px solid ${isUrgent ? '#E05252' : roleColor}`,
        }}
      >
        <span className="font-display text-3xl font-extrabold tracking-tight text-floodlight">
          {initials}
        </span>
        <span
          className={`text-xs font-black tracking-wider px-1.5 py-0.2 rounded-full ${
            isUrgent ? 'bg-hammer text-white font-mono' : 'text-floodlight-muted'
          }`}
        >
          {remaining}s
        </span>
      </div>
    </div>
  );
};

