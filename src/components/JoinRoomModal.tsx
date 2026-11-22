'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Room code must be exactly 6 characters');
      return;
    }
    onClose();
    router.push(`/room/${cleanCode}`);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.trim();
    if (raw.includes('/room/')) {
      const parts = raw.split('/room/');
      raw = parts[parts.length - 1].split('?')[0];
    }
    setCode(raw.toUpperCase().slice(0, 6));
    if (error) setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#111214] p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-flare/10 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.22em] text-flare">Live Room Entry</span>
            <h2 className="font-display text-2xl font-bold text-floodlight mt-0.5">JOIN WITH CODE</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 flex items-center justify-center text-floodlight-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-2">
              Enter 6-Character Room Code
            </label>
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="e.g. 7GA8X2"
              maxLength={6}
              autoFocus
              className="w-full bg-[#17181A] px-4 py-3.5 rounded-xl font-display text-3xl font-black tracking-[0.3em] text-center text-flare border border-white/15 focus:border-flare focus:outline-none uppercase placeholder:text-floodlight-subtle/40"
            />
          </div>

          <button
            type="submit"
            disabled={code.length !== 6}
            className="w-full py-3.5 rounded-pill bg-flare hover:bg-flare-hover disabled:opacity-40 disabled:cursor-not-allowed text-[#17130A] font-extrabold text-sm shadow-flare flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Enter Auction Arena</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-floodlight-subtle">
          Received a full invite link? You can paste the link directly above.
        </p>
      </div>
    </div>
  );
};
