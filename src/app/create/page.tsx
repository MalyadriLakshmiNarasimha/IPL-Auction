'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Shield, ArrowRight, AlertCircle, User, Trophy, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SportType } from '@/shared/types';
import { OFFICIAL_IPL_FRANCHISES } from '@/shared/constants';
import { PKL_FRANCHISES } from '@/shared/pkl-player-data';

function CreateRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSportParam = (searchParams?.get('sport')?.toUpperCase() === 'PKL' ? 'PKL' : 'IPL') as SportType;

  const [sport, setSport] = useState<SportType>(initialSportParam);
  const [roomName, setRoomName] = useState(
    initialSportParam === 'PKL' ? 'PKL Pro Auction' : 'IPL Mega Auction'
  );
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Sync sport change with suggested room name
  const handleSportSelect = (newSport: SportType) => {
    setSport(newSport);
    if (newSport === 'PKL' && (roomName === 'IPL Mega Auction' || !roomName.trim())) {
      setRoomName('PKL Pro Auction');
    } else if (newSport === 'IPL' && (roomName === 'PKL Pro Auction' || !roomName.trim())) {
      setRoomName('IPL Mega Auction');
    }
  };

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(({ ok, data }) => {
        if (!ok || !data?.authenticated || !data?.user) {
          router.replace('/login?redirect=/create');
        } else {
          setDisplayName(data.user.name);
          setUserId(data.user.id);
          if (data.socket_token) {
            try { localStorage.setItem('ipl_session_token', data.socket_token); } catch {}
          }
          setIsCheckingAuth(false);
        }
      })
      .catch(() => {
        router.replace('/login?redirect=/create');
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !userId) {
      setError('You must be logged in to create a room.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const fallbackName = sport === 'PKL' ? 'PKL Auction Room' : 'IPL Auction Room';

    try {
      const res = await apiFetch<{ room_code: string; room_name: string }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          room_name: roomName.trim() || fallbackName,
          host_session_id: userId,
          host_display_name: displayName.trim(),
          sport_type: sport,
        }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Failed to create room');
      }

      router.push(`/room/${res.data.room_code}`);
    } catch (err: any) {
      setError(err.message || 'Error connecting to auction server');
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-8 h-8 rounded-full border-2 border-flare border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-floodlight-muted">Verifying authentication...</span>
      </div>
    );
  }

  const isPkl = sport === 'PKL';

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-16">
      <div
        className={`scoreboard-panel rounded-card border p-6 sm:p-8 shadow-2xl transition-all duration-300 ${
          isPkl ? 'border-purple-500/30 shadow-purple-950/20' : 'border-amber-500/30 shadow-amber-950/20'
        }`}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-[.22em] text-flare mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multiplayer Lobby</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-floodlight tracking-tight">
            HOST AUCTION ROOM
          </h1>
          <p className="text-xs text-floodlight-muted mt-1">
            Create a live private auction lobby for up to 30 managers
          </p>
        </div>

        {/* League Selector Tabs */}
        <div className="grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-night border border-night-border mb-6">
          <button
            type="button"
            onClick={() => handleSportSelect('IPL')}
            className={`py-3 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              !isPkl
                ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-sm'
                : 'text-floodlight-muted hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>IPL Cricket</span>
          </button>

          <button
            type="button"
            onClick={() => handleSportSelect('PKL')}
            className={`py-3 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              isPkl
                ? 'bg-purple-600/25 border border-purple-400/50 text-purple-300 shadow-sm'
                : 'text-floodlight-muted hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-purple-400" />
            <span>PKL Kabaddi</span>
          </button>
        </div>

        {/* Sport Summary Info Pill */}
        <div
          className={`p-3.5 rounded-xl border text-xs mb-5 transition-colors ${
            isPkl
              ? 'border-purple-500/20 bg-purple-950/20 text-purple-200'
              : 'border-amber-500/20 bg-amber-950/20 text-amber-200'
          }`}
        >
          <div className="font-bold flex items-center justify-between">
            <span>{isPkl ? 'Pro Kabaddi League Arena' : 'Indian Premier League Arena'}</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white/10">
              {isPkl ? '12 Franchises • ₹5 Cr' : '10 Franchises • ₹100 Cr'}
            </span>
          </div>
          <div className="text-[11px] text-floodlight-muted mt-1">
            {isPkl
              ? '14-25 squad slots, starting 7 on court. Raiders, defenders, and all-rounders.'
              : '15-25 squad slots, max 4 overseas players in XI. Batters, bowlers, AR, and WK.'}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-hammer/15 border border-hammer/30 text-hammer text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-1.5">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder={isPkl ? 'e.g. Kabaddi Kings 2026' : 'e.g. Cricket Boys 2026'}
              maxLength={40}
              className="w-full bg-night px-4 py-3 rounded-xl text-sm text-floodlight border border-night-border focus:border-flare focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-1.5">
              Host Name (Verified Account)
            </label>
            <div className="flex items-center gap-2 bg-night-raised px-4 py-3 rounded-xl border border-night-border text-sm text-floodlight font-semibold">
              <User className={`w-4 h-4 ${isPkl ? 'text-purple-400' : 'text-amber-400'}`} />
              <span>{displayName}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full mt-3 py-3.5 rounded-pill font-extrabold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${
              isPkl
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]'
                : 'bg-flare hover:bg-flare-hover text-[#17130A] shadow-flare'
            }`}
          >
            <span>{isSubmitting ? 'Creating Room...' : `Create ${sport} Room & Enter Lobby`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Safety & Legal Notice */}
        <div className="mt-6 pt-5 border-t border-night-border/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-floodlight-muted font-semibold">
            <Shield className="w-4 h-4 text-turf" />
            <span>Virtual Money Only</span>
          </div>
          <p className="text-[11px] text-floodlight-subtle leading-relaxed">
            No real money, betting, prizes, or transactions. For social entertainment only.
          </p>
          <p className="text-[10px] text-floodlight-subtle">
            Unofficial fan game. Not affiliated with BCCI, IPL, PKL, or any franchise.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreateRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="w-8 h-8 rounded-full border-2 border-flare border-t-transparent animate-spin mb-2" />
          <span className="text-xs text-floodlight-muted">Loading room configurator...</span>
        </div>
      }
    >
      <CreateRoomContent />
    </Suspense>
  );
}
