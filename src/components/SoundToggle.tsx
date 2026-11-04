'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '@/lib/sound';

export const SoundToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(soundManager.isEnabled());
  }, []);

  const handleToggle = () => {
    const newState = soundManager.toggleSound();
    setEnabled(newState);
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-full border transition-all ${
        enabled
          ? 'bg-flare/20 border-flare text-flare shadow-flare'
          : 'bg-night-raised border-night-border text-floodlight-muted hover:text-white'
      }`}
      title={enabled ? 'Mute Sounds' : 'Enable Auction SFX'}
      aria-label={enabled ? 'Mute Sounds' : 'Enable Auction SFX'}
    >
      {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </button>
  );
};

