# IPL Auction 2027 — Authoritative CSV Import & Pipeline Report

**Date:** November 15, 2026  
**Status:** Completed & Fully Verified (P0 Critical Correctness)  
**Authoritative Source Folder:** `Upto2026/`  
**Registry Output:** `src/shared/player-stats-registry.json`  
**Ingestion Pipeline:** `scripts/import_upto2026_stats.ts`

---

## 1. Executive Summary

This report documents the complete replacement of the legacy statistics architecture with a deterministic, verified ingestion pipeline powered exclusively by the four authoritative CSV datasets in `Upto2026/`. 

All prior hardcoded statistics (`VERIFIED_STAR_STATS`), simulated hashing functions, mock values, and fallbacks have been completely eliminated from the codebase. The four CSV files in `Upto2026/` serve as the sole source of truth for both Overall IPL Career and IPL 2026 Season statistics across the platform.

---

## 2. Authoritative Dataset Ingestion Audit

All four datasets were validated prior to ingestion. The record counts and data schemas match the authoritative specifications exactly:

| Dataset File | File Path | Record Count | Unique `Player_ID`s | Duplicate IDs | Null Identifiers | Missing Names |
|---|---|---:|---:|---:|---:|---:|
| **Batting 2026** | `Upto2026/batting_2026.csv` | 175 | 175 | 0 | 0 | 0 |
| **Batting Overall** | `Upto2026/batting_overall.csv` | 737 | 737 | 0 | 0 | 0 |
| **Bowling 2026** | `Upto2026/bowling_2026.csv` | 125 | 125 | 0 | 0 | 0 |
| **Bowling Overall** | `Upto2026/bowling_overall.csv` | 576 | 576 | 0 | 0 | 0 |

### Key Ingestion Invariants:
1. **Zero Duplicate Records:** Every `Player_ID` within each file is strictly unique.
2. **Deterministic Source Key:** `Player_ID` serves as the primary foreign key across all four files.
3. **Canonical Name Reference:** `Full_Name` in the CSV files provides the canonical real-world name for identity resolution.
4. **Original CSV Files Preserved:** The original files in `Upto2026/` have not been altered, edited, or overwritten.

---

## 3. Dataset Schema & Column Specification

### Batting Schema (`batting_2026.csv` & `batting_overall.csv`)

| Column Name | Ingested Type | Description | Handling of Null / Empty |
|---|---|---|---|
| `Player` | string | Short / scorecard player name | Preserved for alias resolution |
| `Full_Name` | string | Canonical full player name | Used for normalized name matching |
| `Player_ID` | string | 8-character hex hash identifier | Source identity key |
| `Team_Short` | string (2026 only) | Franchise abbreviation (e.g. `RCB`, `CSK`) | Informational team metadata |
| `Team_Full` | string (2026 only) | Full franchise name | Informational team metadata |
| `Matches` | integer | Total matches played | Parsed strictly as integer |
| `Inns` | integer | Innings batted | Parsed strictly as integer |
| `Runs` | integer | Total runs scored | Parsed strictly as integer |
| `Avg` | float / null | Batting average | Kept as `undefined` if null (e.g. not out) |
| `Sr` | float / null | Batting strike rate | Kept as `undefined` if null (0 balls faced) |
| `4s` | integer | Boundaries (fours) hit | Parsed strictly as integer |
| `6s` | integer | Sixes hit | Parsed strictly as integer |

### Bowling Schema (`bowling_2026.csv` & `bowling_overall.csv`)

| Column Name | Ingested Type | Description | Handling of Null / Empty |
|---|---|---|---|
| `Player` | string | Short / scorecard player name | Preserved for alias resolution |
| `Full_Name` | string | Canonical full player name | Used for normalized name matching |
| `Player_ID` | string | 8-character hex hash identifier | Source identity key |
| `Team_Short` | string (2026 only) | Franchise abbreviation | Informational team metadata |
| `Team_Full` | string (2026 only) | Full franchise name | Informational team metadata |
| `M` | integer | Total matches played | Parsed strictly as integer |
| `Inns` | integer | Innings bowled | Parsed strictly as integer |
| `Overs` | float | Overs delivered (cricket decimal notation) | Parsed strictly as float |
| `Balls delivered`| integer | Total legal balls delivered | Exact count of legal balls |
| `Runs given` | integer | Total runs conceded | Parsed strictly as integer |
| `Wkts` | integer | Total wickets taken | Parsed strictly as integer |

---

## 4. Bowling Economy Calculation Methodology

In strict adherence to international cricket statistics standards and Section 5 instructions:
- Overs are expressed in cricket notation (e.g., `10.4` means 10 completed six-ball overs plus 4 balls, totaling 64 legal balls).
- Economy rate is calculated directly using `Runs given` and `Balls delivered`:
  $$\text{Economy Rate} = \frac{\text{Runs given}}{\text{Balls delivered}} \times 6$$
- Results are formatted to exactly 2 decimal places.
- If `Balls delivered == 0`, economy rate is recorded as `undefined` (rendered as `—`, never zero).

Example calculations verified:
- **Jasprit Bumrah (Career):** 4,441 runs conceded / 3,631 balls = $(4441 / 3631) \times 6 = 7.338... \rightarrow \mathbf{7.34}$
- **Donovan Ferreira (2026):** 41 runs conceded / 18 balls = $(41 / 18) \times 6 = 13.666... \rightarrow \mathbf{13.67}$
- **Hardik Pandya (Career):** 2,751 runs conceded / 1,764 balls = $(2751 / 1764) \times 6 = 9.357... \rightarrow \mathbf{9.36}$

---

## 5. Missing Statistics & Field Non-Proliferation

In compliance with the data integrity mandate:
1. **Unsupported fields are NOT invented:** Fields not present in the CSV datasets (such as Highest Score, Hundreds, Fifties, Not Outs, Best Bowling Figures, Maidens, Catches, Stumpings) are **never** estimated, hallucinated, or backfilled.
2. **Missing rendering rule:** Any metric not present in the CSV displays as `—` (dash) in the Twilight Scoreboard UI.
3. **Zero distinction:** A missing statistic is never converted to `0`, ensuring genuine zeroes (e.g., 0 wickets or 0 sixes) remain distinguishable from unrecorded metrics.

---

## 6. Ingestion Pipeline Execution Verification

The pipeline script `scripts/import_upto2026_stats.ts` executed cleanly and generated `src/shared/player-stats-registry.json`:
- **Execution Command:** `npx tsx scripts/import_upto2026_stats.ts`
- **Output Artifact:** `src/shared/player-stats-registry.json` (size: ~165 KB)
- **Total Auction Players Ingested:** 274 (`p-001` through `p-274`)
- **Unmapped Source CSV Records Preserved:** 563 records retained for auditability.
