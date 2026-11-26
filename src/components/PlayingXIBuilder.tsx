'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Participant, Player, PlayingXISubmission, BoughtPlayer } from '@/shared/types';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  UserCheck,
  Crown,
  Trash2,
  Plus,
  Lock,
  Sparkles,
  Users,
  ChevronRight,
  Info,
} from 'lucide-react';
import { formatCurrency } from '@/shared/constants';
import { PlayerPortrait } from '@/components/PlayerPortrait';

interface PlayingXIBuilderProps {
  participant: Participant;
  initialSubmission?: PlayingXISubmission | null;
  onSaveDraft: (draft: Partial<PlayingXISubmission>) => void;
  onSubmitXI: (submission: PlayingXISubmission) => void;
  isHost: boolean;
  onProceedToRankings?: () => void;
  allSubmissions?: PlayingXISubmission[];
  totalFranchises?: number;
  onOpenDossier?: (player: Player) => void;
}

export const PlayingXIBuilder: React.FC<PlayingXIBuilderProps> = ({
  participant,
  initialSubmission,
  onSaveDraft,
  onSubmitXI,
  isHost,
  onProceedToRankings,
  allSubmissions = [],
  totalFranchises = 1,
  onOpenDossier,
}) => {
  const isPkl = participant.squad.some(
    s =>
      s.player.id.startsWith('k-') ||
      s.player.id.startsWith('pkl-') ||
      ['Raider', 'Defender', 'RAID', 'DEF'].includes(s.player.role)
  );

  const targetLineupSize = isPkl ? 7 : 11;
  const maxOverseasAllowed = isPkl ? 2 : 4;

  // State for selected player IDs in lineup order (1 to targetLineupSize)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSubmission?.batting_order && initialSubmission.batting_order.length > 0) {
      return initialSubmission.batting_order;
    }
    const sorted = [...participant.squad].sort(
      (a, b) => (b.player.stats_2026?.player_points || 0) - (a.player.stats_2026?.player_points || 0)
    );
    return sorted.slice(0, targetLineupSize).map(s => s.player_id);
  });

  const [wicketkeeperId, setWicketkeeperId] = useState<string>(() => {
    if (isPkl) return '';
    if (initialSubmission?.wicketkeeper_id) return initialSubmission.wicketkeeper_id;
    const wk = participant.squad.find(s => s.player.role.toUpperCase().includes('WK'));
    return wk ? wk.player_id : '';
  });

  const [captainId, setCaptainId] = useState<string>(() => {
    return initialSubmission?.captain_id || '';
  });

  const isSubmitted = initialSubmission?.is_submitted || false;

  // Selected player objects in lineup order
  const selectedPlayers = useMemo(() => {
    return selectedIds
      .map(id => participant.squad.find(s => s.player_id === id)?.player)
      .filter((p): p is Player => p !== undefined);
  }, [selectedIds, participant.squad]);

  // Bench players (not selected in lineup)
  const benchPlayers = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return participant.squad.filter(s => !selectedSet.has(s.player_id));
  }, [selectedIds, participant.squad]);

  // Validation metrics
  const overseasCount = useMemo(() => {
    return selectedPlayers.filter(p => p.country !== 'India' && p.nationality !== 'India').length;
  }, [selectedPlayers]);

  const bowlingOptionsCount = useMemo(() => {
    return selectedPlayers.filter(p => {
      const r = p.role.toUpperCase();
      return r.includes('BOWL') || r.includes('ALL') || r === 'AR';
    }).length;
  }, [selectedPlayers]);

  const hasWk = useMemo(() => {
    if (isPkl) return true;
    if (!wicketkeeperId) return false;
    return selectedIds.includes(wicketkeeperId);
  }, [isPkl, wicketkeeperId, selectedIds]);

  const isValidLineup = isPkl
    ? selectedPlayers.length === 7 && overseasCount <= 2
    : selectedPlayers.length === 11 && overseasCount <= 4 && hasWk && bowlingOptionsCount >= 5;

  // Handlers
  const handleAddPlayer = (playerId: string) => {
    if (isSubmitted || selectedIds.length >= targetLineupSize) return;
    setSelectedIds(prev => [...prev, playerId]);
  };

  const handleRemovePlayer = (playerId: string) => {
    if (isSubmitted) return;
    setSelectedIds(prev => prev.filter(id => id !== playerId));
    if (wicketkeeperId === playerId) setWicketkeeperId('');
    if (captainId === playerId) setCaptainId('');
  };

  const handleMoveUp = (index: number) => {
    if (isSubmitted || index <= 0) return;
    setSelectedIds(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (isSubmitted || index >= selectedIds.length - 1) return;
    setSelectedIds(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleSaveDraft = () => {
    onSaveDraft({
      participant_id: participant.id,
      display_name: participant.display_name,
      franchise: participant.franchise!,
      players: selectedPlayers,
      batting_order: selectedIds,
      wicketkeeper_id: wicketkeeperId,
      captain_id: captainId,
      substitutes: benchPlayers.map(b => b.player),
      is_submitted: false,
    });
  };

  const handleSubmit = () => {
    if (!isValidLineup) return;
    const confirmMsg = isPkl
      ? 'Lock and submit your Starting 7? Lineups cannot be edited once locked.'
      : 'Lock and submit your Playing XI? Lineups cannot be edited once locked.';
    if (confirm(confirmMsg)) {
      onSubmitXI({
        participant_id: participant.id,
        display_name: participant.display_name,
        franchise: participant.franchise!,
        players: selectedPlayers,
        batting_order: selectedIds,
        wicketkeeper_id: wicketkeeperId,
        captain_id: captainId,
        substitutes: benchPlayers.map(b => b.player),
        is_submitted: true,
      });
    }
  };

  const getPositionLabel = (pos: number) => {
    if (isPkl) {
      if (pos === 1 || pos === 2) return { label: 'RAIDER', color: 'text-orange-400 bg-orange-400/10' };
      if (pos === 3 || pos === 4) return { label: 'COVER', color: 'text-blue-400 bg-blue-400/10' };
      if (pos === 5 || pos === 6) return { label: 'CORNER', color: 'text-indigo-400 bg-indigo-400/10' };
      return { label: 'ALL-ROUNDER', color: 'text-emerald-400 bg-emerald-400/10' };
    }
    if (pos === 1 || pos === 2) return { label: 'OPENER', color: 'text-amber-400 bg-amber-400/10' };
    if (pos >= 3 && pos <= 5) return { label: 'MIDDLE ORDER', color: 'text-orange-400 bg-orange-400/10' };
    if (pos === 6 || pos === 7) return { label: 'FINISHER / AR', color: 'text-emerald-400 bg-emerald-400/10' };
    return { label: 'BOWLER', color: 'text-blue-400 bg-blue-400/10' };
  };

  const submittedCount = allSubmissions.filter(s => s.is_submitted).length;

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="scoreboard-panel rounded-card border border-night-border p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-pill bg-flare/20 text-flare text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Stage 6 · Official {isPkl ? 'Starting 7' : 'Playing XI'} Selection
            </span>
            <span className="text-xs text-floodlight-muted">
              {submittedCount}/{totalFranchises} Franchises Locked
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-floodlight mt-1">
            {participant.franchise?.name} {isPkl ? 'STARTING 7' : 'MATCHDAY XI'}
          </h1>
          <p className="text-xs text-floodlight-muted mt-0.5">
            {isPkl
              ? 'Select 7 starters, assign tactical roles, and verify PKL overseas limit (≤ 2).'
              : 'Select 11 players, configure batting order (1-11), assign wicketkeeper, and verify IPL overseas limit (≤ 4).'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isHost && onProceedToRankings && (
            <button
              onClick={onProceedToRankings}
              className="px-4 py-2.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight font-bold text-xs flex items-center gap-1.5"
            >
              <span>View Lineup Rankings</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {!isSubmitted ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2.5 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight font-bold text-xs"
              >
                Save Draft
              </button>
              <button
                disabled={!isValidLineup}
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-pill bg-turf hover:bg-turf/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-turf flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Lock & Submit {isPkl ? 'Starting 7' : 'XI'}
              </button>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-pill bg-turf/20 border border-turf text-turf font-bold text-xs flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {isPkl ? 'Starting 7 Locked' : 'Playing XI Locked'}
            </div>
          )}
        </div>
      </div>

      {/* Rules Compliance Validator Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-3 rounded-card border text-xs flex items-center justify-between ${
            selectedPlayers.length === targetLineupSize
              ? 'bg-turf/10 border-turf/30 text-turf'
              : 'bg-night-raised border-night-border text-floodlight-muted'
          }`}
        >
          <div className="font-bold">{targetLineupSize} Starters Selected</div>
          <div className="font-mono font-black text-sm">{selectedPlayers.length}/{targetLineupSize}</div>
        </div>

        <div
          className={`p-3 rounded-card border text-xs flex items-center justify-between ${
            overseasCount <= maxOverseasAllowed
              ? 'bg-turf/10 border-turf/30 text-turf'
              : 'bg-hammer/20 border-hammer text-hammer animate-pulse'
          }`}
        >
          <div className="font-bold">Overseas (&le; {maxOverseasAllowed})</div>
          <div className="font-mono font-black text-sm">{overseasCount}/{maxOverseasAllowed}</div>
        </div>

        {isPkl ? (
          <>
            <div
              className={`p-3 rounded-card border text-xs flex items-center justify-between ${
                selectedPlayers.filter(p => p.role.toUpperCase().includes('RAID')).length >= 2
                  ? 'bg-turf/10 border-turf/30 text-turf'
                  : 'bg-night-raised border-night-border text-floodlight-muted'
              }`}
            >
              <div className="font-bold">Raiders (&ge; 2)</div>
              <div className="font-mono font-black text-sm">
                {selectedPlayers.filter(p => p.role.toUpperCase().includes('RAID')).length}/2+
              </div>
            </div>

            <div
              className={`p-3 rounded-card border text-xs flex items-center justify-between ${
                selectedPlayers.filter(p => p.role.toUpperCase().includes('DEF')).length >= 3
                  ? 'bg-turf/10 border-turf/30 text-turf'
                  : 'bg-night-raised border-night-border text-floodlight-muted'
              }`}
            >
              <div className="font-bold">Defenders (&ge; 3)</div>
              <div className="font-mono font-black text-sm">
                {selectedPlayers.filter(p => p.role.toUpperCase().includes('DEF')).length}/3+
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className={`p-3 rounded-card border text-xs flex items-center justify-between ${
                hasWk
                  ? 'bg-turf/10 border-turf/30 text-turf'
                  : 'bg-hammer/20 border-hammer text-hammer'
              }`}
            >
              <div className="font-bold">Wicketkeeper Set</div>
              <div className="font-bold">{hasWk ? '✓ Ready' : '✗ Required'}</div>
            </div>

            <div
              className={`p-3 rounded-card border text-xs flex items-center justify-between ${
                bowlingOptionsCount >= 5
                  ? 'bg-turf/10 border-turf/30 text-turf'
                  : 'bg-night-raised border-night-border text-floodlight-muted'
              }`}
            >
              <div className="font-bold">Bowling Options (&ge; 5)</div>
              <div className="font-mono font-black text-sm">{bowlingOptionsCount}/5+</div>
            </div>
          </>
        )}
      </div>

      {/* Main Selection Area: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Starting Order */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-night rounded-card border border-night-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-floodlight flex items-center gap-2">
                <Shield className="w-4 h-4 text-flare" />
                {isPkl ? 'Starting Seven (Mat Lineup 1 to 7)' : 'Starting Playing XI (Batting Order 1 to 11)'}
              </h2>
              <span className="text-[10px] text-floodlight-muted">
                Arrange positions with up/down controls
              </span>
            </div>

            {selectedPlayers.length === 0 ? (
              <div className="p-8 text-center text-xs text-floodlight-muted">
                {isPkl
                  ? 'No players added yet. Click "Add to Starting 7" from the squad bench on the right.'
                  : 'No players added yet. Click "Add to XI" from the squad bench on the right.'}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedPlayers.map((player, idx) => {
                  const pos = idx + 1;
                  const posMeta = getPositionLabel(pos);
                  const isWk = wicketkeeperId === player.id;
                  const isCapt = captainId === player.id;
                  const isOverseas = player.country !== 'India' && player.nationality !== 'India';

                  return (
                    <div
                      key={player.id}
                      className="p-3 rounded-card bg-night-raised border border-night-border flex items-center justify-between text-xs hover:border-flare/40 transition-all"
                    >
                      {/* Left: Position number & category */}
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-night border border-night-border flex items-center justify-center font-display font-black text-flare text-xs">
                          {pos}
                        </div>

                        <div className="w-9 h-11 rounded-md overflow-hidden flex-shrink-0">
                          <PlayerPortrait player={player} aspectRatio="4/5" size="responsive" showBadge={false} />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-floodlight">{player.name}</span>
                            {isOverseas && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-flare/20 text-flare">
                                OS
                              </span>
                            )}
                            {isWk && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                                WK
                              </span>
                            )}
                            {isCapt && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" /> C
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-floodlight-muted mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${posMeta.color}`}>
                              {posMeta.label}
                            </span>
                            <span>{player.role}</span>
                            <span>·</span>
                            <span>{player.country}</span>
                            <span>·</span>
                            <span className="text-flare font-bold">
                              {isPkl
                                ? player.position_detail || player.role
                                : player.batting_style || 'Right Handed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      {!isSubmitted && (
                        <div className="flex items-center gap-1.5">
                          {!isPkl && (
                            <button
                              onClick={() => setWicketkeeperId(player.id)}
                              title={isWk ? 'Current Wicketkeeper' : 'Make Wicketkeeper'}
                              className={`p-1.5 rounded text-xs font-bold ${
                                isWk
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-night hover:bg-night-border text-floodlight-muted'
                              }`}
                            >
                              WK
                            </button>
                          )}

                          <button
                            onClick={() => setCaptainId(isCapt ? '' : player.id)}
                            title={isCapt ? 'Captain' : 'Make Captain'}
                            className={`p-1.5 rounded text-xs font-bold ${
                              isCapt
                                ? 'bg-amber-500 text-white'
                                : 'bg-night hover:bg-night-border text-floodlight-muted'
                            }`}
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex flex-col gap-0.5">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveUp(idx)}
                              className="p-1 rounded bg-night hover:bg-night-border text-floodlight-muted disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === selectedPlayers.length - 1}
                              onClick={() => handleMoveDown(idx)}
                              className="p-1 rounded bg-night hover:bg-night-border text-floodlight-muted disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="p-1.5 rounded bg-night hover:bg-hammer/20 text-floodlight-muted hover:text-hammer"
                            title={isPkl ? 'Remove from Starting 7' : 'Remove from XI'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Bench / Substitutes Pool */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-night rounded-card border border-night-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-floodlight flex items-center gap-2">
                <Users className="w-4 h-4 text-floodlight-muted" />
                Squad Substitutes & Bench ({benchPlayers.length})
              </h2>
              <span className="text-[10px] text-floodlight-muted">
                Available to draft into {isPkl ? 'Starting 7' : 'XI'}
              </span>
            </div>

            {benchPlayers.length === 0 ? (
              <div className="p-8 text-center text-xs text-floodlight-muted">
                All squad players are currently in the {isPkl ? 'starting 7' : 'starting XI'}.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {benchPlayers.map((s: BoughtPlayer) => {
                  const isOverseas =
                    s.player.country !== 'India' && s.player.nationality !== 'India';
                  return (
                    <div
                      key={s.player_id}
                      className="p-3 rounded-card bg-night-raised border border-night-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-11 rounded-md overflow-hidden flex-shrink-0">
                          <PlayerPortrait player={s.player} aspectRatio="4/5" size="responsive" showBadge={false} />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-floodlight truncate">{s.player.name}</span>
                            {isOverseas && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-flare/20 text-flare">
                                OS
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-floodlight-muted mt-0.5">
                            {s.player.role} · {s.player.country} ·{' '}
                            <span className="text-flare font-bold">
                              {isPkl
                                ? s.player.position_detail || s.player.role
                                : s.player.batting_style || 'Right Handed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenDossier && (
                          <button
                            onClick={() => onOpenDossier(s.player)}
                            className="p-1 text-floodlight-muted hover:text-white"
                            title="Inspect Player Dossier"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isSubmitted && selectedPlayers.length < targetLineupSize && (
                          <button
                            onClick={() => handleAddPlayer(s.player_id)}
                            className="px-2.5 py-1 rounded-pill bg-flare hover:bg-flare-hover text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3 h-3" /> {isPkl ? 'Add to 7' : 'Add to XI'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

