'use client';

import React from 'react';
import { Participant, RoomSettings } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { Wallet, TrendingUp, PieChart, ShieldAlert } from 'lucide-react';

interface SmartPurseAnalyzerProps {
  participant: Participant | null;
  settings: RoomSettings;
}

export const SmartPurseAnalyzer: React.FC<SmartPurseAnalyzerProps> = ({ participant, settings }) => {
  if (!participant || !participant.franchise) return null;

  const totalPurse = settings.purse;
  const purseRemaining = participant.purse_remaining;
  const spent = totalPurse - purseRemaining;
  const spentPct = Math.min(100, Math.round((spent / totalPurse) * 100));

  const squadCount = participant.squad.length;
  const avgPrice = squadCount > 0 ? Math.round(spent / squadCount) : 0;

  const emptySlots = Math.max(0, settings.squad_size - squadCount);
  const minReserveNeeded = emptySlots * 20_00_000;
  const reserveSafe = purseRemaining >= minReserveNeeded;

  const spentByRole = participant.spent_by_role || { BAT: 0, BOWL: 0, AR: 0, WK: 0 };
  const roleColors = {
    BAT: '#F5B83D',
    BOWL: '#4C8DFF',
    AR: '#2FCB8F',
    WK: '#A56BFF',
  };

  return (
    <div className="bg-night rounded-card border border-night-border p-3.5 sm:p-4 shadow-sm space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-night-border pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-flare" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight">
            Smart Purse Management
          </h3>
        </div>
        <span className="text-[11px] font-bold text-flare tabular-nums">
          {spentPct}% Spent
        </span>
      </div>

      {/* Purse Meter Bar */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
          <span className="text-floodlight-muted">
            Spent: <span className="text-floodlight font-display">{formatCurrency(spent)}</span>
          </span>
          <span className="text-floodlight-muted">
            Left: <span className="text-flare font-display">{formatCurrency(purseRemaining)}</span>
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-night-raised overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${spentPct}%`,
              background: 'linear-gradient(90deg, #FF7A1A 0%, #D6B65D 100%)',
            }}
          />
        </div>
      </div>

      {/* Avg Purchase Price & Reserve Status */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
          <span className="text-[10px] text-floodlight-muted uppercase font-bold block">Avg Price / Player</span>
          <span className="font-display font-black text-sm text-floodlight tabular-nums">
            {formatCurrency(avgPrice)}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-night-raised border border-night-border/40">
          <span className="text-[10px] text-floodlight-muted uppercase font-bold block">Reserve Rule</span>
          <span className={`font-bold text-xs mt-0.5 inline-block ${reserveSafe ? 'text-turf' : 'text-hammer'}`}>
            {reserveSafe ? `Safe (${formatCurrency(minReserveNeeded)})` : `Deficit Warning!`}
          </span>
        </div>
      </div>

      {/* Spending Breakdown by Role */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] text-floodlight-muted uppercase font-bold tracking-wider flex items-center gap-1">
          <PieChart className="w-3 h-3 text-flare" /> Spending by Role
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(['BAT', 'BOWL', 'AR', 'WK'] as const).map(role => {
            const roleSpent = spentByRole[role] || 0;
            const pct = spent > 0 ? Math.round((roleSpent / spent) * 100) : 0;
            return (
              <div
                key={role}
                className="p-1.5 rounded-lg bg-night-raised border border-night-border/30 text-center"
              >
                <div className="text-[9px] font-bold text-floodlight-muted flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColors[role] }} />
                  {role}
                </div>
                <div className="font-display font-black text-xs text-floodlight tabular-nums mt-0.5">
                  {formatCurrency(roleSpent)}
                </div>
                <div className="text-[9px] text-floodlight-subtle">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

