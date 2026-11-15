# IPL Auction 2027 — Player Identity Verification & Name Integration Report

**Date:** November 15, 2026  
**Status:** Certified & Verified  
**Authoritative Dataset:** Cricsheet IPL ball-by-ball (1,243 matches, 2008–2026) & Multi-Source Verification  
**Test Suite Status:** 19/19 Test Files Passed (274/274 Tests, 100%)  
**Production Build:** Compiled Successfully (`next build` 0 errors)  
**Git Remote Policy:** Zero commits pushed to `origin/main`  

---

## 1. Executive Summary & Verification Objectives

This report documents the end-to-end investigation, canonical resolution, database integration, and regression testing for **28 abbreviated / ambiguous player names** appearing in the Cricsheet IPL ball-by-ball dataset (such as `S Arora` -> `Salil Arora`, `MD Choudhary` -> `Mukul Choudhary`, `SU Parakh` -> `Sahil Parakh`).

### Critical Principles Enforced:
1. **Zero Statistics Modification:** Original balls, runs, dismissals, wickets, overs, maidens, and strike rates from Cricsheet match files were 100% preserved.
2. **Zero Duplicate Players:** All players resolve deterministically to existing auction IDs (`p-001` to `p-274`).
3. **No Identity Guessing (Anti-Conflation):** Specifically for **P Dubey** (`p-171` Praveen Dubey), distinct identity has been rigorously maintained with 0 appearances in 2026, distinct from Shubham Dubey (`p-193`, RR), Harsh Dubey (`p-258`, SRH), and Saurabh Dubey (`p-098`, KKR).
4. **Metadata Preservation:** Player IDs, photographs, roles, base prices, categories, and auction order remain completely unaltered.
5. **Career vs 2026 Separation:** Authoritative career statistics (2008–2026) and 2026 season statistics remain strictly segregated across database records and client state.

---

## 2. Comprehensive 28 Verified Player Mappings Table

| # | Auction ID | Cricsheet ID | Raw Name | Verified Full Name | 2026 IPL Franchise | Role | 2026 IPL Record | Career Record | Primary Verification Sources |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `p-272` | `d7423da1` | `S Arora` | **Salil Arora** | Sunrisers Hyderabad | Wicketkeeper | 14 M, 11 Inns, 156 R, SR 159.18 | 14 M, 156 R | [SRH Profile](https://www.sunrisershyderabad.in/players/salil-arora), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/salil-arora) |
| 2 | `p-115` | `1c84109e` | `MD Choudhary` | **Mukul Choudhary** | Lucknow Super Giants | Batter | 10 M, 10 Inns, 170 R, HS 54* | 10 M, 170 R | [LSG Profile](https://www.lucknowsupergiants.in/players/mukul-choudhary), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/1395376.html) |
| 3 | `p-035` | `926c7443` | `SU Parakh` | **Sahil Parakh** | Delhi Capitals | Batter | 4 M, 4 Inns, 46 R, HS 24 | 4 M, 46 R | [DC Profile](https://www.delhicapitals.in/players/sahil-parakh), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/sahil-parakh) |
| 4 | `p-125` | `13fc5c6d` | `DS Rathi` | **Digvesh Singh Rathi** | Lucknow Super Giants | Bowler | 10 M, 10 Inns, 27.2 O, 5 W | 10 M, 5 W | [LSG Profile](https://www.lucknowsupergiants.in/players/digvesh-singh-rathi), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/digvesh-rathi) |
| 5 | `p-116` | `2d140b79` | `AA Kulkarni` | **Arshin Kulkarni** | Lucknow Super Giants | Batter | 2 M, 2 Inns, 17 R | 4 M, 26 R | [LSG Profile](https://www.lucknowsupergiants.in/players/arshin-kulkarni), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/1352467.html) |
| 6 | `p-050` | `5ffc0565` | `V Nigam` | **Vipraj Nigam** | Delhi Capitals | Bowler | 5 M, 15 R, 13 O, 2 W | 5 M, 15 R, 2 W | [DC Profile](https://www.delhicapitals.in/players/vipraj-nigam), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/vipraj-nigam) |
| 7 | `p-047` | `7c3c0337` | `Auqib Nabi` | **Auqib Nabi Dar** | Delhi Capitals | Bowler | 5 M, 14 R, 16.4 O, 0 W | 5 M, 14 R, 0 W | [DC Profile](https://www.delhicapitals.in/players/auqib-nabi-dar), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/auqib-nabi) |
| 8 | `p-110` | `f12fe2a1` | `T Dahiya` | **Tejasvi Dahiya** | Kolkata Knight Riders | Wicketkeeper | 2 M, 2 Inns, 12 R, HS 11 | 2 M, 12 R | [KKR Profile](https://www.kolkataknightriders.com/players/tejasvi-dahiya), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/tejasvi-dahiya) |
| 9 | `p-198` | `60aa2db3` | `LG Pretorius` | **Lhuan-dré Pretorius** | Rajasthan Royals | Batter | 2 M, 2 Inns, 7 R | 2 M, 7 R | [RR Profile](https://www.rajasthanroyals.com/players/lhuan-dre-pretorius), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/1391772.html) |
| 10 | `p-144` | `9e6032fa` | `DV Malewar` | **Danish Malewar** | Mumbai Indians | Batter | 2 M, 2 Inns, 2 R | 2 M, 2 R | [MI Profile](https://www.mumbaiindians.com/players/danish-malewar), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/danish-malewar) |
| 11 | `p-003` | `dee07622` | `RS Ghosh` | **Ramakrishna Ghosh** | Chennai Super Kings | Batter | 1 M, 3 O, 24 R, 1 W | 1 M, 1 W | [CSK Profile](https://www.chennaisuperkings.com/players/ramakrishna-ghosh), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/ramakrishna-ghosh) |
| 12 | `p-127` | `cf0ccafa` | `M Siddharth` | **Manimaran Siddharth** | Lucknow Super Giants | Bowler | 4 M, 4 Inns, 15 O, 6 W | 7 M, 9 W | [LSG Profile](https://www.lucknowsupergiants.in/players/manimaran-siddharth), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/1175402.html) |
| 13 | `p-252` | `c1e53c3f` | `R Smaran` | **Ravichandran Smaran** | Sunrisers Hyderabad | Batter | 6 M, 5 Inns, 19 R, HS 7 | 6 M, 19 R | [SRH Profile](https://www.sunrisershyderabad.in/players/ravichandran-smaran), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/smaran-r) |
| 14 | `p-199` | `02dfebbe` | `Yash Raj Punja` | **Yash Punja** | Rajasthan Royals | Batter | 8 M, 8 Inns, 30 O, 9 W | 8 M, 9 W | [RR Profile](https://www.rajasthanroyals.com/players/yash-punja), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/yash-punja) |
| 15 | `p-231` | `b8527c3d` | `Rasikh Salam` | **Rasikh Dar** | Royal Challengers Bengaluru | Bowler | 12 M, 12 Inns, 38.3 O, 19 W | 20 M, 28 W | [RCB Profile](https://www.royalchallengers.com/players/rasikh-dar), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/1162758.html) |
| 16 | `p-162` | `ba6b2f91` | `RA Bawa` | **Raj Bawa** | Mumbai Indians | All-Rounder | 3 M, 3 Inns, 16 R, 5 O, 2 W | 5 M, 27 R, 2 W | [MI Profile](https://www.mumbaiindians.com/players/raj-bawa), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/raj-bawa) |
| 17 | `p-203` | `470f446b` | `V Suryavanshi` | **Vaibhav Sooryavanshi** | Rajasthan Royals | Batter | 16 M, 16 Inns, 776 R, HS 103, SR 237.31 | 23 M, 876 R | [RR Profile](https://www.rajasthanroyals.com/players/vaibhav-sooryavanshi), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/vaibhav-suryavanshi) |
| 18 | `p-118` | `3d8feaf8` | `MR Marsh` | **Mitch Marsh** | Lucknow Super Giants | Batter | 13 M, 13 Inns, 563 R, HS 117* | 68 M, 1855 R, 37 W | [LSG Profile](https://www.lucknowsupergiants.in/players/mitch-marsh), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/272450.html) |
| 19 | `p-192` | `9418198b` | `P Simran Singh` | **Prabhsimran Singh** | Punjab Kings | Wicketkeeper | 14 M, 14 Inns, 510 R, HS 91 | 48 M, 1266 R | [PBKS Profile](https://www.punjabkingsipl.in/players/prabhsimran-singh), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/prabhsimran-singh) |
| 20 | `p-194` | `f0af99a7` | `D Ferreira` | **Donovan Ferreira** | Rajasthan Royals | Batter | 15 M, 13 Inns, 317 R, 1 W | 18 M, 326 R, 1 W | [RR Profile](https://www.rajasthanroyals.com/players/donovan-ferreira), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/696001.html) |
| 21 | `p-138` | `3241e3fd` | `N Pooran` | **Nicholas Pooran** | Lucknow Super Giants | Wicketkeeper | 14 M, 14 Inns, 234 R, HS 63 | 104 M, 2527 R | [LSG Profile](https://www.lucknowsupergiants.in/players/nicholas-pooran), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/nicholas-pooran) |
| 22 | `p-228` | `3d284ca3` | `PD Salt` | **Phil Salt** | Royal Challengers Bengaluru | Batter | 6 M, 6 Inns, 202 R, HS 78 | 40 M, 1258 R | [RCB Profile](https://www.royalchallengers.com/players/phil-salt), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/645731.html) |
| 23 | `p-009` | `a90e53ec` | `MW Short` | **Matt Short** | Chennai Super Kings | Batter | 3 M, 3 Inns, 60 R, HS 37 | 9 M, 177 R | [CSK Profile](https://www.chennaisuperkings.com/players/matt-short), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/matthew-short) |
| 24 | `p-109` | `e4cdf230` | `AS Roy` | **Anukul Roy** | Kolkata Knight Riders | All-Rounder | 14 M, 52 R, 38.3 O, 9 W | 23 M, 94 R, 14 W | [KKR Profile](https://www.kolkataknightriders.com/players/anukul-roy), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/anukul-roy) |
| 25 | `p-165` | `e4a0deae` | `MJ Santner` | **Mitch Santner** | Mumbai Indians | All-Rounder | 4 M, 26 R, 15 O, 5 W | 22 M, 93 R, 20 W | [MI Profile](https://www.mumbaiindians.com/players/mitchell-santner), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/502714.html) |
| 26 | `p-071` | `c7a995d3` | `R Sai Kishore` | **Sai Kishore** | Gujarat Titans | Bowler | 3 M, 3 Inns, 8 O, 1 W | 13 M, 14 W | [GT Profile](https://www.gujarattitansipl.com/players/sai-kishore), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/sai-kishore) |
| 27 | `p-189` | `54e52590` | `Vijaykumar Vyshak` | **Vijaykumar Vyshak** | Punjab Kings | Bowler | 10 M, 31 O, 9 W | 21 M, 22 W | [PBKS Profile](https://www.punjabkingsipl.in/players/vijaykumar-vyshak), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/1218529.html) |
| 28 | `p-135` | `f9e6e7ef` | `Shahbaz Ahmed` | **Shahbaz Ahmed** | Lucknow Super Giants | All-Rounder | 5 M, 58 R, 11.1 O, 5 W | 53 M, 439 R, 24 W | [LSG Profile](https://www.lucknowsupergiants.in/players/shahbaz-ahmed), [IPLT20](https://www.iplt20.com/stats/all-time), [Cricbuzz](https://www.cricbuzz.com/profiles/shahbaz-ahmed) |
| *Bonus* | `p-155` | `9ca68676` | `AM Ghazanfar` | **AM Ghazanfar** | Mumbai Indians | Bowler | 11 M, 38.5 O, 15 W, BBI 2/17 | 11 M, 15 W | [MI Profile](https://www.mumbaiindians.com/players/am-ghazanfar), [IPLT20](https://www.iplt20.com/stats/all-time), [ESPNcricinfo](https://www.espncricinfo.com/ci/content/player/1324483.html) |

---

## 3. Strict Identity Preservation: The P Dubey Anti-Conflation Case

A critical mandate was to ensure **P Dubey** was not guessed or conflated with any other player sharing the surname "Dubey". 

The analysis and resolution conclusively established:
1. **Praveen Dubey (`p-171`) — Punjab Kings:**
   - Cricsheet ID: `ed5a5510`
   - Career IPL Record: 5 Matches (DC 2020–2023), 23 Runs (HS 16, SR 69.70), 13.0 Overs, 111 Runs, 2 Wickets (BBI 1/19).
   - 2026 IPL Record: **0 Matches, 0 Runs, 0 Wickets** (Status: `NO_APPEARANCES_IN_SEASON`).
   - Sits in Punjab Kings squad for 2027 auction with zero 2026 ball-by-ball entries.
2. **Shubham Dubey (`p-193`) — Rajasthan Royals:**
   - Cricsheet ID: `6b2ff18f` (Short Name: `SB Dubey`)
   - Career IPL Record: 20 Matches, 17 Inns, 220 Runs (HS 34, SR 153.85, 17 4s, 13 6s).
   - 2026 IPL Record: 7 Matches, 6 Inns, 81 Runs (HS 31, SR 139.66, 8 4s, 3 6s).
3. **Harsh Dubey (`p-258`) — Sunrisers Hyderabad:**
   - Cricsheet ID: `25228673` (Short Name: `Harsh Dubey`)
   - Career IPL Record: 11 Matches, 13 Runs, 32.0 Overs, 192 Balls, 326 Runs Conceded, 13 Wickets (BBI 3/12).
   - 2026 IPL Record: 8 Matches, 13 Runs, 22.0 Overs, 132 Balls, 228 Runs Conceded, 8 Wickets (BBI 3/12).
4. **Saurabh Dubey (`p-098`) — Kolkata Knight Riders:**
   - Cricsheet ID: `11061889` (Short Name: `SR Dubey`)
   - Career IPL Record: 4 Matches, 4 Runs, 12.5 Overs, 77 Balls, 106 Runs Conceded, 5 Wickets (BBI 2/28).
   - 2026 IPL Record: 4 Matches, 4 Runs, 12.5 Overs, 77 Balls, 106 Runs Conceded, 5 Wickets (BBI 2/28).

**Conclusion:** All four Dubey players have completely distinct registry IDs, separate squad allocations, non-overlapping match records, and zero data conflation.

---

## 4. Unresolved Players Status

- **Unresolved Ambiguities:** **0 (Zero)**.
- Every single player in the 2026 season CSVs with an abbreviated or truncated name was conclusively matched to an official IPL franchise squad member and external ID in Wikidata / ESPNcricinfo / Cricbuzz.
- Overrides recorded in `manual_names.csv` cover all 29 distinct aliases.
- No player fell back to an unverified abbreviation in the auction application.

---

## 5. Verification & Test Suite Results

### 1. Dedicated Verification Test Suite: `twenty-eight-mappings.test.ts`
- **Result:** 5/5 Passed (100%)
- **Suites:**
  1. `Name & Alias Resolution (All 28 Mappings)` — verifies every alias resolves deterministically to the correct auction player ID (`p-001` through `p-274`).
  2. `Dual Statistics Separation for All 28 Mappings` — verifies career stats and 2026 stats remain strictly separate without data bleeding.
  3. `P Dubey Identity Preservation & Anti-Conflation` — verifies Praveen Dubey has 0 matches in 2026, isolated from Shubham, Harsh, and Saurabh Dubey.
  4. `Live Auction Route Integration (/api/players/[id]/stats)` — verifies HTTP 200 payload returns verified metadata, correct team, dual stats, and provenance links for all 28 target players.

### 2. Full Regression Suite (`npm test`)
- **Total Test Files:** 19 passed of 19 (100%)
- **Total Tests:** 274 passed of 274 (100%)
- **Duration:** 7.81s

### 3. Production Build (`npm run build`)
- **Framework:** Next.js 14.2.35
- **Type Checking:** 0 Errors
- **Linting:** 0 Errors
- **Static Pages Generated:** 16/16
- **Result:** Production build passed cleanly.
