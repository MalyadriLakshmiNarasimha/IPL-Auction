'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocketUrl } from '@/lib/socket';
import { Shield, ArrowRight, AlertCircle, User } from 'lucide-react';
import Link from 'next/link';

export default function CreateRoomPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('IPL Mega Auction');
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data?.authenticated || !data?.user) {
          router.replace('/login?redirect=/create');
        } else {
          setDisplayName(data.user.name);
          setUserId(data.user.id);
          if (data.sessionToken) {
            localStorage.setItem('ipl_session_token', data.sessionToken);
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

    try {
      const serverUrl = getSocketUrl();
      const sessionToken = localStorage.getItem('ipl_session_token') || '';

      const res = await fetch(`${serverUrl}/api/rooms`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          room_name: roomName.trim() || 'IPL Auction Room',
          host_session_id: userId,
          host_display_name: displayName.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create room');
      }

      const data = await res.json();
      router.push(`/room/${data.room_code}`);
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

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-16">
      <div className="scoreboard-panel rounded-card border border-night-border p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-black text-floodlight tracking-tight">
            CREATE AUCTION ROOM
          </h1>
          <p className="text-xs text-floodlight-muted mt-1">
            Host a live auction room for up to 20 friends
          </p>
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
              placeholder="e.g. Cricket Boys 2025 Auction"
              maxLength={40}
              className="w-full bg-night px-4 py-2.5 rounded-lg text-sm text-floodlight border border-night-border focus:border-flare focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-1.5">
              Host Name (Verified Account)
            </label>
            <div className="flex items-center gap-2 bg-night-raised px-4 py-2.5 rounded-lg border border-night-border text-sm text-floodlight font-semibold">
              <User className="w-4 h-4 text-flare" />
              <span>{displayName}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 rounded-pill bg-flare hover:bg-flare-hover disabled:opacity-50 text-white font-bold text-sm shadow-flare flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span>{isSubmitting ? 'Creating Room...' : 'Create & Enter Lobby'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Safety & Legal Notice (Required) */}
        <div className="mt-6 pt-5 border-t border-night-border/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-floodlight-muted font-semibold">
            <Shield className="w-4 h-4 text-turf" />
            <span>Virtual Money Only</span>
          </div>
          <p className="text-[11px] text-floodlight-subtle leading-relaxed">
            No real money, betting, prizes, or transactions. For fun and entertainment only.
          </p>
          <p className="text-[10px] text-floodlight-subtle">
            Unofficial fan game. Not affiliated with the BCCI, the IPL, or any franchise.
          </p>
        </div>
      </div>
    </div>
  );
}
