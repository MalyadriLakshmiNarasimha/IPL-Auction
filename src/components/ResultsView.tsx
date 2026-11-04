'use client';

import React, { useState } from 'react';
import { AuctionResults, TeamScoreBreakdown } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { Trophy, Award as AwardIcon, Share2, RotateCcw, Home, ChevronDown, ChevronUp, Info, Download } from 'lucide-react';
import Link from 'next/link';

interface ResultsViewProps {
  results: AuctionResults;
  currentUserId: string;
  onPlayAgain?: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  currentUserId,
  onPlayAgain,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const myTeam = results.leaderboard.find(t => t.participant_id === currentUserId);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'IPLAuction Matchday Results',
        text: `Check out the IPL Auction results for Room ${results.room_code}!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Canvas-based Share Card Generator
  const downloadShareCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Dusk
    ctx.fillStyle = '#0B1530';
    ctx.fillRect(0, 0, 1200, 630);

    // Header gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 150);
    grad.addColorStop(0, '#121F42');
    grad.addColorStop(1, '#1A2A55');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 140);

    // Title
    ctx.fillStyle = '#FF7A1A';
    ctx.font = 'bold 52px "Big Shoulders Display", sans-serif';
    ctx.fillText('IPL AUCTION — MATCHDAY SQUAD RESULTS', 60, 80);

    ctx.fillStyle = '#F2EFE4';
    ctx.font = '24px "DM Sans", sans-serif';
    ctx.fillText(`Room Code: ${results.room_code} · Total Spent: ${formatCurrency(results.total_money_spent)}`, 60, 120);

    // Top 3 Leaderboard
    const top3 = results.leaderboard.slice(0, 3);
    top3.forEach((team, idx) => {
      const y = 200 + idx * 110;
      ctx.fillStyle = idx === 0 ? 'rgba(255, 122, 26, 0.15)' : '#121F42';
      ctx.strokeStyle = idx === 0 ? '#FF7A1A' : '#233566';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(60, y, 1080, 90, 14);
      ctx.fill();
      ctx.stroke();

      // Rank
      ctx.fillStyle = idx === 0 ? '#FF7A1A' : '#F2EFE4';
      ctx.font = 'bold 36px "Big Shoulders Display", sans-serif';
      ctx.fillText(`#${team.rank}`, 90, y + 55);

      // Franchise badge
      ctx.fillStyle = team.franchise.color;
      ctx.beginPath();
      ctx.arc(180, y + 45, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px "Big Shoulders Display", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(team.franchise.short_code, 180, y + 52);
      ctx.textAlign = 'left';

      // Name & Score
      ctx.fillStyle = '#F2EFE4';
      ctx.font = 'bold 24px "DM Sans", sans-serif';
      ctx.fillText(team.display_name, 230, y + 45);

      ctx.font = '16px "DM Sans", sans-serif';
      ctx.fillStyle = '#9AA5C2';
      ctx.fillText(`${team.players_count} Players · Spent: ${formatCurrency(team.total_spent)}`, 230, y + 70);

      // Score
      ctx.fillStyle = '#FF7A1A';
      ctx.font = 'bold 44px "Big Shoulders Display", sans-serif';
      ctx.fillText(`${team.total_score} PTS`, 960, y + 58);
    });

    // Disclaimer footer
    ctx.fillStyle = '#586991';
    ctx.font = '14px "DM Sans", sans-serif';
    ctx.fillText('Virtual money only. Unofficial fan game. Not affiliated with BCCI/IPL.', 60, 595);

    // Download image
    const link = document.createElement('a');
    link.download = `IPL-Auction-Results-${results.room_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hero Header */}
      <div className="text-center py-6 scoreboard-panel rounded-card border border-night-border relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-flare/20 border border-flare text-flare text-xs font-bold mb-3">
          <Trophy className="w-4 h-4" />
          AUCTION CONCLUDED
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-black text-floodlight tracking-tight">
          MATCHDAY SQUAD RESULTS
        </h1>
        <p className="text-sm text-floodlight-muted mt-1 max-w-lg mx-auto">
          {results.total_players_auctioned} players drafted across {results.leaderboard.length} franchises with a total turnover of {formatCurrency(results.total_money_spent)}.
        </p>

        {/* Action buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={downloadShareCard}
            className="flex items-center gap-2 px-4 py-2 rounded-pill bg-flare hover:bg-flare-hover text-white text-xs font-bold shadow-flare transition-all"
          >
            <Download className="w-4 h-4" />
            Download Result Card
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight text-xs font-bold transition-all"
          >
            <Share2 className="w-4 h-4" />
            {copiedLink ? 'Link Copied!' : 'Share Results'}
          </button>
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="flex items-center gap-2 px-4 py-2 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight text-xs font-bold transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight text-xs font-bold transition-all"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>

      {/* Awards Strip (Horizontal Scroll) */}
      {results.awards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AwardIcon className="w-4 h-4 text-flare" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-floodlight">
              Auction Night Awards
            </h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {results.awards.map(award => (
              <div
                key={award.id}
                className="flex-shrink-0 w-64 bg-night rounded-card border border-night-border p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-flare">
                      {award.title}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: award.franchise_color }}
                    />
                  </div>
                  <div className="text-sm font-bold text-floodlight truncate">
                    {award.winner_name}
                  </div>
                  <div className="text-[11px] text-floodlight-muted mt-1">
                    {award.description}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-night-border flex items-center justify-between text-xs">
                  <span className="text-floodlight-subtle font-medium">Highlight</span>
                  <span className="font-display font-black text-flare text-sm">
                    {award.value_highlight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Table with 100-Point Formula */}
      <div className="bg-night rounded-card border border-night-border p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-night-border">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-floodlight">Franchise Leaderboard</h2>
            <p className="text-xs text-floodlight-muted">Ranked by 100-point balanced squad algorithm</p>
          </div>

          {/* Formula Tooltip Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowFormulaTooltip(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-night-raised border border-night-border text-xs text-floodlight-muted hover:text-white"
            >
              <Info className="w-3.5 h-3.5 text-flare" />
              <span>Score Formula</span>
            </button>

            {showFormulaTooltip && (
              <div className="absolute right-0 top-9 z-30 w-72 p-3 rounded-card bg-night-raised border border-night-border shadow-xl text-xs text-floodlight-muted">
                <div className="font-bold text-floodlight mb-1">Squad Rating Formula (100 Pts):</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong className="text-flare">40% Role Balance:</strong> Optimum distribution (4-6 BAT, 4-6 BOWL, 2-4 AR, 1-2 WK).</li>
                  <li><strong className="text-turf">30% Completeness:</strong> Filled squad slots / squad size target.</li>
                  <li><strong className="text-blue-400">30% Value for Money:</strong> Player tier quality vs final purchase price.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Rows */}
        <div className="space-y-2.5">
          {results.leaderboard.map(team => {
            const isFirst = team.rank === 1;
            const isMe = team.participant_id === currentUserId;
            const isExpanded = expandedId === team.participant_id;

            return (
              <div
                key={team.participant_id}
                className={`rounded-card border transition-all ${
                  isFirst
                    ? 'border-flare bg-flare/10 shadow-flare'
                    : isMe
                    ? 'border-turf/50 bg-night-raised'
                    : 'border-night-border bg-night-raised/50'
                }`}
              >
                {/* Row Header */}
                <div
                  onClick={() => toggleExpand(team.participant_id)}
                  className="p-3 sm:p-4 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-display font-black text-xl sm:text-2xl w-7 text-center ${
                        isFirst ? 'text-flare' : 'text-floodlight-muted'
                      }`}
                    >
                      #{team.rank}
                    </span>

                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm text-white flex-shrink-0"
                      style={{ backgroundColor: team.franchise.color }}
                    >
                      {team.franchise.short_code}
                    </div>

                    <div className="truncate">
                      <div className="font-bold text-xs sm:text-sm text-floodlight flex items-center gap-2 truncate">
                        <span>{team.franchise.name}</span>
                        <span className="text-xs font-normal text-floodlight-muted truncate">
                          ({team.display_name})
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-turf/20 text-turf px-1.5 py-0.2 rounded font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-floodlight-muted">
                        {team.players_count} players · Spent: {formatCurrency(team.total_spent)} · Purse left: {formatCurrency(team.purse_remaining)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div>
                      <div className="font-display font-black text-2xl sm:text-3xl text-flare tabular-nums">
                        {team.total_score}
                        <span className="text-xs text-floodlight-subtle ml-0.5">/100</span>
                      </div>
                      <div className="text-[10px] text-floodlight-muted">
                        Role: {team.role_balance_score} · Value: {team.value_score}
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-floodlight-muted" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-floodlight-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded Squad Breakdown */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-night-border/70 text-xs">
                    <div className="text-xs font-bold text-floodlight mb-2">
                      Full Squad ({team.squad.length} players)
                    </div>

                    {team.squad.length === 0 ? (
                      <div className="text-floodlight-subtle italic py-2">No players signed</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {team.squad.map((item, idx) => (
                          <div
                            key={`${item.player_id}-${idx}`}
                            className="p-2 rounded bg-night border border-night-border flex items-center justify-between"
                          >
                            <div className="truncate">
                              <div className="font-bold text-floodlight truncate">
                                {item.player.name}
                              </div>
                              <div className="text-[10px] text-floodlight-muted">
                                {item.player.role} · {item.player.country}
                              </div>
                            </div>
                            <div className="font-display font-bold text-flare text-sm tabular-nums ml-2 flex-shrink-0">
                              {formatCurrency(item.bought_for)}
                            </div>
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
    </div>
  );
};

