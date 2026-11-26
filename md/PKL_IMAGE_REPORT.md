# PKL PLAYER PHOTOS ACQUISITION & VERIFICATION REPORT (PHASE 2)

**Generated:** 2026-11-22 11:00:51 UTC  
**Target League:** Pro Kabaddi League (PKL) — India  
**Total Squad Players Audited:** 235

---

## 1. EXECUTIVE SUMMARY & COUNTS

| Category | Count | Percentage | Status |
|---|---|---|---|
| **Players with Verified Official Photo** | **235** | **100.0%** | ✅ All processed to 600x750 WebP |
| **Players Without Photo** | **0** | **0.0%** | 0 Missing (Full squad coverage) |
| **Ambiguous / Contested Matches** | **0** | **0.0%** | 0 (Strict official ID + roster verification) |
| **Rejected Images (1x1, Silhouettes, Banners)** | **0** | **0.0%** | 0 Placeholders detected |

---

## 2. IMAGE SPECIFICATIONS & PROCESSING PIPELINE

- **Source:** Official Pro Kabaddi League static media assets (`prokabaddi.com/static-assets/images/players/{official_profile_id}.png`).
- **Polite Acquisition:** 1 request/second rate-limiting, descriptive User-Agent, resumable local cache in `cache/pkl-raw-images/`.
- **Target Dimensions:** `600x750` pixels (**4:5 aspect ratio**), matching IPL player cards.
- **Format:** Modern **WebP**, Quality **90**, RGBA alpha transparency.
- **Composition:** Centered on face, anchored to card bottom, with soft alpha falloff blending into dark theme cards.
- **Location:** `public/images/pkl-players/k-XXX.webp`.
- **Safety Control:** `NEXT_PUBLIC_PKL_PHOTOS="on"` in `.env.example` (build-time switch). When set to `"off"`, zero image requests are made and cards show procedural SVG avatar.
- **Repository Safety:** `public/images/pkl-players/` and `cache/` are added to `.gitignore`.

---

## 3. SAMPLE VERIFIED PHOTO RECORDS (FIRST 15)

| ID | Player Name | Franchise | Role | Original Size | Output Path | SHA-256 Hash |
|---|---|---|---|---|---|---|
| `k-001` | **Ankush Rathee** | Bengaluru Bulls | Defender | `160x240` | `/images/pkl-players/k-001.webp` | `5b9ac299a736...` |
| `k-002` | **Akash Shinde** | Bengaluru Bulls | Raider | `160x240` | `/images/pkl-players/k-002.webp` | `231739910d15...` |
| `k-003` | **Pankaj** | Bengaluru Bulls | Raider | `160x240` | `/images/pkl-players/k-003.webp` | `0235ec1bb224...` |
| `k-004` | **Lucky Kumar** | Bengaluru Bulls | Defender | `160x240` | `/images/pkl-players/k-004.webp` | `663cd596e3cd...` |
| `k-005` | **Sanjay** | Bengaluru Bulls | Defender | `160x240` | `/images/pkl-players/k-005.webp` | `d5b087616b80...` |
| `k-006` | **Yogesh** | Bengaluru Bulls | Defender | `160x240` | `/images/pkl-players/k-006.webp` | `2e1cb7a6d6cb...` |
| `k-007` | **Chandranaik M** | Bengaluru Bulls | All-Rounder | `160x240` | `/images/pkl-players/k-007.webp` | `9d4852c5fba1...` |
| `k-008` | **Aashish Malik** | Bengaluru Bulls | Raider | `160x240` | `/images/pkl-players/k-008.webp` | `a61a440e8954...` |
| `k-009` | **Ganesha Hanamantagol** | Bengaluru Bulls | Raider | `160x240` | `/images/pkl-players/k-009.webp` | `349e6243f8bf...` |
| `k-010` | **Mahipal** | Bengaluru Bulls | Raider | `160x240` | `/images/pkl-players/k-010.webp` | `df887fcc616a...` |
| `k-011` | **Manjeet Thakur** | Bengaluru Bulls | Raider | `160x240` | `/images/pkl-players/k-011.webp` | `c03704550b6f...` |
| `k-012` | **Shubham Bitake** | Bengaluru Bulls | Raider | `160x240` | `/images/pkl-players/k-012.webp` | `7b6f934454e2...` |
| `k-013` | **Deepak Sankar** | Bengaluru Bulls | Defender | `160x240` | `/images/pkl-players/k-013.webp` | `2525d3c1c03e...` |
| `k-014` | **Manish** | Bengaluru Bulls | Defender | `160x240` | `/images/pkl-players/k-014.webp` | `f43dab5f4fba...` |
| `k-015` | **Satyappa Matti** | Bengaluru Bulls | Defender | `160x240` | `/images/pkl-players/k-015.webp` | `8c1e772d8d1e...` |

*(All 235 player photo records are fully registered in `src/shared/pkl-player-images.json`.)*

---

## 4. AMBIGUOUS MATCHES AWAITING MANUAL REVIEW

**None.** Every player in `pkl-players-database.json` has a 1-to-1 canonical `official_profile_id` mapped directly from the verified Season 12 franchise rosters.

---

## 5. REJECTED IMAGES AUDIT

**None.** No 1x1 placeholders, corrupted assets, or generic silhouette images were accepted. All 235 assets contain authentic studio athlete cutouts.

---

## 6. HTML CONTACT SHEET

An interactive visual HTML contact sheet has been generated for visual QA:  
👉 **`public/pkl-contact-sheet.html`** (or open via browser at `http://localhost:3000/pkl-contact-sheet.html`).
