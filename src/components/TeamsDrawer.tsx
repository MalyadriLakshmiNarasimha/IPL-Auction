'use client';

import React, { useState } from 'react';
import { Participant, RoomSettings } from '@/shared/types';
import { formatCurrency, formatRoleName } from '@/shared/constants';
import { ChevronDown, ChevronUp, Users, Shield } from 'lucide-react';
import { FranchiseLogo } from '@/components/FranchiseLogo';
import { PlayerPortrait } from '@/components/PlayerPortrait';

interface TeamsDrawerProps {
  participants: Participant[];
  settings: RoomSettings;
  currentUserId: string;
  currentBidderId?: string | null;
}

export const TeamsDrawer: React.FC<TeamsDrawerProps> = ({
  participants,
  settings,
  currentUserId,
  currentBidderId,
}) => {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const activeTeams = participants.filter(p => !p.is_spectator && (p.team_name || p.franchise));

  const toggleExpand = (id: string) => {
    setExpandedTeamId(prev => (prev === id ? null : id));
  };

  return (
    <div className="bg-night rounded-card border border-night-border p-3 sm:p-4 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-night-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-flare" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-floodlight">
            Teams ({activeTeams.length})
          </h3>
        </div>
        <span className="text-[11px] text-floodlight-muted">
          Squad Cap: {settings.squad_size}
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[350px] sm:max-h-[500px] pr-1">
        {activeTeams.map(p => {
          const isMe = p.id === currentUserId;
          const isLeader = p.id === currentBidderId;
          const isExpanded = expandedTeamId === p.id;
          const teamName = p.team_name || p.franchise?.name || 'Custom Team';
          const teamShortCode = p.team_short_code || p.franchise?.short_code || 'TM';
          const teamColor = p.team_color || p.franchise?.color || '#DCC477';
          const totalSpent = p.squad.reduce((sum, item) => sum + item.bought_for, 0);

          return (
            <div
              key={p.id}
              className={`rounded-lg border transition-all ${isLeader
                  ? 'border-flare bg-flare/10 shadow-sm'
                  : isMe
                    ? 'border-turf/50 bg-night-raised'
                    : 'border-night-border bg-night-raised/60'
                }`}
            >
              {/* Team Row Header */}
              <div
                onClick={() => toggleExpand(p.id)}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-night-raised select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center font-display font-black text-[10px] text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: teamColor }}
                  >
                    {teamShortCode.slice(0, 3)}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs sm:text-sm text-floodlight flex items-center gap-1.5 truncate">
                      <span className="truncate">{teamName}</span>
                      <span className="text-floodlight-muted font-normal text-xs truncate">
                        ({p.display_name})
                      </span>
                      {isMe && (
                        <span className="text-[10px] bg-turf/20 text-turf px-1.5 py-0.2 rounded font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <div>
                    <div className="font-display font-bold text-sm text-flare tabular-nums">
                      {formatCurrency(p.purse_remaining)}
                    </div>
                    <div className="text-[10px] text-floodlight-muted font-medium">
                      {p.squad.length}/{settings.squad_size} slots
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-floodlight-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-floodlight-muted" />
                  )}
                </div>
              </div>

              {/* Expanded Squad Drilldown */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-night-border/70 text-xs">
                  <div className="flex justify-between text-[11px] text-floodlight-muted mb-2 font-medium">
                    <span>Total Spent: {formatCurrency(totalSpent)}</span>
                    <span>Players: {p.squad.length}</span>
                  </div>

                  {p.squad.length === 0 ? (
                    <div className="text-center py-2 text-floodlight-subtle text-xs italic">
                      No players signed yet
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {p.squad.map((item, idx) => (
                        <div
                          key={`${item.player_id}-${idx}`}
                          className="flex items-center justify-between py-1 px-2 rounded bg-night/80 border border-night-border text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-6 h-7 rounded overflow-hidden flex-shrink-0">
                              <PlayerPortrait player={item.player} aspectRatio="4/5" size="responsive" showBadge={false} />
                            </div>
                            <span className="font-bold text-floodlight truncate">
                              {item.player.name}
                            </span>
                            <span className="text-[10px] px-1 rounded bg-night-border text-floodlight-muted">
                              {item.player.role}
                            </span>
                          </div>
                          <span className="font-display font-bold text-flare tabular-nums ml-2 flex-shrink-0">
                            {formatCurrency(item.bought_for)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

