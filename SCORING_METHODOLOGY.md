# SCORING METHODOLOGY SPECIFICATION

## Project: IPL Auction & Team Management Ecosystem
**Engine Version:** `2026.1-5pillar`
**Implementation Location:** `src/shared/scoring.ts`

---

## 1. Stage 4: Five-Pillar Deterministic Squad Evaluation Model

The post-auction squad evaluation calculates an explainable, 0-100 composite index based on five fundamental cricketing pillars:

$$\text{Squad Score} = P_1 + P_2 + P_3 + P_4 + P_5$$

| Pillar | Focus | Weight | Scoring Mechanism |
|---|---|---|---|
| **Pillar 1: Individual Player Performance** | Star Power & Quality | **40 pts** | Average player points of top 11 squad players normalized on a 950-point benchmark: $\min(40, (\text{Top 11 Avg} / 950) \times 40)$. |
| **Pillar 2: Batting Strength & Firepower** | Run Volume & Strike Rate | **20 pts** | Run index based on 2,500 total squad runs (max 10 pts) + strike rate index normalized against 155.0 rpo (max 10 pts). |
| **Pillar 3: Bowling Attack & Penetration** | Wickets & Economy | **20 pts** | Certified wicket volume index based on 65 squad wickets (max 10 pts) + economy restriction index evaluated between 7.0 and 10.0 rpo (max 10 pts). |
| **Pillar 4: All-Rounder Depth** | Balance & Dual Threats | **10 pts** | All-rounder headcount index based on 3+ specialists (max 5 pts) + combined bat/bowl impact points (max 5 pts). |
| **Pillar 5: Squad Balance & IPL Regulations** | Depth & Compliance | **10 pts** | Base 10 points with strict rule deductions: -4 pts if 0 wicketkeepers; -5 pts if overseas players > 8 cap; -2 pts if < 3 specialist batters; -2 pts if < 3 specialist bowlers. |

---

## 2. Stage 5: Independent Manager Strategy Leaderboard

Evaluates managerial decision-making independently from raw player performance:

$$\text{Manager Score} = M_1 + M_2 + M_3 + M_4$$

| Criterion | Weight | Scoring Formula | Strategic Principle |
|---|---|---|---|
| **1. Purse Utilization Efficiency** | **25 pts** | $\min(25, (\text{Spent} / \text{Purse}) \times 20 + (\text{Reserve Met} ? 5 : 0))$ | Rewards spending 90-98% of purse while keeping emergency buffer. |
| **2. Value-for-Money Bargain Surplus**| **30 pts** | Benchmark baseline minus purchase price for Tier A/B/C acquisitions (Base 18 pts + surplus scaling). | Rewards acquiring marquee and impact stars below fair market value. |
| **3. Quality of Player Trades** | **20 pts** | Base 10 pts + net player performance points differential from ratified trades: $\text{Base} + (\Delta \text{Points} / 100) \times 10$. | Rewards executing value-positive trades that elevate squad talent. |
| **4. Final Squad Output** | **25 pts** | Normalized squad output rating: $({\text{Squad Score}} / 100) \times 25$. | Conversion efficiency of allocated budget into competitive strength. |

---

## 3. Stage 7: Statistical Playing XI Matchday Rankings

Evaluates each manager's designated 11-player lineup on matchday:

$$\text{Lineup Score} = L_{\text{bat}} + L_{\text{bowl}} + L_{\text{ar}} + L_{\text{balance}}$$

- **Batting Analysis (30 pts)**:
  - Openers Powerplay Potential (Positions 1-2): Up to 15 pts
  - Middle Order Resilience (Positions 3-5): Up to 15 pts
- **Bowling Analysis (30 pts)**:
  - Primary Attack Quality (Positions 8-11): Up to 18 pts
  - Death Bowling Economy & Finishers: Up to 12 pts
- **All-Rounder Utility (20 pts)**:
  - Dual-threat contributors in Slots 6-7 providing fifth/sixth bowling options.
- **Rule Compliance & Balance (20 pts)**:
  - Maximum 4 Overseas players allowed (-10 pts penalty if breached).
  - Minimum 1 active Wicketkeeper required (-8 pts penalty if breached).
  - Minimum 5 certified bowling options required (-6 pts penalty if breached).

---

## 4. Stage 8: Certified Championship Awards

Seven data-driven laurels are conferred at the conclusion of the ecosystem:
1. **🏆 Overall Auction Champion**: Highest overall squad score across all five pillars.
2. **🏏 Best Batting Squad**: Highest total batting strength score.
3. **🎯 Best Bowling Squad**: Highest wicket-taking and restrictive economy score.
4. **⚖️ Best Balanced Squad**: Highest squad balance and regulatory compliance score.
5. **🧠 Best Auction Strategy**: Highest independent manager performance score.
6. **🤝 Best Trading Strategy**: Most value-positive trade execution (or top bargain surplus).
7. **⭐ Strongest Playing XI**: Highest matchday 11-player lineup score.

