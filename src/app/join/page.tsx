'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { ArrowRight, AlertCircle, User } from 'lucide-react';

export default function JoinRoomPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(({ ok, data }) => {
        if (!ok || !data?.authenticated || !data?.user) {
          router.replace('/login?redirect=/join');
        } else {
          setDisplayName(data.user.name);
          setIsCheckingAuth(false);
        }
      })
      .catch(() => {
        router.replace('/login?redirect=/join');
      });
  }, [router]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.trim();
    if (raw.includes('/room/')) {
      const parts = raw.split('/room/');
      raw = parts[parts.length - 1].split('?')[0];
    }
    setCode(raw.toUpperCase().slice(0, 6));
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    router.push(`/room/${cleanCode}`);
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
            JOIN AUCTION ROOM
          </h1>
          <p className="text-xs text-floodlight-muted mt-1">
            Enter the 6-character room code from your invite
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-hammer/15 border border-hammer/30 text-hammer text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-1.5">
              Room Code
            </label>
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="e.g. 7GA8X2"
              maxLength={6}
              required
              className="w-full bg-night px-4 py-3 rounded-lg font-display text-2xl font-bold tracking-widest text-center text-flare border border-night-border focus:border-flare focus:outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-1.5">
              Player Name (Verified Account)
            </label>
            <div className="flex items-center gap-2 bg-night-raised px-4 py-2.5 rounded-lg border border-night-border text-sm text-floodlight font-semibold">
              <User className="w-4 h-4 text-flare" />
              <span>{displayName}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3.5 rounded-pill bg-flare hover:bg-flare-hover text-white font-bold text-sm shadow-flare flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span>Enter Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
