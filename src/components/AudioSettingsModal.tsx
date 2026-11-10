'use client';

import React, { useState, useEffect } from 'react';
import { voiceCommentary } from '@/lib/voice-commentary';
import { soundFX } from '@/lib/sound-effects';
import { soundManager } from '@/lib/sound';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Check,
  X,
  Sparkles,
  Sliders,
  Radio,
  Settings,
} from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [volume, setVolume] = useState(90); // 0 - 100
  const [speechRate, setSpeechRate] = useState(1.10);
  const [isSFXMuted, setIsSFXMuted] = useState(false);
  const [detectedVoice, setDetectedVoice] = useState('Detecting voice...');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVoiceMuted(voiceCommentary.getIsMuted());
      setVolume(Math.round(voiceCommentary.getVolume() * 100));
      setSpeechRate(voiceCommentary.getSpeechRate());
      setIsSFXMuted(!soundFX.isEnabled());
      voiceCommentary.initVoiceSelection();
      setDetectedVoice(voiceCommentary.getDetectedVoiceName());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleVoice = () => {
    const next = !isVoiceMuted;
    setIsVoiceMuted(next);
    voiceCommentary.setMuted(next);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    voiceCommentary.setVolume(newVol / 100);
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    voiceCommentary.setSpeechRate(rate);
  };

  const handleToggleSFX = () => {
    const nextEnabled = soundFX.toggle();
    setIsSFXMuted(!nextEnabled);
  };

  const handleTestVoice = () => {
    if (isTesting) {
      voiceCommentary.stopAll();
      setIsTesting(false);
      return;
    }

    setIsTesting(true);
    voiceCommentary.testVoice(
      'Welcome to the TATA IPL 2026 Mega Auction! Virat Kohli is up next at a base price of 2 Crore rupees.',
      () => {
        setIsTesting(false);
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0D0E12] border border-night-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-night-border flex items-center justify-between bg-night-card">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-flare/10 border border-flare/30 text-flare">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-floodlight tracking-wide">
                AUDIO & COMMENTARY
              </h3>
              <p className="text-[11px] text-floodlight-muted">
                Indian English Female Presenter & Audio Controls
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              voiceCommentary.stopAll();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-night-surface hover:bg-night-raised border border-night-border text-floodlight-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Active Voice Detection Card */}
          <div className="p-3 rounded-xl bg-night-surface/90 border border-night-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-turf flex-shrink-0 animate-pulse" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-flare block">
                  Active Presenter Voice
                </span>
                <span className="text-xs font-semibold text-floodlight truncate block">
                  {detectedVoice}
                </span>
              </div>
            </div>

            <button
              onClick={handleTestVoice}
              disabled={isVoiceMuted}
              className={`px-3 py-1.5 rounded-pill text-xs font-bold border flex items-center gap-1.5 flex-shrink-0 transition-all ${
                isTesting
                  ? 'bg-hammer text-white border-hammer shadow-hammer animate-pulse'
                  : isVoiceMuted
                  ? 'bg-night-raised text-floodlight-subtle opacity-40 cursor-not-allowed border-night-border'
                  : 'bg-flare text-black border-flare shadow-flare hover:bg-flare-hover'
              }`}
            >
              {isTesting ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Test Voice</span>
                </>
              )}
            </button>
          </div>

          {/* Voice Commentary Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-night-card border border-night-border">
            <div>
              <div className="font-bold text-sm text-floodlight flex items-center gap-2">
                <Radio className="w-4 h-4 text-flare" />
                <span>Voice Commentary</span>
              </div>
              <div className="text-[11px] text-floodlight-muted mt-0.5">
                Spoken player spotlight announcements, bids & outcomes
              </div>
            </div>

            <button
              onClick={handleToggleVoice}
              className={`px-3.5 py-1.5 rounded-pill text-xs font-bold border transition-all ${
                !isVoiceMuted
                  ? 'bg-turf/20 text-turf border-turf/50'
                  : 'bg-night-raised text-floodlight-subtle border-night-border'
              }`}
            >
              {!isVoiceMuted ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-floodlight-muted flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-flare" />
                Commentary Volume
              </span>
              <span className="font-mono font-bold text-flare">{volume}%</span>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              disabled={isVoiceMuted}
              onChange={e => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-flare h-1.5 bg-night-raised rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Speech Speed / Cadence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-floodlight-muted">
                Presenter Speech Rate
              </span>
              <span className="font-mono font-bold text-flare">{speechRate}x</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '0.90x', rate: 0.9, title: 'Deliberate' },
                { label: '1.00x', rate: 1.0, title: 'Standard' },
                { label: '1.10x', rate: 1.1, title: 'Crisp (Recommended)' },
                { label: '1.25x', rate: 1.25, title: 'Fast' },
              ].map(item => (
                <button
                  key={item.rate}
                  type="button"
                  disabled={isVoiceMuted}
                  onClick={() => handleRateChange(item.rate)}
                  className={`py-2 px-1 rounded-xl text-center border transition-all text-xs font-bold ${
                    speechRate === item.rate
                      ? 'border-flare bg-flare/15 text-flare ring-1 ring-flare shadow-sm'
                      : 'border-night-border bg-night-surface hover:bg-night-raised text-floodlight-muted'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={item.title}
                >
                  <div>{item.label}</div>
                  <div className="text-[9px] font-normal truncate mt-0.5 opacity-70">
                    {item.title.split(' ')[0]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sound FX (SFX) Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-night-card border border-night-border">
            <div>
              <div className="font-bold text-sm text-floodlight flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-turf" />
                <span>Sound Effects (SFX)</span>
              </div>
              <div className="text-[11px] text-floodlight-muted mt-0.5">
                Gavel hammer, bidding clicks, heartbeat countdown
              </div>
            </div>

            <button
              onClick={handleToggleSFX}
              className={`px-3.5 py-1.5 rounded-pill text-xs font-bold border transition-all ${
                !isSFXMuted
                  ? 'bg-turf/20 text-turf border-turf/50'
                  : 'bg-night-raised text-floodlight-subtle border-night-border'
              }`}
            >
              {!isSFXMuted ? 'Enabled' : 'Muted'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-night-border bg-night-card flex justify-end">
          <button
            onClick={() => {
              voiceCommentary.stopAll();
              onClose();
            }}
            className="px-6 py-2 rounded-xl bg-flare hover:bg-flare-hover text-black font-bold text-xs shadow-flare transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

