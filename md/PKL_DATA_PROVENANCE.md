# PRO KABADDI LEAGUE (PKL) — DATA PROVENANCE & AUTHENTICITY REGISTRY

**Legal Notice:** This is an unofficial fan game. Virtual money only. Not affiliated with, endorsed by, or sponsored by Mashal Sports, Star India, or the Pro Kabaddi League (PKL). All team names, marks, and player references are used strictly for non-commercial editorial, simulation, and fan entertainment purposes.

---

## 1. DATA SOURCES & INGESTION PROVENANCE

| Dataset Element | Primary Source | Extraction Date | Method | Fields Sourced |
|---|---|---|---|---|
| **Teams Master (12 Teams)** | Official Pro Kabaddi League Portal (`prokabaddi.com/teams`) | 2026-11-22 | Verified local archive (`PKL_DATABASE.zip`) & official team pages | `team_id`, `team_name`, `team_code`, `team_url` |
| **Squad Players (235 Players)** | Official PKL Season 12 Squad Rosters (`prokabaddi.com/teams/*-profile-*`) | 2026-11-22 | Parsed from digitized official squad cards in `PKL_DATABASE.zip` | `player_id` (`k-001`–`k-235`), `official_profile_id`, `player_name`, `team`, `role`, `position_detail`, `nationality`, `card_text` |
| **Historical & Career Stats** | Official PKL Match Center (`prokabaddi.com/stats`) | 2026-11-22 | Standardized CSV template (`templates/pkl_player_stats_template.csv`) | `matches`, `total_points`, `raid_points`, `tackle_points`, `super_raids`, `super_10s`, `high_5s`, `super_tackles`, `do_or_die_points` |
| **Season 12 Stats** | Official PKL Season 12 Match Center (`prokabaddi.com/stats/185-*`) | 2026-11-22 | Pre-season zero baseline; CSV template ingestion (`import_pkl_stats.ts`) | Ready for tournament match scorecards; non-fabricated values stay `0` or `null`. |
| **Team Season Standings** | Official PKL Points Table | 2026-11-22 | Standardized CSV template (`templates/pkl_team_stats_template.csv`) | `matches`, `wins`, `losses`, `ties`, `points_table_position`, `total_raid_points`, `total_tackle_points` |

---

## 2. HOW CATEGORIES & TIERS (A / B / C / D) WERE ASSIGNED

Official PKL auctions divide players into four categories with distinct base prices:
- **Category A (Elite Marquee Legends):** Base price **₹30 Lakhs** (`3,000,000`)
- **Category B (Proven Senior Regulars):** Base price **₹20 Lakhs** (`2,000,000`)
- **Category C (Domestic Specialists):** Base price **₹13 Lakhs** (`1,300,000`)
- **Category D (Uncapped / New Young Players - NYP):** Base price **₹9 Lakhs** (`900,000`)

### Assignment Methodology & Source Rules:
1. **Category A (20 players):** Assigned strictly to recognized franchise captains, international tournament medalists, and historical record holders (e.g. Pawan Sehrawat, Naveen Kumar, Arjun Deshwal, Mohammadreza Shadloui, Fazel Atrachali, Sunil Kumar, Sachin Tanwar, Ashu Malik, Surjeet Singh, Ankush Rathee, Aslam Inamdar, Mohit Goyat, Maninder Singh, Guman Singh).
2. **Category B (30 players):** Assigned to established Starting 7 starters, capped international players (e.g. Iran and Korea national team players), and senior domestic regulars with over 30 PKL appearances.
3. **Category C (64 players):** Assigned to experienced squad rotation players, specialist corners/covers, and secondary raiders.
4. **Category D (121 players):** Assigned to uncapped rookies, New Young Players (NYP), and emerging domestic squad selections who have not yet established a multi-season PKL record.

> [!NOTE]
> *Source Rule Transparency:* While the price steps (₹30L, ₹20L, ₹13L, ₹9L) match the official PKL auction guidelines, the official franchise-by-franchise category allocation list is finalized by the PKL technical committee prior to each auction. For players not explicitly categorized by official public press release, the above objective seniority/appearance rubric was applied.

---

## 3. PHOTOGRAPHS & ASSET LICENSING NOTES

- **Zero Official Photos Downloaded:** In strict compliance with copyright, player personality rights, and site terms, **no photos, headshots, team logos, or mascot art** were downloaded or scraped from `prokabaddi.com`.
- **Procedural Vector Fallback Card:** All 235 PKL players render using the procedural SVG avatar (`PKL POOL`, franchise accent radial illumination, high-contrast player initials, jersey number).
- **Photos Requiring User Supply or Commercial Licensing:**
  If the operator wishes to display photographic headshots in the future, the following assets must be licensed from official rights holders (Mashal Sports / AKFI) or verified through open Creative Commons / Public Domain repositories:
  - 235 player headshots (600x750 4:5 aspect ratio studio portraits).
  - 12 official franchise mascot logos.

---

## 4. BACKWARD COMPATIBILITY MAPPING

Past auction rooms, database snapshots, and recorded bids using legacy mock IDs (`pkl-001` through `pkl-072`) are deterministically remapped to canonical `k-xxx` IDs in `src/shared/pkl-player-data.ts`:
- `pkl-001` (Pawan Sehrawat) $\to$ `k-154`
- `pkl-003` (Naveen Kumar) $\to$ `k-043`
- `pkl-004` (Fazel Atrachali) $\to$ `k-098`
- `pkl-005` (Mohammadreza Shadloui) $\to$ `k-174`
- `pkl-006` (Sunil Kumar) $\to$ `k-062`
- `pkl-007` (Arjun Deshwal) $\to$ `k-061`
- `pkl-008` (Sachin Tanwar) $\to$ `k-116`
- `pkl-010` (Nitesh Kumar) $\to$ `k-215`
- (Full 72-player mapping maintained in `LEGACY_PKL_ID_MAP`).
