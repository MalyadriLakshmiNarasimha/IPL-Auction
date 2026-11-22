# PKL DATA AUDIT — EXISTING SYSTEM AUDIT & IMPLEMENTATION BLUEPRINT

**Document Version:** 1.0.0 (Pre-Implementation Audit)  
**Target Platform:** Sports Auction – The Bidding Arena  
**Scope:** Step 1 Audit of PKL Integration, Placeholders, Database Architecture, and Official PKL Reference Comparison  
**Repository Path:** `c:\Users\laksh\IPL-PKL\PKL1`  
**Generated Date:** November 22, 2026  
**Status:** Read-Only Verification (No Code or Dataset Modifications Made)

---

## 1. EXECUTIVE SUMMARY

This audit establishes the baseline for building the official **Pro Kabaddi League (PKL)** dataset and auction environment in "Sports Auction – The Bidding Arena", referencing the proven IPL production architecture (`players-database.json`, `src/shared/player-data.ts`, `src/shared/player-stats-registry.json`, `src/shared/scoring.ts`, and `src/shared/constants.ts`).

### Key Findings:
1. **Existing PKL Footprint is a Shell:** PKL room creation, franchise identities (12 teams), and basic bid increments (+₹2L, +₹5L, +₹10L) exist in constants and types, but the player pool consists of only 72 hardcoded mock players (`RAW_PKL_PLAYERS` in `src/shared/pkl-player-data.ts`) using legacy IDs (`pkl-001` through `pkl-072`).
2. **Missing Core Datasets:** There is currently no `pkl-players-database.json`, no `pkl-player-stats-registry.json`, and no `pkl-team-stats.json`.
3. **Database Architecture ("sport" location):** The MySQL database via Prisma (`prisma/schema.prisma`) **does not have a dedicated `sport` column** on the `Room`, `RoomParticipant`, or `Result` tables. Sport type (`'IPL' | 'PKL'`) is persisted inside the serialized `state_data` JSON field of `RoomSnapshot` (`state_data.settings.sport_type`) and stored in runtime memory on `RoomRecord.settings.sport_type`.
4. **Discovered Official Archive (`PKL_DATABASE.zip`):** A pre-existing local archive in the project root contains scraped Season 12 data from `prokabaddi.com`: 12 official teams and 235 verified squad players across all 12 franchises (111 Defenders, 88 Raiders, 36 All-Rounders).
5. **Auction & Scoring Engine Flaws:** Current room logic passes PKL players into cricket-specific category sequencers (lumping raiders and defenders into `BATTERS`), enforces a ₹20 Lakh cricket purse reserve (fatal on a ₹5 Cr PKL purse), and lacks kabaddi-specific 5-Pillar squad scoring or Starting 7 evaluation.

---

## 2. COMPARISON: IPL REFERENCE VS. CURRENT PKL STATE

| Architectural Layer | IPL Reference Implementation (Cricket) | Current PKL Implementation (Kabaddi) | Status & Gap Analysis |
|---|---|---|---|
| **Player Master Database** | `players-database.json` (274 players: IDs `p-001` to `p-274`, roles, batting/bowling styles, card text, jersey numbers) | `src/shared/pkl-player-data.ts` (72 mock players hardcoded directly in TS; IDs `pkl-001` to `pkl-072`) | **Placeholder:** Needs dedicated `pkl-players-database.json` with 235 players namespaced `k-001` through `k-235`. |
| **Runtime Adapter** | `src/shared/player-data.ts` (adapts raw DB, merges `AUCTION_OVERLAYS`, career/season stats, generates procedural fallback SVG) | `src/shared/pkl-player-data.ts` (`ALL_PKL_PLAYERS` maps mock records to `Player` interface) | **Partial / Outdated:** Re-uses cricket `Player` interface; needs proper kabaddi position tags (Corners, Covers) and `k-xxx` IDs. |
| **Statistics Registry** | `src/shared/player-stats-registry.json` (~854 KB; 4 verified CSVs in `Upto2026/`; career & 2026 season stats) | Inlined stats inside `pkl-player-data.ts` (synthetic stats for 22 stars; 50 players have empty stats) | **Missing:** No centralized `pkl-player-stats-registry.json` or structured multi-season archive. |
| **Team Master Data** | `src/shared/constants.ts` (10 official IPL franchises + 10 expansion clubs; colors, codes, IDs) | `PKL_FRANCHISES` in `src/shared/pkl-player-data.ts` (12 official PKL teams: PAT, PUN, JPP, BB, DEL, MUM, BW, GG, HAR, TAM, TEL, UP) | **Valid Structure:** 12 teams match official PKL. Colors and codes are accurate. |
| **Team Vector Logos** | `src/components/FranchiseLogo.tsx` (10 bespoke inline SVGs: CSK Lion, MI Chakra, RCB Crest, etc.) | Fallback generic container (`div` with dark background and short code initials) | **Missing:** All 12 PKL teams lack custom inline SVG marks in `FranchiseLogo.tsx`. |
| **Room Settings & Constants** | ₹100 Cr purse, ₹20L reserve, increments +₹25L/+₹50L/+₹1Cr, squad 15–25, 4 categories | ₹5 Cr purse, increments +₹2L/+₹5L/+₹10L, squad 14, timer 15s | **Partial:** Settings exist, but `MIN_RESERVE_PER_SLOT` is globally ₹20L (cricket rule). |
| **Player Category Sequencer** | `src/shared/player-sequence.ts` (Strict order: Batters $\to$ Bowlers $\to$ All-Rounders $\to$ Wicketkeepers) | Same function called (`generateCategoryWiseSequence`), but it defaults unknown roles to `BATTERS` | **Broken:** PKL Raiders & Defenders are categorized as `BATTERS`. Needs kabaddi sequence: Raiders $\to$ Defenders $\to$ All-Rounders. |
| **Auction Scoring Engine** | `src/shared/scoring.ts` (Deterministic 5-Pillar squad score 0–100, Playing XI score 0–100, awards) | None. Calls cricket scoring functions if invoked. | **Missing:** Zero kabaddi scoring model (Raiding, Tackling, Starting 7, Super 10s, High 5s). |
| **Player Portrait Fallbacks** | Procedural SVG avatar (`IPL POOL`, franchise accent, initials, jersey number) | Same SVG generator used, but with `"IPL POOL"` text hardcoded | **Placeholder:** Needs `"PKL POOL"` text and PKL franchise palette. |

---

## 3. WHERE "SPORT" IS RECORDED IN ROOMS & PERSISTENCE

### 3.1 In-Memory Runtime
- In `server/room.ts`:
  - `RoomRecord.settings.sport_type` holds `'IPL' | 'PKL'`.
  - When `createRoom(..., sportType)` is called:
    ```typescript
    const isPkl = sportType === 'PKL';
    const baseSettings = isPkl ? DEFAULT_PKL_ROOM_SETTINGS : DEFAULT_ROOM_SETTINGS;
    const pool = isPkl ? ALL_PKL_PLAYERS : ALL_PLAYERS;
    ```
  - When `startAuction(roomCode)` is called:
    ```typescript
    const sourcePool = room.settings.sport_type === 'PKL' ? ALL_PKL_PLAYERS : ALL_PLAYERS;
    ```

### 3.2 In MySQL Database (Prisma ORM)
- In `prisma/schema.prisma`:
  - **`Room` Model:**
    ```prisma
    model Room {
      room_code    String         @id @db.VarChar(6)
      name         String         @db.VarChar(100)
      host_user_id String
      status       String         @default("lobby") @db.VarChar(32)
      created_at   DateTime       @default(now())
      updated_at   DateTime       @updatedAt
      // ... relations
    }
    ```
    *Observation:* The `Room` table **does not** contain a `sport` or `sport_type` column.
  - **`RoomSnapshot` Model:**
    ```prisma
    model RoomSnapshot {
      id             String   @id @default(cuid())
      room_code      String   @db.VarChar(6)
      schema_version Int      @default(1)
      stage          String   @db.VarChar(32)
      phase          String   @db.VarChar(32)
      state_data     Json
      created_at     DateTime @default(now())
    }
    ```
    *Where it is stored:* The sport is recorded **inside the serialized JSON document `state_data`** under the path:
    $$\text{RoomSnapshot.state\_data} \to \text{settings.sport\_type} = \text{"PKL"}$$
  - **`RoomParticipant` Model:**
    Records `franchise_id` / `franchise_code` (e.g. `pat`, `pun`, `csk`), implicitly identifying the tournament, but without a dedicated sport column.
  - **`Result` Model:**
    Stores final awards and leaderboards in `awards` (`Json`) and `leaderboard` (`Json`).

---

## 4. AUDIT OF LOCAL ARCHIVE (`PKL_DATABASE.zip`)

In the project root, `PKL_DATABASE.zip` contains an official scrape of Pro Kabaddi League Season 12 data (`prokabaddi.com`):

### 4.1 Teams Discovered (All 12 Official Franchises)
1. **Bengaluru Bulls** (`team-1`, Code 1)
2. **Dabang Delhi K.C.** (`team-2`, Code 2)
3. **Jaipur Pink Panthers** (`team-3`, Code 3)
4. **Bengal Warriorz** (`team-4`, Code 4)
5. **U Mumba** (`team-5`, Code 5)
6. **Patna Pirates** (`team-6`, Code 6)
7. **Puneri Paltan** (`team-7`, Code 7)
8. **Telugu Titans** (`team-8`, Code 8)
9. **Haryana Steelers** (`team-28`, Code 28)
10. **Tamil Thalaivas** (`team-29`, Code 29)
11. **UP Yoddhas** (`team-30`, Code 30)
12. **Gujarat Giants** (`team-31`, Code 31)

### 4.2 Squad Players Discovered (235 Verified Players)
- Total squad rows across 12 teams: **235 players**
- Average squad size: **19.6 players/team** (min 18 for Jaipur, U Mumba, Gujarat; max 23 for Bengaluru Bulls).
- Role Distribution:
  - **Defenders:** 111 players (47.2%)
    - Explicit sub-positions identified: `Right Corner`, `Left Corner`, `Right Cover`, `Left Cover`, `Cover`.
  - **Raiders:** 88 players (37.4%)
  - **All-Rounders:** 36 players (15.3%)
- Nationality Distribution:
  - **India (Domestic):** 211 players (89.8%)
  - **Overseas (International):** 24 players (10.2%)
    - Iran: 19 players (e.g. Mohammadreza Shadloui, Fazel Atrachali, Alireza Mirzaian)
    - Korea: 2 players (e.g. Jang Kun Lee)
    - Nepal: 2 players
    - Bangladesh: 1 player

### 4.3 Season 12 Statistics Finding
In `PKL_DATABASE.zip`, `season_12_stats.json` has `record_count: 0` across all 12 categories because Season 12 was in pre-season / auction stage at the time of scrape. In accordance with STEP 3 instructions:
- We must generate a standardized CSV template (`pkl_player_statistics_template.csv` and `pkl_team_statistics_template.csv`).
- We provide validated career baselines for capped stars and tier-based minimum sample defaults for uncapped emerging players.
- Unknown values remain `null` and are clearly documented.

---

## 5. POOL CAPACITY & SQUAD SIZE ANALYSIS

- **Configured PKL Settings:**
  - Squad Size: 14 players (configurable 14–18)
  - Starting 7: 7 players on the mat
  - Base Purse: ₹5,00,00,000 (₹5 Crore)
  - Bid Increments: +₹2 Lakhs, +₹5 Lakhs, +₹10 Lakhs
- **Manager Capacity Check:**
  - Standard PKL Room: 12 managers (matching the 12 official franchises).
  - Required Players for 12 Managers $\times$ 14 squad slots = **168 players**.
  - Maximum Capacity (12 Managers $\times$ 18 squad slots) = **216 players**.
  - **Total Available Pool:** **235 players**.
  - *Verdict:* The 235-player pool **fully satisfies and exceeds** room requirements ($235 \ge 216$). No room will exhaust the player pool before all squads are full.

---

## 6. PROPOSED IMPLEMENTATION BLUEPRINT (STEPS 2 – 6)

### Step 2: Data Structure & Files
1. **`pkl-players-database.json`:**
   - 235 players parsed from `PKL_DATABASE.zip`.
   - Fields: `id` (`k-001` to `k-235`), `official_id`, `name`, `team`, `team_code`, `role`, `position_detail` (Corner/Cover/Raider/All-Rounder), `nationality`, `is_overseas`, `base_price`, `tier`, `category`, `jersey_number`, `profile_url`, `card_text`, `data_status`.
2. **`src/shared/pkl-constants.ts`:**
   - Base prices by category tier:
     - Category A (Marquee / Elite): ₹30,00,000 (₹30L)
     - Category B (Proven Stars): ₹20,00,000 (₹20L)
     - Category C (Domestic Specialists): ₹13,00,000 (₹13L)
     - Category D (Uncapped / New Young Players - NYP): ₹9,00,000 (₹9L)
   - Dynamic Reserve Rule for PKL: `MIN_RESERVE_PER_SLOT_PKL = 5_00_000` (₹5 Lakhs) instead of ₹20L.
3. **12 Inline SVG Logos in `src/components/FranchiseLogo.tsx`:**
   - Bespoke vector marks for PAT, PUN, JPP, BB, DEL, MUM, BW, GG, HAR, TAM, TEL, UP using official brand colors and symbolic motifs.

### Step 3: Data Sourcing & CSV Templates
- Generate `templates/pkl_player_stats_template.csv` and `templates/pkl_team_stats_template.csv`.
- Create provenance file `PKL_DATA_PROVENANCE.md` recording all source URLs, timestamps, and terms compliance.
- Implement procedural fallback avatar (`PKL POOL`, franchise accent glow, initials, jersey number) for all 235 players. Zero official copyright photos or mascots downloaded.
- Add persistent disclaimer notice: `"Unofficial fan game. Virtual money only. Not affiliated with Mashal Sports or Pro Kabaddi League."`

### Step 4: Kabaddi Auction Scoring Engine (`src/shared/pkl-scoring.ts`)
- **Role-Weighted Latest Season Points Formula:**
  $$\text{Raider Pts} = \text{RaidPts} \times 1.0 + \text{SuperRaids} \times 4.0 + \text{Super10s} \times 15.0 + \text{DoOrDiePts} \times 0.5$$
  $$\text{Defender Pts} = \text{TacklePts} \times 2.2 + \text{SuperTackles} \times 6.0 + \text{High5s} \times 18.0$$
  $$\text{All-Rounder Pts} = (\text{RaidPts} \times 0.75 + \text{Super10s} \times 10.0) + (\text{TacklePts} \times 1.6 + \text{High5s} \times 12.0)$$
- **Minimum-Sample Rule:** If matches $< 5$, blend season with career totals using a weighted ratio to prevent small-sample inflation.
- **Uncapped Baseline:** Tier A: 700 pts, Tier B: 520 pts, Tier C: 360 pts, Tier D: 220 pts.
- **Starting 7 Evaluation Model (0–100):** Evaluates 7 players (minimum 2 Raiders, 2 Corners, 2 Covers/Defenders, 1 All-Rounder/Flex; maximum 2 overseas players on the mat).

### Step 5: Wiring Up to Authoritative Server & Room Sockets
- Update `src/shared/player-sequence.ts` to support Kabaddi Category Nomination:
  $$\text{RAIDERS} \to \text{DEFENDERS} \to \text{ALL-ROUNDERS}$$
- Update `server/room.ts`:
  - Dynamically select `MIN_RESERVE_PER_SLOT` based on `sport_type` (₹20L for IPL, ₹5L for PKL).
  - Load `ALL_PKL_PLAYERS` from `pkl-players-database.json` with `k-xxx` IDs.
- Create idempotent CLI seed/import script `scripts/import_pkl_database.ts` with row-level validation.

### Step 6: Verification & Quality Assurance
- Verification script running a mock PKL room through 10 full nomination and bid cycles.
- Run `npm run build`, `npm run lint`, and TypeScript type-check.
- Output final completion report with exact counts by team, role, and tier.
