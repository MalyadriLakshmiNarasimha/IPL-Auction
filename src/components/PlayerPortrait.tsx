'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { Player } from '@/shared/types';
import { Zap } from 'lucide-react';
import playerImagesMap from '@/shared/player-images.json';

export interface PlayerPortraitProps {
  player: Player | null | undefined;
  className?: string;
  aspectRatio?: '4/5' | 'square' | 'avatar';
  showBadge?: boolean;
  priority?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
}

interface CentralImageMeta {
  playerId: string;
  playerName: string;
  imagePath: string | null;
  sourceUrl: string | null;
  sourceName: string;
  verificationStatus: 'verified' | 'missing' | 'ambiguous';
  verifiedAt: string;
  imageWidth: number | null;
  imageHeight: number | null;
}

const CENTRAL_MAPPING: Record<string, CentralImageMeta> = playerImagesMap as unknown as Record<
  string,
  CentralImageMeta
>;

export const PlayerPortrait: React.FC<PlayerPortraitProps> = ({
  player,
  className = '',
  aspectRatio = '4/5',
  showBadge = true,
  priority = false,
  size = 'responsive',
}) => {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset error when player changes
  useEffect(() => {
    setImgError(false);
    setIsLoaded(false);
  }, [player?.id, player?.image_url]);

  if (!player) {
    return (
      <div
        className={`aspect-[4/5] rounded-2xl bg-night-surface/60 border border-night-border flex items-center justify-center ${className}`}
      >
        <div className="w-8 h-8 rounded-full border-2 border-flare/40 border-t-flare animate-spin" />
      </div>
    );
  }

  // Lookup in central mapping by stable player ID
  const imageMeta = player.id ? CENTRAL_MAPPING[player.id] : null;
  const isVerifiedInCentral = Boolean(
    imageMeta?.verificationStatus === 'verified' && imageMeta?.imagePath
  );
  const photoUrl = isVerifiedInCentral ? imageMeta!.imagePath : player.image_url;
  const hasValidPhoto = Boolean(photoUrl && !imgError && (isVerifiedInCentral || player.has_photo));

  const roleColor = (() => {
    const r = (player.role || '').toUpperCase();
    if (r.startsWith('BAT')) return '#F5B83D';
    if (r.startsWith('BOWL')) return '#4C8DFF';
    if (r.startsWith('ALL') || r === 'AR') return '#2FCB8F';
    if (r.startsWith('WICKET') || r === 'WK') return '#A56BFF';
    return '#FF7A1A';
  })();

  const initials = player.initials || player.name?.slice(0, 2).toUpperCase() || 'IPL';

  // Aspect ratio classes
  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'avatar'
      ? 'aspect-square rounded-full'
      : 'aspect-[4/5]';

  // Responsive sizing classes
  const sizeClass = (() => {
    switch (size) {
      case 'xs':
        return 'w-12 sm:w-14';
      case 'sm':
        return 'w-16 sm:w-20';
      case 'md':
        return 'w-24 sm:w-32';
      case 'lg':
        return 'w-40 sm:w-48';
      case 'xl':
        return 'w-52 sm:w-60 md:w-64';
      case 'responsive':
      default:
        return 'w-full';
    }
  })();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-night-border/80 shadow-2xl group select-none ${aspectClass} ${sizeClass} ${className}`}
      style={{
        boxShadow: `0 8px 30px -4px rgba(0, 0, 0, 0.7), 0 0 15px -3px ${roleColor}25`,
        borderColor: `${roleColor}40`,
      }}
    >
      {/* Background Floodlight Glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-35"
        style={{
          background: `radial-gradient(circle at 50% 20%, ${roleColor} 0%, transparent 70%)`,
        }}
      />

      {hasValidPhoto ? (
        /* Actual Verified Player Photograph — Clean Neutral Charcoal Presentation */
        <div
          className="relative w-full h-full overflow-hidden flex items-end justify-center"
          style={{
            background: `radial-gradient(ellipse at 50% 35%, #222632 0%, #13151D 60%, #0C0E13 100%)`,
          }}
        >
          {/* Shimmer skeleton while loading */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-night-surface/60 animate-pulse flex items-center justify-center z-10">
              <div className="w-6 h-6 rounded-full border-2 border-flare/30 border-t-flare animate-spin" />
            </div>
          )}

          {/* High-Fidelity Player Cutout — object-contain object-bottom ensures natural proportions without clipping or artificial zoom */}
          <img
            src={photoUrl!}
            alt={player.name}
            onError={() => setImgError(true)}
            onLoad={() => setIsLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={`w-full h-full object-contain object-bottom select-none transition-all duration-500 ease-out group-hover:scale-[1.02] ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      ) : (
        /* Professional IPL-Themed Card Placeholder */
        <div className="relative w-full h-full bg-gradient-to-b from-[#14161D] via-[#0E0F14] to-[#08090C] flex flex-col items-center justify-between p-4 overflow-hidden">
          {/* Subtle Geometric Stadium Lines */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id={`grid_${player.id}`}
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke={roleColor} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid_${player.id})`} />
          </svg>

          {/* Watermark Jersey Number */}
          {player.jersey_number && (
            <span className="absolute -right-2 top-2 font-display font-black text-6xl text-white/5 select-none pointer-events-none">
              #{player.jersey_number}
            </span>
          )}

          {/* Top Header in Placeholder */}
          <div className="w-full flex items-center justify-between z-10">
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white shadow-sm flex items-center gap-1"
              style={{ backgroundColor: roleColor }}
            >
              <Zap className="w-2.5 h-2.5" />
              {player.role}
            </span>
            <span className="text-[9px] font-bold text-flare tracking-widest uppercase">
              TATA IPL
            </span>
          </div>

          {/* Central Monogram & Cricket Crest */}
          <div className="flex flex-col items-center justify-center my-auto z-10 text-center">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border-2 shadow-2xl relative mb-2"
              style={{
                borderColor: `${roleColor}80`,
                background: `radial-gradient(circle, ${roleColor}25 0%, #0A0B0E 100%)`,
              }}
            >
              <span className="font-display font-black text-2xl sm:text-3xl text-floodlight tracking-wider drop-shadow-md">
                {initials}
              </span>
              <div className="absolute -bottom-1.5 px-2 py-0.2 rounded-full text-[8px] font-extrabold uppercase bg-night-card border border-flare/40 text-flare">
                {player.country}
              </div>
            </div>

            <p className="font-display font-bold text-xs sm:text-sm text-floodlight-muted tracking-wide max-w-[140px] truncate">
              {player.name}
            </p>
          </div>

          {/* Bottom Watermark Strip */}
          <div className="w-full pt-2 border-t border-night-border/40 flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-floodlight-subtle z-10">
            <span>Official Player Pool</span>
            <span className="text-flare font-mono">
              {player.capped ? 'Capped' : 'Uncapped'}
            </span>
          </div>
        </div>
      )}

      {/* Persistent Bottom Role Accent Bar */}
      <div
        className="absolute bottom-0 inset-x-0 h-1 z-20 pointer-events-none"
        style={{ backgroundColor: roleColor }}
      />
    </div>
  );
};
