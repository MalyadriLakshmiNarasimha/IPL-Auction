'use client';

import React, { useState } from 'react';
import { TeamScoreBreakdown, ManagerScoreBreakdown, PlayingXIScoreBreakdown, PlayingXISubmission, BoughtPlayer } from '@/shared/types';
import { formatCurrency } from '@/shared/constants';
import { X, Printer, Download, Trophy, Shield, Award, CheckCircle, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface DownloadReportModalProps {
  squadScore: TeamScoreBreakdown;
  managerScore?: ManagerScoreBreakdown;
  lineupScore?: PlayingXIScoreBreakdown;
  submission?: PlayingXISubmission;
  onClose: () => void;
}

export const DownloadReportModal: React.FC<DownloadReportModalProps> = ({
  squadScore,
  managerScore,
  lineupScore,
  submission,
  onClose,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Primary Franchise Theme Colors
      const franchiseHex = squadScore.franchise?.color || '#FF7A1A';
      const r = parseInt(franchiseHex.slice(1, 3), 16) || 255;
      const g = parseInt(franchiseHex.slice(3, 5), 16) || 122;
      const b = parseInt(franchiseHex.slice(5, 7), 16) || 26;

      // PAGE 1: EXECUTIVE SUMMARY & SQUAD ROSTER
      // Top Brand Header Banner
      doc.setFillColor(15, 17, 21);
      doc.rect(0, 0, pageWidth, 38, 'F');

      // Accent color strip
      doc.setFillColor(r, g, b);
      doc.rect(0, 38, pageWidth, 2.5, 'F');

      // Title & Franchise
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(r, g, b);
      doc.text('IPL AUCTION 2026 · OFFICIAL POST-AUCTION FRANCHISE DOSSIER', margin, 12);

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(squadScore.franchise?.name || 'Franchise Dossier', margin, 21);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(170, 178, 190);
      doc.text(
        `Executive Manager: ${squadScore.display_name}  ·  Short Code: ${squadScore.franchise?.short_code || 'IPL'}  ·  Season 2026`,
        margin,
        29
      );

      // Tri-Pillar Ranking Badges Box
      let curY = 47;
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, curY, pageWidth - margin * 2, 24, 'F');
      doc.setDrawColor(215, 220, 228);
      doc.rect(margin, curY, pageWidth - margin * 2, 24, 'S');

      // Badge 1: Squad Rank
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 125);
      doc.text('SQUAD RANK & SCORE', margin + 6, curY + 7);
      doc.setFontSize(14);
      doc.setTextColor(217, 119, 6); // amber
      doc.text(`#${squadScore.rank} (${squadScore.total_score}/100)`, margin + 6, curY + 16);

      // Badge 2: Manager Rank
      const col2 = margin + (pageWidth - margin * 2) / 3;
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 125);
      doc.text('MANAGER PERFORMANCE', col2 + 4, curY + 7);
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12); // flare
      doc.text(
        managerScore ? `#${managerScore.rank} (${managerScore.total_manager_score}/100)` : 'N/A',
        col2 + 4,
        curY + 16
      );

      // Badge 3: Matchday XI Rank
      const col3 = margin + ((pageWidth - margin * 2) * 2) / 3;
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 125);
      doc.text('MATCHDAY XI RANK', col3 + 4, curY + 7);
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129); // turf
      doc.text(
        lineupScore ? `#${lineupScore.rank} (${lineupScore.total_score}/100)` : 'N/A',
        col3 + 4,
        curY + 16
      );

      curY += 31;

      // Financial & Allocation Overview Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 25, 35);
      doc.text('Financial & Purse Utilization Summary', margin, curY);

      curY += 4;
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, curY, pageWidth - margin * 2, 16, 'F');
      doc.setDrawColor(225, 230, 238);
      doc.rect(margin, curY, pageWidth - margin * 2, 16, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 65, 75);
      doc.text(`Total Outlay: ${formatCurrency(squadScore.total_spent)}`, margin + 6, curY + 6);
      doc.text(`Remaining Purse: ${formatCurrency(squadScore.purse_remaining)}`, margin + 6, curY + 11.5);

      const finCol2 = margin + (pageWidth - margin * 2) / 2;
      doc.text(`Squad Size: ${squadScore.players_count || squadScore.squad?.length || 0} Players`, finCol2, curY + 6);
      doc.text(`Avg Price: ${formatCurrency(Math.round(squadScore.total_spent / Math.max(1, squadScore.players_count || 1)))}`, finCol2, curY + 11.5);

      curY += 24;

      // Complete Squad Table Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 25, 35);
      doc.text(`Complete Acquired Squad Roster (${squadScore.squad?.length || 0} Players)`, margin, curY);

      curY += 4;
      doc.setFillColor(30, 35, 45);
      doc.rect(margin, curY, pageWidth - margin * 2, 7, 'F');

      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('#', margin + 3, curY + 4.8);
      doc.text('PLAYER NAME', margin + 11, curY + 4.8);
      doc.text('ROLE', margin + 70, curY + 4.8);
      doc.text('NATIONALITY', margin + 105, curY + 4.8);
      doc.text('POINTS', margin + 140, curY + 4.8);
      doc.text('ACQUIRED PRICE', margin + 160, curY + 4.8);

      curY += 7;

      // Table Rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const squadList = squadScore.squad || [];
      squadList.forEach((s: BoughtPlayer, index: number) => {
        if (curY > pageHeight - 18) {
          doc.addPage();
          curY = 20;
          doc.setFillColor(30, 35, 45);
          doc.rect(margin, curY, pageWidth - margin * 2, 7, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text('#', margin + 3, curY + 4.8);
          doc.text('PLAYER NAME', margin + 11, curY + 4.8);
          doc.text('ROLE', margin + 70, curY + 4.8);
          doc.text('NATIONALITY', margin + 105, curY + 4.8);
          doc.text('POINTS', margin + 140, curY + 4.8);
          doc.text('ACQUIRED PRICE', margin + 160, curY + 4.8);
          curY += 7;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
        }

        const isEven = index % 2 === 0;
        doc.setFillColor(isEven ? 255 : 246, isEven ? 255 : 248, isEven ? 255 : 252);
        doc.rect(margin, curY, pageWidth - margin * 2, 6.2, 'F');

        doc.setTextColor(30, 35, 45);
        doc.text(String(index + 1), margin + 3, curY + 4.4);
        doc.setFont('helvetica', 'bold');
        doc.text(s.player.name.slice(0, 26), margin + 11, curY + 4.4);
        doc.setFont('helvetica', 'normal');
        doc.text(s.player.role, margin + 70, curY + 4.4);
        doc.text(s.player.country, margin + 105, curY + 4.4);
        doc.setTextColor(234, 88, 12);
        doc.text(`${s.player.stats_2026?.player_points || 0} pts`, margin + 140, curY + 4.4);
        doc.setTextColor(20, 25, 35);
        doc.text(formatCurrency(s.bought_for ?? (s as any).purchase_price ?? 0), margin + 160, curY + 4.4);

        curY += 6.2;
      });

      // PAGE 2: PLAYING XI & 5-PILLAR EVALUATIONS
      doc.addPage();
      curY = 16;

      // Header strip for Page 2
      doc.setFillColor(15, 17, 21);
      doc.rect(0, 0, pageWidth, 22, 'F');
      doc.setFillColor(r, g, b);
      doc.rect(0, 22, pageWidth, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(`${squadScore.franchise?.name || 'Franchise'} · Matchday XI & Strategic Analytics`, margin, 14);

      curY = 32;

      // Starting Playing XI section
      if (submission && submission.players && submission.players.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(20, 25, 35);
        doc.text('Official Matchday Starting XI (1 to 11 Batting Order)', margin, curY);

        curY += 4;
        doc.setFillColor(30, 35, 45);
        doc.rect(margin, curY, pageWidth - margin * 2, 7, 'F');

        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('POS', margin + 3, curY + 4.8);
        doc.text('PLAYER', margin + 18, curY + 4.8);
        doc.text('ROLE / DESIGNATION', margin + 85, curY + 4.8);
        doc.text('TACTICAL SLOT', margin + 135, curY + 4.8);
        doc.text('POINTS', margin + 165, curY + 4.8);

        curY += 7;
        doc.setFont('helvetica', 'normal');

        submission.players.forEach((p, idx) => {
          const isEven = idx % 2 === 0;
          doc.setFillColor(isEven ? 255 : 246, isEven ? 255 : 248, isEven ? 255 : 252);
          doc.rect(margin, curY, pageWidth - margin * 2, 6.2, 'F');

          const isCaptain = submission.captain_id === p.id;
          const isWK = submission.wicketkeeper_id === p.id;
          const desig = isCaptain && isWK ? ' [C & WK]' : isCaptain ? ' [C]' : isWK ? ' [WK]' : '';

          const tacticalSlot =
            idx < 2 ? 'Opener (1-2)' : idx < 5 ? 'Middle Order (3-5)' : idx < 7 ? 'Finisher (6-7)' : 'Bowler (8-11)';

          doc.setTextColor(234, 88, 12);
          doc.setFont('helvetica', 'bold');
          doc.text(`Slot ${idx + 1}`, margin + 3, curY + 4.4);

          doc.setTextColor(20, 25, 35);
          doc.text(`${p.name}${desig}`, margin + 18, curY + 4.4);

          doc.setFont('helvetica', 'normal');
          doc.text(p.role, margin + 85, curY + 4.4);
          doc.text(tacticalSlot, margin + 135, curY + 4.4);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(234, 88, 12);
          doc.text(`${p.stats_2026?.player_points || 0} pts`, margin + 165, curY + 4.4);

          curY += 6.2;
        });

        curY += 10;
      }

      // 5-Pillar Squad Evaluation Breakdown
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 25, 35);
      doc.text('Five-Pillar Deterministic Squad Evaluation Model (Version 2026.1)', margin, curY);

      curY += 4;
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, pageWidth - margin * 2, 28, 'F');
      doc.setDrawColor(220, 226, 235);
      doc.rect(margin, curY, pageWidth - margin * 2, 28, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 45, 55);

      const pillarCol1 = margin + 6;
      const pillarCol2 = margin + (pageWidth - margin * 2) / 2;

      doc.text(`1. Individual Player Performance (40% weight): ${squadScore.individual_performance_score ?? squadScore.role_balance_score ?? 0} pts`, pillarCol1, curY + 6);
      doc.text(`2. Batting Strength & Strike Potential (20% weight): ${squadScore.batting_strength_score ?? 0} pts`, pillarCol1, curY + 13);
      doc.text(`3. Bowling Economy & Wickets (20% weight): ${squadScore.bowling_strength_score ?? 0} pts`, pillarCol1, curY + 20);

      doc.text(`4. All-Rounder Depth (10% weight): ${squadScore.allrounder_strength_score ?? 0} pts`, pillarCol2, curY + 6);
      doc.text(`5. Squad Composition & Balance (10% weight): ${squadScore.squad_balance_score ?? 0} pts`, pillarCol2, curY + 13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(`Composite Squad Rating: ${squadScore.total_score} / 100`, pillarCol2, curY + 20);

      curY += 36;

      // Manager Evaluation 4-Index Breakdown
      if (managerScore) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(20, 25, 35);
        doc.text('Manager Strategic Execution Breakdown', margin, curY);

        curY += 4;
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, curY, pageWidth - margin * 2, 20, 'F');
        doc.setDrawColor(220, 226, 235);
        doc.rect(margin, curY, pageWidth - margin * 2, 20, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(40, 45, 55);

        doc.text(`Purse Efficiency (25 pts): ${managerScore.purse_efficiency_score} pts`, pillarCol1, curY + 6);
        doc.text(`Value for Money Bargain Index (30 pts): ${managerScore.value_for_money_score} pts`, pillarCol1, curY + 13);
        doc.text(`Trade Impact Quality (20 pts): ${managerScore.trade_quality_score} pts`, pillarCol2, curY + 6);
        doc.text(`Squad Output Index (25 pts): ${managerScore.squad_strength_score} pts`, pillarCol2, curY + 13);

        curY += 28;
      }

      // Official Footer
      doc.setDrawColor(215, 220, 228);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 145);
      doc.text('Official IPL Match Center & Team Management Ecosystem · Certified Post-Auction Documentation', margin, pageHeight - 9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 45, pageHeight - 9);

      // Download file to client
      const filename = `${squadScore.franchise?.short_code || 'Franchise'}_Season2026_Auction_Report.pdf`;
      doc.save(filename);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      alert('Could not generate PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#08090B] text-white rounded-card border border-night-border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Print / Close controls */}
        <div className="flex items-center justify-between pb-4 border-b border-night-border print:hidden">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-flare" />
            <span className="font-display font-black text-lg text-floodlight">
              Official Franchise Post-Auction Dossier
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-pill bg-flare hover:bg-flare-hover text-white font-bold text-xs shadow-flare flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Official PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-pill bg-night-raised hover:bg-night-border border border-night-border text-floodlight hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Dossier</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-floodlight-muted hover:text-white bg-night-raised border border-night-border"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-report" className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 rounded-card bg-night-raised border border-night-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {squadScore.franchise && (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center font-display font-black text-xl text-white shadow-lg"
                  style={{ backgroundColor: squadScore.franchise.color }}
                >
                  {squadScore.franchise.short_code}
                </div>
              )}
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-floodlight">
                  {squadScore.franchise?.name}
                </h1>
                <div className="text-xs text-floodlight-muted">
                  Executive Manager:{' '}
                  <span className="text-floodlight font-semibold">{squadScore.display_name}</span> · Season 2026
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="text-[10px] text-floodlight-muted uppercase font-bold">Squad Rank</div>
                <div className="font-display text-2xl font-black text-amber-400">#{squadScore.rank}</div>
              </div>
              {managerScore && (
                <div>
                  <div className="text-[10px] text-floodlight-muted uppercase font-bold">Manager Rank</div>
                  <div className="font-display text-2xl font-black text-flare">#{managerScore.rank}</div>
                </div>
              )}
              {lineupScore && (
                <div>
                  <div className="text-[10px] text-floodlight-muted uppercase font-bold">Lineup Rank</div>
                  <div className="font-display text-2xl font-black text-turf">#{lineupScore.rank}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tri-Pillar Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-card bg-night border border-night-border">
              <div className="text-[10px] text-floodlight-muted uppercase font-bold">Complete Squad Score</div>
              <div className="font-display text-2xl font-black text-flare mt-1 tabular-nums">
                {squadScore.total_score}
                <span className="text-xs text-floodlight-muted font-normal"> / 100</span>
              </div>
              <div className="text-[10px] text-floodlight-subtle mt-1">
                Batting: {squadScore.batting_strength_score || 0} · Bowling: {squadScore.bowling_strength_score || 0}
              </div>
            </div>

            <div className="p-4 rounded-card bg-night border border-night-border">
              <div className="text-[10px] text-floodlight-muted uppercase font-bold">Manager Performance</div>
              <div className="font-display text-2xl font-black text-turf mt-1 tabular-nums">
                {managerScore?.total_manager_score || 0}
                <span className="text-xs text-floodlight-muted font-normal"> / 100</span>
              </div>
              <div className="text-[10px] text-floodlight-subtle mt-1">
                VFM: {managerScore?.value_for_money_score || 0} · Efficiency: {managerScore?.purse_efficiency_score || 0}
              </div>
            </div>

            <div className="p-4 rounded-card bg-night border border-night-border">
              <div className="text-[10px] text-floodlight-muted uppercase font-bold">Playing XI Matchday</div>
              <div className="font-display text-2xl font-black text-blue-400 mt-1 tabular-nums">
                {lineupScore?.total_score || 0}
                <span className="text-xs text-floodlight-muted font-normal"> / 100</span>
              </div>
              <div className="text-[10px] text-floodlight-subtle mt-1">
                Openers: {lineupScore?.openers_rating || 0} pts · Finishers: {lineupScore?.finishers_rating || 0} pts
              </div>
            </div>
          </div>

          {/* Complete Squad Roster Table */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-floodlight flex items-center justify-between">
              <span>Complete Acquired Squad ({squadScore.squad?.length || 0} Players)</span>
              <span className="text-floodlight-muted font-mono font-normal">
                Total Outlay: {formatCurrency(squadScore.total_spent)} (Purse Left:{' '}
                {formatCurrency(squadScore.purse_remaining)})
              </span>
            </h2>

            <div className="overflow-x-auto rounded-card border border-night-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-night-raised border-b border-night-border text-floodlight-muted font-bold">
                  <tr>
                    <th className="p-2.5">Player</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Nationality</th>
                    <th className="p-2.5 text-right">Base Price</th>
                    <th className="p-2.5 text-right">Acquisition Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-night-border">
                  {squadScore.squad?.map((s: BoughtPlayer) => (
                    <tr key={s.player_id} className="hover:bg-night-raised/50">
                      <td className="p-2.5 font-bold text-floodlight">{s.player.name}</td>
                      <td className="p-2.5 text-floodlight-muted">{s.player.role}</td>
                      <td className="p-2.5 text-floodlight-muted">{s.player.country}</td>
                      <td className="p-2.5 text-right font-medium text-floodlight-muted">
                        {formatCurrency(s.player.base_price)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-floodlight font-semibold">
                        {formatCurrency(s.bought_for ?? s.purchase_price ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Starting XI Lineup Order */}
          {submission && submission.players && (
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-floodlight">
                Official Matchday Starting XI
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {submission.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-2 rounded bg-night-raised border border-night-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-night border border-night-border flex items-center justify-center font-bold text-flare text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-floodlight">{p.name}</span>
                      {submission.wicketkeeper_id === p.id && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded font-bold">
                          WK
                        </span>
                      )}
                      {submission.captain_id === p.id && (
                        <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 rounded font-bold">
                          C
                        </span>
                      )}
                    </div>
                    <span className="text-floodlight-muted text-[11px]">
                      {p.role} · <span className="text-flare font-medium">{p.batting_style || p.country}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Timestamp & Verification */}
          <div className="pt-4 border-t border-night-border flex items-center justify-between text-[10px] text-floodlight-subtle">
            <span>Verified 2026 IPL Match Center Engine · Certified Analytics Dossier</span>
            <span>Generated on {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
