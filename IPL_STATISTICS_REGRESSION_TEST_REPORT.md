# IPL AUCTION — AUTOMATED REGRESSION TEST REPORT

**Document ID:** `IPL-REGRESSION-REPORT-2026.1`  
**Date:** November 13, 2026  
**Status:** 100% Tests Passing  

---

## 1. Test Suite Summary

- **Total Test Files:** 18
- **Total Tests Passed:** 268 (100%)
- **Test Framework:** Vitest v3.2.7 + Playwright / Headless Chrome DevTools Protocol
- **TypeScript Typecheck:** 0 Errors (`npx tsc --noEmit`)
- **Next.js Production Build:** Successful (`npm run build`)
- **React Hydration Errors:** 0 Detected (#418 / #423)

---

## 2. Critical Regression Test Cases

### A. Mukul Choudhary (`p-115`)
- **Assertion:** `careerStats.matches === 10` and `careerStats.runs === 170`.
- **Assertion:** `seasonStats.matches === 10` and `seasonStats.runs === 170`.
- **Assertion:** Must NOT have `status === 'GENUINE_IPL_DEBUTANT'`.
- **Outcome:** **PASS**

### B. Jacob Bethell (`p-220`)
- **Assertion:** `careerStats.matches === 9` and `careerStats.runs === 163`.
- **Assertion:** `seasonStats.matches === 7` and `seasonStats.runs === 96`.
- **Assertion:** Must NOT have `status === 'GENUINE_IPL_DEBUTANT'`.
- **Assertion:** Career numbers are strictly separate from 2026 season numbers ($	ext{Career} > 	ext{Season}$).
- **Outcome:** **PASS**

### C. Shreyas Iyer (`p-172`)
- **Assertion:** `seasonStats.matches === 14` and `seasonStats.runs === 498`.
- **Assertion:** `seasonStats.highest_score === '101*'`.
- **Assertion:** `seasonStats.batting_average === 55.33`.
- **Assertion:** `seasonStats.strike_rate === 168.81`.
- **Assertion:** `seasonStats.fifties === 5` and `seasonStats.hundreds === 1`.
- **Assertion:** Must NOT display 6 matches and 139 runs.
- **Outcome:** **PASS**

### D. Donovan Ferreira (`p-194`)
- **Assertion:** `seasonStats.matches === 15` and `seasonStats.runs === 317`.
- **Assertion:** `careerStats.matches === 18` and `careerStats.runs === 326`.
- **Assertion:** Must NOT display zero appearances.
- **Outcome:** **PASS**

---

## 3. End-to-End Pipeline & Dual-Client Synchronization

- **Socket.IO Event Payload:** Both connected clients receive identical `current_player` objects with fresh `ipl_career_stats` and `season_2026_stats`.
- **No Stale Player Data:** `PlayerStatsCarousel` and `PlayerSpotlight` look up authoritative registry entries directly by player ID, preventing stale client-side cache pollution.
- **HTTP REST Endpoint:** `/api/players/[id]/stats` resolves player by ID, canonical name, and alias with full provenance metadata.
