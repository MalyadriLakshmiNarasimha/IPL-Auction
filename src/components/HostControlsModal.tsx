'use client';

import React from 'react';
import { Participant, WorkflowStage } from '@/shared/types';
import {
  X,
  Play,
  Pause,
  SkipForward,
  StopCircle,
  UserX,
  Crown,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface HostControlsModalProps {
  isPaused: boolean;
  currentStage?: WorkflowStage;
  participants: Participant[];
  currentUserId: string;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onEndAuction: () => void;
  onKick: (targetId: string) => void;
  onTransferHost: (targetId: string) => void;
  onTransitionStage?: (stage: WorkflowStage) => void;
  onClose: () => void;
}

export const HostControlsModal: React.FC<HostControlsModalProps> = ({
  isPaused,
  currentStage = 'main_auction',
  participants,
  currentUserId,
  onPause,
  onResume,
  onSkip,
  onEndAuction,
  onKick,
  onTransferHost,
  onTransitionStage,
  onClose,
}) => {
  const stages: { key: WorkflowStage; label: string; number: string }[] = [
    { key: 'main_auction', label: '1. Live Main Auction', number: '1' },
    { key: 'unsold_auction', label: '2. Unsold Player Auction', number: '2' },
    { key: 'trading_window', label: '3. Player Trading Window', number: '3' },
    { key: 'squad_evaluation', label: '4. Complete Squad Evaluation', number: '4' },
    { key: 'playing_xi_selection', label: '5. Playing XI Selection', number: '5' },
    { key: 'playing_xi_evaluation', label: '6. Statistical Playing XI Rankings', number: '6' },
    { key: 'championship_recap', label: '7. Final Recap & Awards', number: '7' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-night rounded-card border border-night-border shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-night-border">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-flare" />
            <h2 className="font-bold text-base text-floodlight">Auctioneer & Host Console</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-floodlight-muted hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Controls */}
        <div className="grid grid-cols-2 gap-2.5">
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
            Skip Active Player
          </button>
        </div>

        {/* Workflow Stage Transitions */}
        {onTransitionStage && (
          <div className="pt-2 border-t border-night-border space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-flare" />
                Workflow Stages Transition
              </h3>
              <span className="text-[10px] text-flare font-mono font-bold uppercase">
                Active: {currentStage}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {stages.map(s => {
                const isActive = currentStage === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      if (confirm(`Transition auction room to stage: ${s.label}?`)) {
                        onTransitionStage(s.key);
                        onClose();
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded text-xs font-bold transition-all text-left border ${
                      isActive
                        ? 'bg-flare/20 border-flare text-flare'
                        : 'bg-night-raised hover:bg-night-border border-night-border text-floodlight'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="text-[10px] font-mono text-floodlight-muted flex items-center gap-1">
                      {isActive ? 'Current' : 'Jump'}
                      {!isActive && <ArrowRight className="w-3 h-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* End Auction Button */}
        <div>
          <button
            onClick={() => {
              if (confirm('Conclude the entire auction now and compute final championship results?')) {
                onEndAuction();
                onClose();
              }
            }}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-card bg-hammer/20 hover:bg-hammer/30 border border-hammer text-hammer font-bold text-xs"
          >
            <StopCircle className="w-4 h-4" />
            Conclude Auction & Finalize Results
          </button>
        </div>

        {/* Participant Management (Kick / Transfer Host) */}
        <div className="pt-3 border-t border-night-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-2">
            Manage Room Participants ({participants.length})
          </h3>
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
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
                    {p.is_spectator && (
                      <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded">
                        Spectator
                      </span>
                    )}
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
