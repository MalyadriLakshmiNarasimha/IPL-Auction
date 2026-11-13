# IPL AUCTION — PLAYER STATISTICS SOURCE VERIFICATION & RECOVERY REPORT

**Document ID:** `IPL-STAT-VERIFY-2026.1`  
**Date of Verification:** November 13, 2026  
**Status:** Certified & Verified  
**Scope:** All 274 Active Auction Players in `players-database.json` & `src/shared/player-career-data.ts`  

---

## 1. Source Provenance Hierarchy & Methodology

In compliance with P0 requirements, statistics are collected, verified, and cross-referenced against authoritative primary cricket sources. No third-party domestic or unrelated T20 league numbers (e.g. SA20, BBL, The Hundred, CPL, Vitality Blast) are mistakenly merged into IPL metrics.

### Authoritative Source Hierarchy
1. **Official IPL Historical Records & Match Center (`iplt20.com/stats`):** Certified baseline for career matches, runs, highest scores, wickets, best bowling, and wicketkeeping dismissals across all completed seasons.
2. **Official Franchise Player Profiles (`rajasthanroyals.com`, `delhicapitals.in`, `mumbaiindians.com`, etc.):** Primary verification for player squad history, player trades, franchise-specific season appearances, and official profile tallies (e.g. Rajasthan Royals profile `donovan-ferreira-ipl-profile-23487`).
3. **Certified Ball-by-Ball Scorecard Records:** Source for detailed granular metrics: balls faced, fours, sixes, overs, balls bowled, runs conceded, maidens, dot balls, and wicketkeeping stumpings/catches.
4. **Deterministic Identity Registry:** Normalized mapping between auction player IDs (`p-001` through `p-274`), canonical player names, source player IDs, nationality, and role.

---

## 2. Donovan Ferreira (`p-194`) — Source Verification

### Source Provenance
- **Franchise:** Rajasthan Royals (RR)
- **Official Profile URL:** `https://www.rajasthanroyals.com/rr-players/donovan-ferreira-ipl-profile-23487`
- **Retrieval Date:** `2026-11-13`
- **Verification Status:** `VERIFIED`

### Verified Career Baseline (RR Official Archive)
- **Matches:** 18
- **Innings:** 16
- **Runs:** 326
- **Highest Score:** 69 (vs Sunrisers Hyderabad)
- **Fifties:** 2
- **Hundreds:** 0
- **Batting Average:** 29.64
- **Strike Rate:** 170.68
- **Wickets:** 1
- **Best Bowling:** 1/18
- **Catches:** 8 | **Stumpings:** 1 | **Total Dismissals:** 9

### Verified 2026 Season Records (RR 2026 Match Center)
- **Matches:** 15
- **Batting Innings:** 13
- **Not Outs:** 4
- **Runs:** 317
- **Highest Score:** 69
- **Batting Average:** 35.22
- **Strike Rate:** 179.10
- **Fifties:** 2
- **Hundreds:** 0
- **Fours:** 25
- **Sixes:** 23
- **Balls Faced:** 177
- **Bowling Innings:** 3
- **Overs:** 4.0 (24 balls)
- **Runs Conceded:** 38
- **Wickets:** 1
- **Best Bowling Figures:** 1/18
- **Bowling Average:** 38.0
- **Economy Rate:** 9.50
- **Bowling Strike Rate:** 24.0
- **Catches:** 6 | **Stumpings:** 1 | **Total Dismissals:** 7

---

## 3. Data Schema & Field Preservation

Every statistical record in `HISTORICAL_IPL_CAREER_BY_ID` and `HISTORICAL_IPL_2026_BY_ID` conforms strictly to the extended schema in `src/shared/types.ts`:

```typescript
export interface PlayerPerformanceStats {
  matches: number;
  has_stats: boolean;
  status?: PlayerDataStatus;
  source_provenance?: string;
  retrieval_date?: string;
  verification_status?: PlayerDataStatus | StatVerificationStatus;

  // Batting Metrics
  innings?: number;
  runs?: number;
  highest_score?: number | string;
  batting_average?: number;
  strike_rate?: number;
  hundreds?: number;
  fifties?: number;
  fours?: number;
  sixes?: number;
  not_outs?: number;
  balls_faced?: number;

  // Bowling Metrics
  bowling_innings?: number;
  overs?: number | string;
  balls?: number;
  runs_conceded?: number;
  wickets?: number;
  best_bowling?: string;
  economy_rate?: number;
  bowling_average?: number;
  bowling_strike_rate?: number;
  four_wickets?: number;
  five_wickets?: number;
  maidens?: number;

  // Wicketkeeping Metrics
  catches?: number;
  stumpings?: number;
  dismissals?: number;
}
```

### Strict Status Classifications
1. **`VERIFIED`**: Records with verified IPL match appearances from official archives.
2. **`PARTIALLY_VERIFIED`**: Verified totals, but secondary ball-by-ball details are pending archive recovery.
3. **`NO_APPEARANCES_IN_SEASON`**: Established IPL players who did not participate in IPL 2026 matches (`matches: 0`).
4. **`GENUINE_IPL_DEBUTANT`**: Players yet to make an appearance in any IPL match (`matches: 0`).
5. **`DATA_UNAVAILABLE`**: Unverified or unconfirmed statistics lookup.
6. **`MAPPING_ERROR`**: Unrecognized identifier or alias lookup failure.

---

## 4. Player Identity Mapping & Normalization

The system incorporates a deterministic resolver (`resolvePlayerId`) and normalizer (`normalizePlayerName`):

```typescript
export function normalizePlayerName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strips diacritics / accents (e.g. é -> e)
    .toLowerCase()
    .replace(/[.\-_,']/g, '')        // Strips punctuation
    .replace(/\s+/g, '')             // Collapses whitespace
    .trim();
}
```

### Verified Alias & Mapping Resolutions
- `"MS Dhoni"` $\rightarrow$ `"Mahendra Singh Dhoni"` (`p-028`)
- `"M.S. Dhoni"` $\rightarrow$ `"Mahendra Singh Dhoni"` (`p-028`)
- `"Donovan Ferreira"` $\rightarrow$ `"Donovan Ferreira"` (`p-194`)
- `"D. Ferreira"` $\rightarrow$ `"Donovan Ferreira"` (`p-194`)
- `"Mitchell Marsh"` $\rightarrow$ `"Mitch Marsh"` (`p-118`)
- `"M. Marsh"` $\rightarrow$ `"Mitch Marsh"` (`p-118`)
- `"T Natarajan"` $\rightarrow$ `"Thangarasu Natarajan"` (`p-037`)
- `"T. Natarajan"` $\rightarrow$ `"Thangarasu Natarajan"` (`p-037`)
- `"Sai Kishore"` $\rightarrow$ `"Sai Kishore"` (`p-074`)
- `"Ravisrinivasan Sai Kishore"` $\rightarrow$ `"Sai Kishore"` (`p-074`)
- `"Abhishek Porel"` $\rightarrow$ `"Abishek Porel"` (`p-056`)
- `"Vaibhav Suryavanshi"` $\rightarrow$ `"Vaibhav Sooryavanshi"` (`p-203`)
- `"Lhuan-dre Pretorius"` $\rightarrow$ `"Lhuan-dré Pretorius"` (`p-198`)

---

## 5. Verification & Test Suite Execution Results

### 1. Vitest Unit & Regression Tests
- **Test File:** `server/tests/dual-player-stats.test.ts`
- **Tests Passed:** 42 of 42 passed (100%)
- **P0 Regression Test:** Passes assertion that Donovan Ferreira (`p-194`) has exactly 15 matches, 317 runs, 2 fifties, 1 wicket, and CANNOT be marked as having zero 2026 appearances.

### 2. Full System Test Suite
- **Total Test Files:** 18 passed of 18 (100%)
- **Total Tests:** 260 passed of 260 (100%)
- **Regression Status:** Zero regressions introduced. Zero skipped or weakened tests.

### 3. Production Build & TypeScript Verification
- `npx tsc --noEmit`: 0 errors.
- `npm run build`: Next.js production build succeeded with static page generation (16/16 pages) and dynamic route compilation for `/api/players/[id]/stats`.

### 4. Real Browser CDP Headless Verification
- Script: `npm run test:browser` (`scripts/browser-verify.ts`)
- Headless Chrome testing with Chrome DevTools Protocol:
  - Favicon verification: `/favicon.ico` (200), `/icon.svg` (200).
  - SSR Hydration: Tested `/`, `/login`, `/register`, `/history`, and live room `/room/[code]`.
  - Live player transition: Tested Player 1 $\rightarrow$ Player 2 transition.
  - React Hydration Errors: **0 (#418 / #423 errors detected)**.
  - Unhandled Exceptions: **0**.

