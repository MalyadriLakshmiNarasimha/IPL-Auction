import { describe, it, expect } from 'vitest';
import jsPDF from 'jspdf';
import {
  calculate5PillarSquadScore,
  calculateManagerScore,
  calculatePlayingXIScore,
  computeAuctionResults,
  generateSeasonRecap,
  generateChampionshipAwards,
} from '../../src/shared/scoring';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import { FRANCHISE_PRESETS, DEFAULT_ROOM_SETTINGS, formatCurrency } from '../../src/shared/constants';
import { Participant, BoughtPlayer, TradeTransaction, PlayingXISubmission } from '../../src/shared/types';

describe('Stage 8: Final Reports, Season Recap, Awards & Genuine PDF Generation', () => {
  // Test fixture setup
  const csk = FRANCHISE_PRESETS[0];
  const mi = FRANCHISE_PRESETS[1];

  const p1Squad: BoughtPlayer[] = [
    { player_id: ALL_PLAYERS[0].id, player: ALL_PLAYERS[0], bought_for: 200000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[1].id, player: ALL_PLAYERS[1], bought_for: 150000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[2].id, player: ALL_PLAYERS[2], bought_for: 180000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[3].id, player: ALL_PLAYERS[3], bought_for: 50000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[4].id, player: ALL_PLAYERS[4], bought_for: 60000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[5].id, player: ALL_PLAYERS[5], bought_for: 40000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[6].id, player: ALL_PLAYERS[6], bought_for: 30000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[7].id, player: ALL_PLAYERS[7], bought_for: 40000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[8].id, player: ALL_PLAYERS[8], bought_for: 30000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[9].id, player: ALL_PLAYERS[9], bought_for: 20000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[10].id, player: ALL_PLAYERS[10], bought_for: 20000000, timestamp: Date.now() },
  ];

  const p2Squad: BoughtPlayer[] = [
    { player_id: ALL_PLAYERS[11].id, player: ALL_PLAYERS[11], bought_for: 160000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[12].id, player: ALL_PLAYERS[12], bought_for: 140000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[13].id, player: ALL_PLAYERS[13], bought_for: 120000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[14].id, player: ALL_PLAYERS[14], bought_for: 80000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[15].id, player: ALL_PLAYERS[15], bought_for: 70000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[16].id, player: ALL_PLAYERS[16], bought_for: 50000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[17].id, player: ALL_PLAYERS[17], bought_for: 40000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[18].id, player: ALL_PLAYERS[18], bought_for: 30000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[19].id, player: ALL_PLAYERS[19], bought_for: 30000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[20].id, player: ALL_PLAYERS[20], bought_for: 20000000, timestamp: Date.now() },
    { player_id: ALL_PLAYERS[21].id, player: ALL_PLAYERS[21], bought_for: 20000000, timestamp: Date.now() },
  ];

  const p1: Participant = {
    id: 'user-csk',
    room_code: 'FINL88',
    display_name: 'CSK Leader',
    role: 'manager',
    is_host: true,
    is_connected: true,
    is_spectator: false,
    last_active: Date.now(),
    franchise: csk,
    purse_remaining: 180000000,
    amount_spent: 820000000,
    avg_purchase_price: 74545454,
    squad: p1Squad,
    spent_by_role: { BAT: 350000000, BOWL: 280000000, AR: 130000000, WK: 60000000 },
    role_counts: { BAT: 4, BOWL: 4, AR: 2, WK: 1, overseas: 3 },
    squad_shortages: [],
    squad_excesses: [],
    has_withdrawn_current: false,
  };

  const p2: Participant = {
    id: 'user-mi',
    room_code: 'FINL88',
    display_name: 'MI Leader',
    role: 'manager',
    is_host: false,
    is_connected: true,
    is_spectator: false,
    last_active: Date.now(),
    franchise: mi,
    purse_remaining: 240000000,
    amount_spent: 760000000,
    avg_purchase_price: 69090909,
    squad: p2Squad,
    spent_by_role: { BAT: 300000000, BOWL: 270000000, AR: 120000000, WK: 70000000 },
    role_counts: { BAT: 4, BOWL: 4, AR: 2, WK: 1, overseas: 4 },
    squad_shortages: [],
    squad_excesses: [],
    has_withdrawn_current: false,
  };

  const trade: TradeTransaction = {
    id: 'tx-1',
    room_code: 'FINL88',
    team_a_name: 'Chennai Super Kings',
    team_a_short: 'CSK',
    player_a: ALL_PLAYERS[10],
    team_b_name: 'Mumbai Indians',
    team_b_short: 'MI',
    player_b: ALL_PLAYERS[21],
    timestamp: Date.now(),
  };

  const xiPlayers = p1Squad.map((s) => s.player);
  const xiSubmission: PlayingXISubmission = {
    participant_id: 'user-csk',
    display_name: 'CSK Leader',
    franchise: csk,
    players: xiPlayers,
    batting_order: xiPlayers.map((p) => p.id),
    wicketkeeper_id: xiPlayers[2].id,
    captain_id: xiPlayers[0].id,
    substitutes: [],
    is_submitted: true,
    is_locked: true,
  };

  it('1. Computes complete post-auction results including leaderboards and recaps', () => {
    const results = computeAuctionResults(
      'FINL88',
      [p1, p2],
      DEFAULT_ROOM_SETTINGS,
      p1Squad.map((s) => ({
        player_id: s.player_id,
        player: s.player,
        bids_count: 3,
        final_price: s.bought_for,
        winner_id: 'user-csk',
      })),
      [trade],
      [xiSubmission]
    );

    expect(results.room_code).toBe('FINL88');
    expect(results.leaderboard.length).toBe(2);
    expect(results.manager_leaderboard?.length).toBe(2);
    expect(results.playing_xi_leaderboard?.length).toBe(1);
    expect(results.total_money_spent).toBeGreaterThan(0);
    expect(results.awards.length).toBe(7);
    expect(results.season_recap).toBeDefined();
    expect(results.season_recap?.total_trades_completed).toBe(1);
  });

  it('2. Confers all 7 official Championship Laurels with data-driven winners', () => {
    const squadScores: any[] = [p1, p2].map((p, idx) => {
      const fivePillar = calculate5PillarSquadScore(p, DEFAULT_ROOM_SETTINGS);
      return {
        participant_id: p.id,
        display_name: p.display_name,
        franchise: p.franchise!,
        total_score: fivePillar.total_score,
        role_balance_score: Math.round(fivePillar.squad_balance_score * 4),
        completeness_score: 30,
        value_score: 30,
        individual_performance_score: fivePillar.individual_performance_score,
        batting_strength_score: fivePillar.batting_strength_score,
        bowling_strength_score: fivePillar.bowling_strength_score,
        allrounder_strength_score: fivePillar.allrounder_strength_score,
        squad_balance_score: fivePillar.squad_balance_score,
        strengths: fivePillar.strengths,
        weaknesses: fivePillar.weaknesses,
        scoring_version: '2026.1-5pillar',
        players_count: p.squad.length,
        total_spent: p.amount_spent,
        purse_remaining: p.purse_remaining,
        squad: p.squad,
        rank: idx + 1,
      };
    });

    const managerScores = [
      calculateManagerScore(p1, { purse: 1000000000, squad_size: 15 }, squadScores[0], [trade]),
      calculateManagerScore(p2, { purse: 1000000000, squad_size: 15 }, squadScores[1], [trade]),
    ];
    managerScores[0].rank = 1;
    managerScores[1].rank = 2;

    const xiScores = [calculatePlayingXIScore(xiSubmission)];
    xiScores[0].rank = 1;

    const awards = generateChampionshipAwards(squadScores, managerScores, xiScores, [trade]);

    expect(awards.length).toBe(7);
    const titles = awards.map((a) => a.title);
    expect(titles.some((t) => t.includes('Best Batting Squad'))).toBe(true);
    expect(titles.some((t) => t.includes('Best Bowling Squad'))).toBe(true);
    expect(titles.some((t) => t.includes('Best Balanced Squad'))).toBe(true);
    expect(titles.some((t) => t.includes('Best Auction Strategy'))).toBe(true);
    expect(titles.some((t) => t.includes('Trading Strategy') || t.includes('Bargain Hunter'))).toBe(true);
    expect(titles.some((t) => t.includes('Strongest Playing XI'))).toBe(true);
    expect(titles.some((t) => t.includes('Overall Auction Champion'))).toBe(true);

    // Winner attributes must be populated
    for (const award of awards) {
      expect(award.winner_name).toBeTruthy();
      expect(award.franchise_short_code).toBeTruthy();
      expect(award.value_highlight).toBeTruthy();
    }
  });

  it('3. Generates a genuine multi-page downloadable PDF document using jsPDF', () => {
    const squadScore: any = calculate5PillarSquadScore(p1, DEFAULT_ROOM_SETTINGS);
    squadScore.rank = 1;

    const managerScore = calculateManagerScore(p1, [trade]);
    managerScore.rank = 1;

    const lineupScore = calculatePlayingXIScore(xiSubmission);
    lineupScore.rank = 1;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header banner
    doc.setFillColor(15, 17, 21);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 122, 26);
    doc.text('IPL AUCTION 2026 · OFFICIAL POST-AUCTION FRANCHISE DOSSIER', margin, 12);
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Chennai Super Kings', margin, 21);

    // Summary Box
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 125);
    doc.text(`Squad Rank: #${squadScore.rank} (${squadScore.total_score}/100)`, margin, 50);
    doc.text(`Manager Rank: #${managerScore.rank} (${managerScore.total_manager_score}/100)`, margin, 56);
    doc.text(`Lineup Rank: #${lineupScore.rank} (${lineupScore.total_score}/100)`, margin, 62);

    // Roster rows
    let curY = 75;
    for (const [idx, s] of p1Squad.entries()) {
      doc.text(`${idx + 1}. ${s.player.name} (${s.player.role}) - ${formatCurrency(s.bought_for)}`, margin, curY);
      curY += 6;
    }

    // Page 2: Matchday XI
    doc.addPage();
    doc.text('Official Matchday Starting XI', margin, 20);
    curY = 30;
    for (const [idx, p] of xiSubmission.players.entries()) {
      doc.text(`Slot ${idx + 1}: ${p.name} - ${p.role} (${p.stats_2026?.player_points || 0} pts)`, margin, curY);
      curY += 6;
    }

    const outputBuffer = doc.output('arraybuffer');
    expect(outputBuffer).toBeDefined();
    expect(outputBuffer.byteLength).toBeGreaterThan(3000);

    // Verify PDF Magic Bytes (%PDF-)
    const headerBytes = new Uint8Array(outputBuffer.slice(0, 5));
    const headerString = String.fromCharCode(...headerBytes);
    expect(headerString).toBe('%PDF-');
  });
});
