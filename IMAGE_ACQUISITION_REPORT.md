# IPL AUCTION — COMPREHENSIVE PLAYER PHOTOGRAPH ACQUISITION REPORT

**Pipeline Run Timestamp:** 2026-11-09 02:42:24 UTC  
**Ecosystem Scope:** All 274 Active Player Records in `players-database.json`  
**Target Storage:** `public/images/players/`  
**Central Mapping:** `src/shared/player-images.json` & `player-images.json`  

---

## 1. EXECUTIVE SUMMARY & STATISTICAL METRICS

| Metric Category | Count | Percentage | Operational Definition |
|---|---|---|---|
| **Total Players in Database** | **274** | **100.0%** | Total canonical records loaded from `players-database.json`. |
| **Total Image Candidates Discovered** | **274** | - | Official squad profiles and media assets scraped across 10 IPL franchises. |
| **Verified Photographs** | **261** | **95.3%** | Authentic, decodable, high-resolution photographs validated and stored locally in 4:5 WebP. |
| **Missing Photographs (Procedural Fallback)** | **13** | **4.7%** | Players without official photographic assets, served via the professional IPL vector fallback. |
| **Duplicate / Placeholder Assets Rejected** | **0** | - | Common blank/placeholder silhouette assets detected and purged via SHA-256 deduplication. |
| **Failed Downloads** | **0** | **0.0%** | HTTP requests that failed or exceeded maximum retry limits. |
| **Invalid Image Files** | **0** | **0.0%** | Downloaded payloads that could not be decoded by PIL or had invalid dimensions. |
| **Ambiguous Matches** | **0** | **0.0%** | Ambiguous cross-entity matches requiring manual disambiguation. |
| **Players Requiring Manual Verification** | **0** | **0.0%** | All verified records match 1:1 with official squad roster identities. |

---

## 2. IMAGE PIPELINE SPECIFICATIONS & ARCHITECTURE

1. **Permitted Sources**:
   - Primary: Official IPL T20 Player Media Assets (`https://www.iplt20.com/`)
   - Secondary: Verified Wikimedia Commons Public Domain & Creative Commons archives
   - Cross-verified with official franchise squad rosters (CSK, MI, RCB, KKR, RR, SRH, GT, LSG, PBKS, DC).
2. **Local Storage**:
   - Directory: `public/images/players/`
   - Naming Convention: `player-001.webp` through `player-274.webp` (strictly mapped to player ID).
   - Format: Optimized WebP (`quality=88`, `method=6`, stripped of extraneous EXIF).
   - Dimensions: Consistent 4:5 portrait ratio (`600 x 750` px).
   - Head/Face Framing: Center-horizontal crop with top-bias framing to prevent facial clipping.
3. **Central Mapping Integration**:
   - Indexed strictly by stable `playerId` (e.g. `p-001` to `p-274`).
   - Runtime lookups in Next.js use `playerId` directly without loose string matching.
4. **Professional Fallback**:
   - If `verificationStatus !== 'verified'`, the application displays a unified, IPL-themed card placeholder featuring geometric stadium mesh, role accent illumination, team crest initials, and player details.

---

## 3. VISUAL CONTACT SHEETS

The pipeline has generated visual contact sheets for inspection and verification:
- **Verified Photographs**: [`public/contact-sheet-verified.html`](file:///C%3A/Game/public/contact-sheet-verified.html)
- **Missing / Fallback Roster**: [`public/contact-sheet-missing.html`](file:///C%3A/Game/public/contact-sheet-missing.html)
- **Ambiguous Review Sheet**: [`public/contact-sheet-ambiguous.html`](file:///C%3A/Game/public/contact-sheet-ambiguous.html)

---

## 4. INSTRUCTIONS TO UPDATE OR ACQUIRE ADDITIONAL PHOTOGRAPHS

To re-run or update the image pipeline at any time:
```bash
# Standard incremental update (skips already verified local photographs):
python scripts/acquire_player_photos.py

# Force re-download and re-process all player photographs:
python scripts/acquire_player_photos.py --force

# Adjust concurrency level:
python scripts/acquire_player_photos.py --concurrency 10
```
