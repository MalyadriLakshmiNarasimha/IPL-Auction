'use client';

import React from 'react';
import { Participant, RoomSettings } from '@/shared/types';
import { Users, AlertTriangle, CheckCircle, Shield, Globe } from 'lucide-react';

interface SquadCompositionAnalyzerProps {
  participant: Participant | null;
  settings: RoomSettings;
}

export const SquadCompositionAnalyzer: React.FC<SquadCompositionAnalyzerProps> = ({
  participant,
  settings,
}) => {
  if (!participant || !participant.franchise) return null;

  const counts = participant.role_counts || { BAT: 0, BOWL: 0, AR: 0, WK: 0, overseas: 0 };
  const shortages = participant.squad_shortages || [];
  const excesses = participant.squad_excesses || [];

  const scale = settings.squad_size / 15;
  const targetBAT = Math.round(5 * scale);
  const targetBOWL = Math.round(5 * scale);
  const targetAR = Math.round(3 * scale);
  const targetWK = Math.max(1, Math.round(2 * scale));

  const roleConfigs = [
    { key: 'BAT', label: 'Batters', count: counts.BAT, target: targetBAT, color: '#F5B83D' },
    { key: 'BOWL', label: 'Bowlers', count: counts.BOWL, target: targetBOWL, color: '#4C8DFF' },
    { key: 'AR', label: 'All-Rounders', count: counts.AR, target: targetAR, color: '#2FCB8F' },
    { key: 'WK', label: 'Wicketkeepers', count: counts.WK, target: targetWK, color: '#A56BFF' },
  ] as const;

  const totalPlayers = participant.squad.length;
  const depthPct = Math.min(100, Math.round((totalPlayers / settings.squad_size) * 100));

  return (
    <div className="bg-night rounded-card border border-night-border p-3.5 sm:p-4 shadow-sm space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-night-border pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-turf" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight">
            Squad Composition Analyzer
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-floodlight-muted">
          <Globe className="w-3.5 h-3.5 text-flare" />
          <span>Overseas:</span>
          <span className={`tabular-nums ${counts.overseas > 8 ? 'text-hammer' : 'text-flare'}`}>
            {counts.overseas}/8
          </span>
        </div>
      </div>

      {/* Role Counts vs Benchmarks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {roleConfigs.map(({ key, label, count, target, color }) => {
          const isTargetMet = count >= target;
          return (
            <div
              key={key}
              className="p-2 rounded-lg bg-night-raised border border-night-border/40 text-center"
            >
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-floodlight-muted uppercase">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </div>
              <div className="font-display font-black text-lg text-floodlight mt-0.5 tabular-nums">
                {count}{' '}
                <span className="text-[10px] text-floodlight-subtle font-normal font-sans">
                  / {target}
                </span>
              </div>
              <div className="text-[9px] mt-0.5 font-bold">
                {isTargetMet ? (
                  <span className="text-turf">Target Met</span>
                ) : (
                  <span className="text-floodlight-muted">Need +{target - count}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Squad Depth Bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold text-floodlight-muted mb-1">
          <span>Squad Depth & Roster Slots</span>
          <span className="text-flare tabular-nums">
            {totalPlayers} of {settings.squad_size} Players
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-night-raised overflow-hidden">
          <div
            className="h-full rounded-full bg-turf transition-all duration-500"
            style={{ width: `${depthPct}%` }}
          />
        </div>
      </div>

      {/* Shortage & Excess Alerts */}
      {(shortages.length > 0 || excesses.length > 0) && (
        <div className="space-y-1 pt-1">
          {shortages.map((s, idx) => (
            <div
              key={`shortage-${idx}`}
              className="px-2.5 py-1.5 rounded-lg bg-hammer/10 border border-hammer/30 text-[11px] font-bold text-hammer flex items-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{s}</span>
            </div>
          ))}
          {excesses.map((e, idx) => (
            <div
              key={`excess-${idx}`}
              className="px-2.5 py-1.5 rounded-lg bg-flare/10 border border-flare/30 text-[11px] font-bold text-flare flex items-center gap-2"
            >
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{e}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

