# PKL DATASET COMPLETENESS & GAPS REPORT

**Generated:** 2026-11-22 11:00:51 UTC  
**Target:** 235 PKL Squad Players across 12 Franchises  
**Purpose:** Field-by-field audit of database completeness to guide final data ingestion.

---

## 1. FIELD COMPLETENESS AUDIT TABLE

| Field | Description | Filled Count | Missing Count | Completeness | Status |
|---|---|---|---|---|---|
| **name** | Full official player name | 235 | 0 | **100.0%** | ✅ 100% |
| **team** | Assigned franchise name (1 of 12 PKL teams) | 235 | 0 | **100.0%** | ✅ 100% |
| **role** | Primary playing role (Raider / Defender / All-Rounder) | 235 | 0 | **100.0%** | ✅ 100% |
| **sub_position** | Tactical sub-position (Left/Right Corner, Left/Right Cover, Raider, etc.) | 235 | 0 | **100.0%** | ✅ 100% |
| **nationality** | Country of origin / citizenship | 235 | 0 | **100.0%** | ✅ 100% |
| **tier_base_price** | Official PKL Auction Category Tier (A/B/C/D) & Base Price (₹30L/₹20L/₹13L/₹9L) | 235 | 0 | **100.0%** | ✅ 100% |
| **jersey_number** | Official squad jersey number (nullable until published by franchise) | 0 | 235 | **0.0%** | ℹ️ Optional / Bench |
| **photo** | Processed 600x750 WebP studio portrait | 235 | 0 | **100.0%** | ✅ 100% |
| **season_12_stats** | Season 12 match stats (matches, raid/tackle points, super 10s, high 5s) | 178 | 57 | **75.7%** | ⚠️ In Progress |
| **career_stats** | All-time career baseline stats | 178 | 57 | **75.7%** | ⚠️ In Progress |

---

## 2. DETAILED BREAKDOWN OF GAPS & ACTION REQUIRED

### A. Jersey Number (`jersey_number`): 235 Missing (0% filled)
- **Status:** Nullable in official pre-season rosters.
- **Why it's missing:** Franchises allocate jersey numbers right before matchday 1. The official PKL squad endpoint provides null for pre-season rosters.
- **Action Required:** When teams release official jersey numbers, provide via `templates/pkl_player_stats_template.csv` or run `npm run import:pkl-stats` to backfill. The UI gracefully displays the player's team initials and color badge in the absence of a number.

### B. Season 12 & Career Stats (`season_12_stats` & `career_stats`): 57 Debutants / Bench Players (75.7% filled, 24.3% missing)
- **Status:** 178 of 235 players (75.7%) have verified Season 12 match stats populated.
- **Why 57 players have no stats:** These 57 players are **untested debutants, New Young Players (NYP), or squad reserves** who have not yet stepped on the mat in Season 12 (0 matches played). In official PKL scorecards, unplayed players have no recorded stats.
- **Scoring Engine Treatment:** As verified in Phase 1, the scoring engine assigns documented tier baselines for players with 0 matches (`tier_points`), ensuring debutants are fairly rated and never score below baseline.
- **Action Required:** None needed. As debutants play matches in upcoming tournament fixtures, their match scorecards can be imported via `scripts/import_pkl_stats.ts`.

---

## 3. LIST OF PLAYERS WITH MISSING STATS (DEBUTANTS / RESERVES)

The following 57 players are verified squad members with 0 match appearances in Season 12:

| Player ID | Player Name | Franchise | Role | Sub-Position | Tier | Base Price |
|---|---|---|---|---|---|---|
| `k-004` | **Lucky Kumar** | Bengaluru Bulls | Defender | Right Corner | `B` | ₹20 Lakhs |
| `k-007` | **Chandranaik M** | Bengaluru Bulls | All-Rounder | All-Rounder | `D` | ₹9 Lakhs |
| `k-011` | **Manjeet Thakur** | Bengaluru Bulls | Raider | Raider | `D` | ₹9 Lakhs |
| `k-016` | **Shubham Rahate** | Bengaluru Bulls | Defender | Left Cover | `D` | ₹9 Lakhs |
| `k-019` | **Amit Thakur** | Bengaluru Bulls | All-Rounder | All-Rounder | `D` | ₹9 Lakhs |
| `k-020` | **Dheeraj** | Bengaluru Bulls | All-Rounder | All-Rounder | `D` | ₹9 Lakhs |
| `k-023` | **Sahil Rane** | Bengaluru Bulls | All-Rounder | All-Rounder | `D` | ₹9 Lakhs |
| `k-027` | **Gaurav Chhillar** | Dabang Delhi K.C. | Defender | Right Corner | `C` | ₹13 Lakhs |
| `k-033` | **Amir Hossein Bastami** | Dabang Delhi K.C. | Defender | Left Corner | `C` | ₹13 Lakhs |
| `k-034` | **Anil Gurjar** | Dabang Delhi K.C. | Raider | Raider | `D` | ₹9 Lakhs |
| `k-038` | **Mohit Narwal** | Dabang Delhi K.C. | Defender | Right Cover | `D` | ₹9 Lakhs |
| `k-040` | **Amit** | Dabang Delhi K.C. | All-Rounder | All-Rounder | `D` | ₹9 Lakhs |
| `k-042` | **Ashish Sangwan** | Dabang Delhi K.C. | All-Rounder | All-Rounder | `C` | ₹13 Lakhs |
| `k-046` | **Sombir Mehra** | Jaipur Pink Panthers | Raider | Raider | `D` | ₹9 Lakhs |
| `k-047` | **Abhishek KS** | Jaipur Pink Panthers | Defender | Left Cover | `D` | ₹9 Lakhs |
| `k-067` | **Deep Kumar** | Bengal Warriorz | Defender | Left Cover | `D` | ₹9 Lakhs |
| `k-068` | **Yash Malik** | Bengal Warriorz | Defender | Right Corner | `D` | ₹9 Lakhs |
| `k-075` | **Rachit Yadav** | Bengal Warriorz | Raider | Raider | `C` | ₹13 Lakhs |
| `k-077` | **Amandeep Kajal** | Bengal Warriorz | Defender | Left Corner | `D` | ₹9 Lakhs |
| `k-080` | **Harander** | Bengal Warriorz | Defender | Right Corner | `D` | ₹9 Lakhs |
| `k-089` | **S Mukilan** | U Mumba | Defender | Left Corner | `D` | ₹9 Lakhs |
| `k-091` | **M Dhanasekar** | U Mumba | Raider | Raider | `D` | ₹9 Lakhs |
| `k-092` | **Deepak Kundu** | U Mumba | Defender | Left Corner | `D` | ₹9 Lakhs |
| `k-098` | **Amarjeet Yadav** | U Mumba | All-Rounder | All-Rounder | `D` | ₹9 Lakhs |
| `k-100` | **Mohammad Ghorbani** | U Mumba | All-Rounder | All-Rounder | `B` | ₹20 Lakhs |
| `k-108` | **Deepak Jaglan** | Patna Pirates | Raider | Raider | `C` | ₹13 Lakhs |
| `k-109` | **Hamid Mirzaeinader** | Patna Pirates | Defender | Left Corner | `C` | ₹13 Lakhs |
| `k-111` | **Sombir** | Patna Pirates | Defender | Right Corner | `C` | ₹13 Lakhs |
| `k-112` | **Amin Ghorbani** | Patna Pirates | Defender | Right Corner | `B` | ₹20 Lakhs |
| `k-119` | **Balaji D** | Patna Pirates | Defender | Left Cover | `D` | ₹9 Lakhs |
| `k-120` | **Saurabh Narwal** | Patna Pirates | Defender | Right Corner | `C` | ₹13 Lakhs |
| `k-136` | **Rohan Tupare** | Puneri Paltan | Defender | Right Corner | `D` | ₹9 Lakhs |
| `k-149` | **Nitin** | Telugu Titans | Raider | Raider | `D` | ₹9 Lakhs |
| `k-150` | **Rohit Singh** | Telugu Titans | Raider | Raider | `C` | ₹13 Lakhs |
| `k-154` | **Amir Ejlali** | Telugu Titans | Defender | Right Cover | `B` | ₹20 Lakhs |
| `k-157` | **Bantu Malik** | Telugu Titans | Defender | Left Corner | `D` | ₹9 Lakhs |
| `k-158` | **Rahul Dagar** | Telugu Titans | Defender | Right Cover | `D` | ₹9 Lakhs |
| `k-167` | **N Manikandan** | Haryana Steelers | Defender | Left Cover | `D` | ₹9 Lakhs |
| `k-169` | **Vikas Jadhav** | Haryana Steelers | Raider | Raider | `D` | ₹9 Lakhs |
| `k-174` | **Sha Mohammed Shahan** | Haryana Steelers | Raider | Raider | `B` | ₹20 Lakhs |
| `k-177` | **Ritik Radheyshyam** | Haryana Steelers | Defender | Left Corner | `C` | ₹13 Lakhs |
| `k-178` | **Sachin** | Haryana Steelers | Defender | Right Cover | `A` | ₹30 Lakhs |
| `k-179` | **Zubair** | Haryana Steelers | Defender | Left Cover | `D` | ₹9 Lakhs |
| `k-183` | **Anuj Gawade** | Tamil Thalaivas | Defender | Left Cover | `C` | ₹13 Lakhs |
| `k-188` | **Dhiraj Bailmare** | Tamil Thalaivas | Raider | Raider | `D` | ₹9 Lakhs |
| `k-194` | **Alireza Khalili** | Tamil Thalaivas | Defender | Left Cover | `B` | ₹20 Lakhs |
| `k-196` | **Tarun** | Tamil Thalaivas | Defender | Right Corner | `D` | ₹9 Lakhs |
| `k-206` | **Mohammadreza Kaboudrahangi** | UP Yoddhas | Defender | Left Cover | `B` | ₹20 Lakhs |
| `k-209` | **Gangaram** | UP Yoddhas | Defender | Left Corner | `D` | ₹9 Lakhs |
| `k-210` | **Sachin** | UP Yoddhas | Defender | Right Cover | `A` | ₹30 Lakhs |
| `k-213` | **Dong Geon Lee** | UP Yoddhas | Raider | Raider | `C` | ₹13 Lakhs |
| `k-214` | **Jatin Singh** | UP Yoddhas | Raider | Raider | `D` | ₹9 Lakhs |
| `k-216` | **Krishan** | UP Yoddhas | Defender | Right Corner | `C` | ₹13 Lakhs |
| `k-217` | **Ronak Nain** | UP Yoddhas | Defender | Left Corner | `D` | ₹9 Lakhs |
| `k-230` | **Amit** | Gujarat Giants | Defender | Right Cover | `D` | ₹9 Lakhs |
| `k-233` | **Sumit** | Gujarat Giants | Defender | Left Corner | `D` | ₹9 Lakhs |
| `k-234` | **Himanshu Yadav** | Gujarat Giants | All-Rounder | All-Rounder | `C` | ₹13 Lakhs |

---

## 4. HOW TO COMPLETE ANY GAPS

1. **For Stats & Career Updates:**
   - Use `templates/pkl_player_stats_template.csv`.
   - Fill in `matches`, `raid_points`, `tackle_points`, `super_10s`, `high_5s`, `super_raids`, `super_tackles`.
   - Run: `npm run import:pkl-stats -- --file path/to/stats.csv`

2. **For Team Season Standings:**
   - Use `templates/pkl_team_stats_template.csv`.
   - Run: `npm run import:pkl-stats -- --team-file path/to/teams.csv`
