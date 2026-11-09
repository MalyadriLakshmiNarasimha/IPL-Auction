'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CommentaryEvent } from '@/shared/types';
import { Flame, Gavel, Award, Radio, AlertCircle, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { voiceCommentary } from '@/lib/voice-commentary';

interface AuctionCommentaryTickerProps {
  events?: CommentaryEvent[];
  commentary?: CommentaryEvent[];
}

export const AuctionCommentaryTicker: React.FC<AuctionCommentaryTickerProps> = ({ events, commentary }) => {
  const allEvents = events || commentary || [];
  const latest = allEvents.length > 0 ? allEvents[allEvents.length - 1] : null;
  const [pulse, setPulse] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMuted(voiceCommentary.getIsMuted());
    setVolume(voiceCommentary.getVolume());
  }, []);

  useEffect(() => {
    if (latest) {
      setPulse(true);
      // Trigger authoritative voice commentary
      voiceCommentary.speakEvent(latest);
      const timer = setTimeout(() => setPulse(false), 800);
      return () => clearTimeout(timer);
    }
  }, [latest]);

  // Close volume popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = voiceCommentary.toggleMute();
    setIsMuted(muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    voiceCommentary.setVolume(val);
    if (val > 0 && isMuted) {
      voiceCommentary.setMuted(false);
      setIsMuted(false);
    }
  };

  if (!latest) return null;

  const icon = (() => {
    switch (latest.type) {
      case 'bidding_war':
        return <Flame className="w-4 h-4 text-hammer animate-bounce" />;
      case 'sold':
        return <Gavel className="w-4 h-4 text-turf" />;
      case 'record':
        return <Award className="w-4 h-4 text-flare animate-pulse" />;
      case 'trade':
        return <RefreshCw className="w-4 h-4 text-turf animate-spin" />;
      case 'unsold':
        return <AlertCircle className="w-4 h-4 text-floodlight-muted" />;
      default:
        return <Radio className="w-4 h-4 text-flare animate-pulse" />;
    }
  })();

  const borderClass = (() => {
    switch (latest.type) {
      case 'bidding_war':
        return 'border-hammer/50 bg-hammer/10';
      case 'sold':
        return 'border-turf/50 bg-turf/10';
      case 'record':
        return 'border-flare/50 bg-flare/10 shadow-flare';
      case 'trade':
        return 'border-turf/50 bg-turf/10';
      default:
        return 'border-night-border bg-night-raised/80 backdrop-blur-sm';
    }
  })();

  return (
    <div
      className={`relative rounded-xl border px-3.5 py-2 flex items-center justify-between gap-3 text-xs transition-all duration-300 shadow-sm ${borderClass} ${
        pulse ? 'scale-[1.01]' : 'scale-100'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex-shrink-0 flex items-center justify-center p-1 rounded-full bg-night-surface/60">
          {icon}
        </div>
        <div className="font-semibold text-floodlight truncate">
          {latest.text}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="hidden sm:inline-block text-[10px] text-floodlight-subtle uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-night-surface/80 border border-night-border/40">
          Live Commentary
        </span>

        {/* Audio Controls */}
        <div className="relative flex items-center" ref={sliderRef}>
          <button
            type="button"
            onClick={handleToggleMute}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowVolumeSlider(!showVolumeSlider);
            }}
            title={isMuted ? 'Voice Commentary Muted (Click to Unmute)' : 'Voice Commentary Active (Click to Mute)'}
            className={`p-1.5 rounded-lg border transition-all ${
              isMuted
                ? 'bg-hammer/15 border-hammer/40 text-hammer hover:bg-hammer/25'
                : 'bg-turf/15 border-turf/40 text-turf hover:bg-turf/25'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Volume adjust trigger */}
          <button
            type="button"
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className="ml-1 text-[10px] text-floodlight-subtle hover:text-flare transition-colors"
            title="Adjust Commentary Volume"
          >
            {Math.round(isMuted ? 0 : volume * 100)}%
          </button>

          {showVolumeSlider && (
            <div className="absolute right-0 top-full mt-2 z-50 p-3 bg-night-card border border-night-border rounded-xl shadow-2xl flex flex-col gap-2 min-w-[140px]">
              <div className="flex items-center justify-between text-[11px] text-floodlight">
                <span className="font-medium">Voice Volume</span>
                <span className="font-mono text-flare">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full accent-flare cursor-pointer h-1.5 bg-night-surface rounded-lg appearance-none"
              />
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-[10px] text-center py-1 rounded bg-night-surface hover:bg-night-border text-floodlight-muted hover:text-floodlight transition-colors"
              >
                {isMuted ? 'Unmute Voice' : 'Mute Voice'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
