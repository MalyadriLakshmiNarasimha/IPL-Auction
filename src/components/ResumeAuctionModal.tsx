'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/shared/constants';
import {
  Gavel,
  X,
  ArrowRight,
  History,
  Users,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';

interface OngoingAuction {
  room_code: string;
  name: string;
  host_name: string;
  is_host: boolean;
  participant_count: number;
  status: string;
  stage: string;
  last_activity: string;
  current_player_name: string | null;
  sold_count: number;
  unsold_count: number;
  total_pool_count: number;
  user_team_name: string | null;
  user_purse_remaining: number | null;
}

export const ResumeAuctionModal: React.FC = () => {
  const router = useRouter();
  const [ongoingRooms, setOngoingRooms] = useState<OngoingAuction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<OngoingAuction | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkOngoingAuctions() {
      try {
        const { ok, status, data } = await apiFetch('/api/history');
        if (!isMounted || !ok || status === 401 || !data?.ongoing) return;

        const ongoing: OngoingAuction[] = data.ongoing;
        if (ongoing.length === 0) return;

        // Check if dismissed in this browser session
        let dismissedCodes: string[] = [];
        try {
          const raw = sessionStorage.getItem('ipl_dismissed_resume_codes');
          if (raw) dismissedCodes = JSON.parse(raw);
        } catch {}

        // Filter for ongoing rooms that have not been dismissed in this session
        const undismissed = ongoing.filter(r => !dismissedCodes.includes(r.room_code));
        if (undismissed.length > 0) {
          setOngoingRooms(undismissed);
          setSelectedRoom(undismissed[0]);
          setIsOpen(true);
        }
      } catch (err) {
        // Silent fail
      }
    }

    checkOngoingAuctions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    try {
      const allCodes = ongoingRooms.map(r => r.room_code);
      let existing: string[] = [];
      try {
        const raw = sessionStorage.getItem('ipl_dismissed_resume_codes');
        if (raw) existing = JSON.parse(raw);
      } catch {}
      const combined = Array.from(new Set([...existing, ...allCodes]));
      sessionStorage.setItem('ipl_dismissed_resume_codes', JSON.stringify(combined));
    } catch {}
    setIsOpen(false);
  };

  const handleContinue = (code: string) => {
    setIsOpen(false);
    router.push(`/room/${code}`);
  };

  if (!isOpen || !selectedRoom) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-auction-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-flare/30 bg-gradient-to-b from-[#18191D] via-[#121316] to-[#0A0B0D] p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Ambient glow accent */}
        <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-flare/15 blur-3xl pointer-events-none" />

        {/* Close / Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-night-border/40 hover:bg-night-border text-floodlight-muted hover:text-floodlight transition-colors"
          aria-label="Close resume auction modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Live indicator badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-turf/15 border border-turf/35 text-turf text-[11px] font-extrabold uppercase tracking-wider mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-turf opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-turf" />
          </span>
          Active Auction In Progress
        </div>

        {/* Modal Title */}
        <h2 id="resume-auction-title" className="font-display text-2xl sm:text-3xl font-bold text-floodlight mb-1">
          Resume Your Auction?
        </h2>
        <p className="text-xs sm:text-sm text-floodlight-muted mb-5 leading-relaxed">
          You have an active ongoing auction in progress. Reconnect seamlessly to continue bidding with your squad.
        </p>

        {/* Room selection pills if multiple ongoing */}
        {ongoingRooms.length > 1 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {ongoingRooms.map(r => (
              <button
                key={r.room_code}
                onClick={() => setSelectedRoom(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedRoom.room_code === r.room_code
                    ? 'bg-flare text-[#17130A] shadow-flare'
                    : 'bg-night-raised border border-night-border text-floodlight-muted hover:text-floodlight'
                }`}
              >
                {r.name} ({r.room_code})
              </button>
            ))}
          </div>
        )}

        {/* Auction Card Details */}
        <div className="rounded-2xl border border-flare/20 bg-night/80 p-4 sm:p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-lg font-bold text-floodlight truncate">
              {selectedRoom.name}
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-flare/15 text-flare border border-flare/30">
              {selectedRoom.room_code}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-night-border/70">
            <div>
              <span className="text-floodlight-muted text-[11px] block">Host</span>
              <span className="font-semibold text-floodlight truncate block">
                {selectedRoom.host_name} {selectedRoom.is_host && '(You)'}
              </span>
            </div>
            <div>
              <span className="text-floodlight-muted text-[11px] block">Participants</span>
              <span className="font-semibold text-floodlight flex items-center gap-1">
                <Users className="w-3 h-3 text-flare" /> {selectedRoom.participant_count} connected
              </span>
            </div>
          </div>

          {selectedRoom.current_player_name && (
            <div className="pt-2 border-t border-night-border/70 flex items-center justify-between text-xs">
              <span className="text-floodlight-muted text-[11px]">Active Player:</span>
              <span className="font-bold text-flare truncate max-w-[180px]">{selectedRoom.current_player_name}</span>
            </div>
          )}

          {selectedRoom.user_team_name && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-floodlight-muted text-[11px]">Your Team:</span>
              <span className="font-bold text-floodlight">{selectedRoom.user_team_name}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => handleContinue(selectedRoom.room_code)}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-full bg-flare hover:bg-flare-hover text-[#17130A] font-extrabold text-sm shadow-flare flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <span>Continue Auction</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            href="/history"
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto py-3.5 px-5 rounded-full border border-night-border hover:bg-night-border text-floodlight font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <History className="w-3.5 h-3.5 text-flare" />
            <span>View History</span>
          </Link>
        </div>

        <div className="text-center mt-3">
          <button
            onClick={handleDismiss}
            className="text-[11px] text-floodlight-subtle hover:text-floodlight-muted underline transition-colors"
          >
            Dismiss for this session
          </button>
        </div>
      </div>
    </div>
  );
};
