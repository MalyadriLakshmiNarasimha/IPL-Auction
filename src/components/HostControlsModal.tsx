'use client';

import React from 'react';
import { Participant } from '@/shared/types';
import { X, Play, Pause, SkipForward, StopCircle, UserX, Crown } from 'lucide-react';

interface HostControlsModalProps {
  isPaused: boolean;
  participants: Participant[];
  currentUserId: string;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onEndAuction: () => void;
  onKick: (targetId: string) => void;
  onTransferHost: (targetId: string) => void;
  onClose: () => void;
}

export const HostControlsModal: React.FC<HostControlsModalProps> = ({
  isPaused,
  participants,
  currentUserId,
  onPause,
  onResume,
  onSkip,
  onEndAuction,
  onKick,
  onTransferHost,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-night rounded-card border border-night-border shadow-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-night-border">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-flare" />
            <h2 className="font-bold text-base text-floodlight">Host Controls</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-floodlight-muted hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 my-4">
          {isPaused ? (
            <button
              onClick={() => {
                onResume();
                onClose();
              }}
              className="flex items-center justify-center gap-2 p-3 rounded-card bg-turf hover:bg-turf/90 text-white font-bold text-xs shadow-turf"
            >
              <Play className="w-4 h-4" />
              Resume Auction
            </button>
          ) : (
            <button
              onClick={() => {
                onPause();
                onClose();
              }}
              className="flex items-center justify-center gap-2 p-3 rounded-card bg-night-raised hover:bg-night-border border border-night-border text-floodlight font-bold text-xs"
            >
              <Pause className="w-4 h-4" />
              Pause Auction
            </button>
          )}

          <button
            onClick={() => {
              if (confirm('Skip the current player? They will become unsold.')) {
                onSkip();
                onClose();
              }
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-card bg-night-raised hover:bg-night-border border border-night-border text-floodlight font-bold text-xs"
          >
            <SkipForward className="w-4 h-4" />
            Skip Player
          </button>

          <button
            onClick={() => {
              if (confirm('End the auction now and compute final results?')) {
                onEndAuction();
                onClose();
              }
            }}
            className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-card bg-hammer/20 hover:bg-hammer/30 border border-hammer text-hammer font-bold text-xs"
          >
            <StopCircle className="w-4 h-4" />
            End Auction Early & View Results
          </button>
        </div>

        {/* Participant Management (Kick / Transfer Host) */}
        <div className="mt-4 pt-3 border-t border-night-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-2">
            Manage Participants ({participants.length})
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {participants.map(p => {
              if (p.id === currentUserId) return null;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded bg-night-raised border border-night-border text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    {p.franchise && (
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.franchise.color }}
                      />
                    )}
                    <span className="font-semibold text-floodlight truncate">
                      {p.display_name} {p.franchise ? `(${p.franchise.short_code})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (confirm(`Transfer host controls to ${p.display_name}?`)) {
                          onTransferHost(p.id);
                          onClose();
                        }
                      }}
                      title="Make Host"
                      className="p-1 rounded text-floodlight-muted hover:text-flare"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Kick ${p.display_name} from the room?`)) {
                          onKick(p.id);
                        }
                      }}
                      title="Kick Participant"
                      className="p-1 rounded text-floodlight-muted hover:text-hammer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

