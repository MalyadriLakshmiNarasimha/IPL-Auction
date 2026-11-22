'use client';

import React, { useState } from 'react';
import { AuctionResults, Player } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { ChampionshipAwardsView } from '@/components/ChampionshipAwardsView';
import { SquadEvaluationView } from '@/components/SquadEvaluationView';
import { ManagerLeaderboardView } from '@/components/ManagerLeaderboardView';
import { PlayingXILeaderboardView } from '@/components/PlayingXILeaderboardView';
import { TeamDashboardView } from '@/components/TeamDashboardView';
import { SeasonRecapView } from '@/components/SeasonRecapView';
import { PlayerDossierModal } from '@/components/PlayerDossierModal';
import {
  Trophy,
  Award as AwardIcon,
  Share2,
  RotateCcw,
  Home,
  Download,
  Briefcase,
  Users,
  Shield,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface ResultsViewProps {
  results: AuctionResults;
  currentUserId: string;
  onPlayAgain?: () => void;
}

type TabType = 'awards' | 'squads' | 'managers' | 'lineups' | 'dashboard' | 'recap';

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  currentUserId,
  onPlayAgain,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('awards');
  const [inspectPlayer, setInspectPlayer] = useState<Player | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

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
    ctx.fillStyle = '#08090B';
    ctx.fillRect(0, 0, 1200, 630);

    // Header gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 150);
    grad.addColorStop(0, '#151618');
    grad.addColorStop(1, '#1E1D19');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 140);

    // Title
    ctx.fillStyle = '#D6B65D';
    ctx.font = 'bold 52px "Big Shoulders Display", sans-serif';
    ctx.fillText('IPL AUCTION — MATCHDAY SQUAD RESULTS', 60, 80);

    ctx.fillStyle = '#F4F0E6';
    ctx.font = '24px "DM Sans", sans-serif';
    ctx.fillText(
      `Room Code: ${results.room_code} · Total Spent: ${formatCurrency(results.total_money_spent)}`,
      60,
      120
    );

    // Top 3 Leaderboard
    const top3 = results.leaderboard.slice(0, 3);
    top3.forEach((team, idx) => {
      const y = 200 + idx * 110;
      ctx.fillStyle = idx === 0 ? 'rgba(255, 122, 26, 0.15)' : '#151618';
      ctx.strokeStyle = idx === 0 ? '#D6B65D' : '#3A3426';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(60, y, 1080, 90, 14);
      ctx.fill();
      ctx.stroke();

      // Rank
      ctx.fillStyle = idx === 0 ? '#D6B65D' : '#F4F0E6';
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
      ctx.fillStyle = '#F4F0E6';
      ctx.font = 'bold 24px "DM Sans", sans-serif';
      ctx.fillText(team.display_name, 230, y + 45);

      ctx.font = '16px "DM Sans", sans-serif';
      ctx.fillStyle = '#A6A29A';
      ctx.fillText(
        `${team.players_count} Players · Spent: ${formatCurrency(team.total_spent)}`,
        230,
        y + 70
      );

      // Score
      ctx.fillStyle = '#D6B65D';
      ctx.font = 'bold 44px "Big Shoulders Display", sans-serif';
      ctx.fillText(`${team.total_score} PTS`, 960, y + 58);
    });

    // Disclaimer footer
    ctx.fillStyle = '#716D65';
    ctx.font = '14px "DM Sans", sans-serif';
    ctx.fillText('Virtual money only. Unofficial fan game. Not affiliated with BCCI/IPL.', 60, 595);

    // Download image
    const link = document.createElement('a');
    link.download = `IPL-Auction-Results-${results.room_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Hero Header */}
      <div className="text-center py-6 scoreboard-panel rounded-card border border-night-border relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-flare/20 border border-flare text-flare text-xs font-bold mb-3">
          <Trophy className="w-4 h-4" />
          AUCTION CONCLUDED
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-black text-floodlight tracking-tight">
          MATCHDAY CHAMPIONSHIP PORTAL
        </h1>
        <p className="text-sm text-floodlight-muted mt-1 max-w-xl mx-auto">
          {results.total_players_auctioned} players drafted across {results.leaderboard.length}{' '}
          franchises with a gross turnover of {formatCurrency(results.total_money_spent)}.
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

      {/* Post-Auction View Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-night-border scrollbar-none">
        <button
          onClick={() => setActiveTab('awards')}
          className={`px-4 py-2 rounded-pill text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'awards'
              ? 'bg-flare text-white shadow-flare'
              : 'bg-night-raised text-floodlight-muted hover:text-white border border-night-border'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Championship Honors (7)</span>
        </button>

        <button
          onClick={() => setActiveTab('squads')}
          className={`px-4 py-2 rounded-pill text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'squads'
              ? 'bg-flare text-white shadow-flare'
              : 'bg-night-raised text-floodlight-muted hover:text-white border border-night-border'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Squad Evaluation & Rankings</span>
        </button>

        <button
          onClick={() => setActiveTab('managers')}
          className={`px-4 py-2 rounded-pill text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'managers'
              ? 'bg-flare text-white shadow-flare'
              : 'bg-night-raised text-floodlight-muted hover:text-white border border-night-border'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Manager Leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab('lineups')}
          className={`px-4 py-2 rounded-pill text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'lineups'
              ? 'bg-flare text-white shadow-flare'
              : 'bg-night-raised text-floodlight-muted hover:text-white border border-night-border'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Playing XI Standings</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-pill text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'dashboard'
              ? 'bg-flare text-white shadow-flare'
              : 'bg-night-raised text-floodlight-muted hover:text-white border border-night-border'
          }`}
        >
          <AwardIcon className="w-4 h-4" />
          <span>Franchise Dossier & PDF Export</span>
        </button>

        <button
          onClick={() => setActiveTab('recap')}
          className={`px-4 py-2 rounded-pill text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'recap'
              ? 'bg-flare text-white shadow-flare'
              : 'bg-night-raised text-floodlight-muted hover:text-white border border-night-border'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Season Archives & Recap</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'awards' && <ChampionshipAwardsView awards={results.awards} />}

      {activeTab === 'squads' && (
        <SquadEvaluationView
          leaderboard={results.leaderboard}
          currentUserId={currentUserId}
          isHost={false}
        />
      )}

      {activeTab === 'managers' && (
        <ManagerLeaderboardView
          managers={results.manager_leaderboard || []}
          currentUserId={currentUserId}
          isHost={false}
        />
      )}

      {activeTab === 'lineups' && (
        <PlayingXILeaderboardView
          lineups={results.playing_xi_leaderboard || []}
          submissions={results.playing_xi_submissions || []}
          currentUserId={currentUserId}
          isHost={false}
        />
      )}

      {activeTab === 'dashboard' && (
        <TeamDashboardView
          results={results}
          currentUserId={currentUserId}
          onOpenDossier={player => setInspectPlayer(player)}
        />
      )}

      {activeTab === 'recap' && results.season_recap && (
        <SeasonRecapView recap={results.season_recap} results={results} />
      )}

      {/* Player Dossier Inspector Modal */}
      {inspectPlayer && (
        <PlayerDossierModal
          player={inspectPlayer}
          onClose={() => setInspectPlayer(null)}
        />
      )}
    </div>
  );
};
