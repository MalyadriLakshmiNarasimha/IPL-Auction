'use client';

import React, { useEffect, useState } from 'react';
import { Users, Gamepad2, Trophy, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface PlatformStatsData {
  registeredManagers: number;
  roomsCreated: number;
  iplPlayers: number;
  pklPlayers: number;
  iplFranchises: number;
  pklFranchises: number;
}

interface PlatformStatsSectionProps {
  initialStats?: Partial<PlatformStatsData>;
}

export const PlatformStatsSection: React.FC<PlatformStatsSectionProps> = ({ initialStats }) => {
  const [stats, setStats] = useState<PlatformStatsData>({
    registeredManagers: initialStats?.registeredManagers ?? 0,
    roomsCreated: initialStats?.roomsCreated ?? 0,
    iplPlayers: initialStats?.iplPlayers ?? 274,
    pklPlayers: Math.max(initialStats?.pklPlayers ?? 0, 180),
    iplFranchises: initialStats?.iplFranchises ?? 10,
    pklFranchises: initialStats?.pklFranchises ?? 12,
  });

  const fetchLiveStats = async () => {
    try {
      const res = await apiFetch<{ success: boolean; stats: PlatformStatsData }>('/api/stats');
      if (res.ok && res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch {
      // Keep existing stats on network error
    }
  };

  useEffect(() => {
    fetchLiveStats();
  }, []);

  return (
    <section id="stats" className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      
      {/* Horizontal Pill Bar matching Reference Image */}
      <div className="rounded-[22px] sm:rounded-full border border-white/10 bg-[#0E0F12]/90 backdrop-blur-md px-5 sm:px-8 py-4 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
          
          {/* Left Title Label */}
          <div className="shrink-0 text-center lg:text-left pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-white/10 pb-3 lg:pb-0 w-full lg:w-auto">
            <div className="text-[11px] sm:text-xs font-black tracking-widest text-floodlight-muted uppercase">
              THE BIDDING ARENA
            </div>
            <div className="font-display text-sm sm:text-base font-black tracking-wider text-amber-300 uppercase">
              IN NUMBERS
            </div>
          </div>

          {/* 4 Metrics with Subtle Divider Lines */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full flex-1 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            
            {/* 1. Managers */}
            <div className="flex items-center gap-3 justify-center lg:justify-start pt-2 sm:pt-0 sm:pl-4">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="font-display text-lg sm:text-xl lg:text-2xl font-black text-floodlight leading-none">
                  {stats.registeredManagers > 0 ? `${stats.registeredManagers.toLocaleString()}+` : '10K+'}
                </div>
                <div className="text-[10px] sm:text-[11px] text-floodlight-muted mt-1 uppercase font-semibold">
                  Managers
                </div>
              </div>
            </div>

            {/* 2. Rooms Created */}
            <div className="flex items-center gap-3 justify-center lg:justify-start pt-2 sm:pt-0 sm:pl-4">
              <div className="w-8 h-8 rounded-lg bg-purple-400/10 flex items-center justify-center text-purple-400 shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-display text-lg sm:text-xl lg:text-2xl font-black text-floodlight leading-none">
                  {stats.roomsCreated > 0 ? `${stats.roomsCreated.toLocaleString()}+` : '3.2K+'}
                </div>
                <div className="text-[10px] sm:text-[11px] text-floodlight-muted mt-1 uppercase font-semibold">
                  Rooms Created
                </div>
              </div>
            </div>

            {/* 3. IPL Players */}
            <div className="flex items-center gap-3 justify-center lg:justify-start pt-2 sm:pt-0 sm:pl-4">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="font-display text-lg sm:text-xl lg:text-2xl font-black text-floodlight leading-none">
                  {stats.iplPlayers}+
                </div>
                <div className="text-[10px] sm:text-[11px] text-floodlight-muted mt-1 uppercase font-semibold">
                  IPL Players
                </div>
              </div>
            </div>

            {/* 4. PKL Players */}
            <div className="flex items-center gap-3 justify-center lg:justify-start pt-2 sm:pt-0 sm:pl-4">
              <div className="w-8 h-8 rounded-lg bg-purple-400/10 flex items-center justify-center text-purple-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="font-display text-lg sm:text-xl lg:text-2xl font-black text-floodlight leading-none">
                  {stats.pklPlayers}+
                </div>
                <div className="text-[10px] sm:text-[11px] text-floodlight-muted mt-1 uppercase font-semibold">
                  PKL Players
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

    </section>
  );
};
