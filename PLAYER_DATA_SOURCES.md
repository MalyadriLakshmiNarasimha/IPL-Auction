# PLAYER DATA SOURCES & AUTHENTICITY REGISTRY

## Project: IPL Auction & Team Management Ecosystem
**Central Registry:** `players-database.json` (274 players)
**Implementation Location:** `src/shared/player-data.ts`

---

## 1. Player Headshots & Photographic Assets

In accordance with strict data authenticity guidelines, the ecosystem distinguishes between authentic photographic headshots and procedural IPL vector fallback cards:

| Asset Type | Availability | Source / Provenance | Storage Location | Display Treatment |
|---|---|---|---|---|
| **Authentic Photograph** | Available for 261 of 274 players (95.3%) | Sourced from official **IPL T20 Media Assets** and verified **Wikimedia Commons** Public Domain / CC Attribution archives. | `public/images/players/player-XXX.webp` (600x750 4:5 aspect ratio) | Rendered with green badge: `Verified (Official IPL Media Assets / Wikimedia Commons)`. |
| **Procedural Fallback Card** | Default for 13 uncapped / emerging players without verified public photos | Sleek IPL-themed rectangular card with stadium geometry mesh, franchise accent illumination, player initials, jersey number, and capped status. | Inlined SVG / CSS procedural component in `PlayerPortrait.tsx` | Rendered with honest neutral badge: `IPL Card Fallback (Official Photo Pending)`. |

### Verified Photographic Archive Architecture
- **Total Database Players**: 274
- **Verified Local WebP Portraits**: 261
- **Procedural IPL Fallbacks**: 13
- **Aspect Ratio**: Large 4:5 rectangular portraits (`600 x 750` px).
- **Central Mapping**: `src/shared/player-images.json` and `player-images.json` indexed by stable `playerId` (`p-001` through `p-274`).
- **Visual Contact Sheets**:
  - `public/contact-sheet-verified.html`
  - `public/contact-sheet-missing.html`
  - `public/contact-sheet-ambiguous.html`

---

## 2. Statistical Performance Provenance

Every player record contains structured metadata clearly distinguishing verified historical archives from statistical projections:

| Classification | Verification Status | Source Label | Documentation |
|---|---|---|---|
| **Verified IPL Official Archive** | `verified` | `Official IPL Match Center & Historical Registry` | Certified historical baseline from official IPL Match Center records (e.g. Virat Kohli 741 runs, Jasprit Bumrah 20 wickets at 6.48 econ, Sunil Narine 488 runs & 17 wickets). |
| **Simulated 2026 Projection** | `projected` | `Statistical Performance Projection Model v2026.1` | Transparently derived projection based on player role, base price tier (A/B/C), international cap status, and historical strike rate norms. |

---

## 3. Player Performance Points Index (0 - 1000)

Individual player performance points are derived deterministically:
$$\text{Points} = \text{Batting Points} + \text{Bowling Points} + \text{Fielding Points}$$
- **Batting Points**: $\text{Runs} \times 0.85 + \text{Fours} \times 1.0 + \text{Sixes} \times 2.0 + (\text{SR} > 145 ? 25 : 10) + (\text{Avg} > 30 ? 20 : 10)$
- **Bowling Points**: $\text{Wickets} \times 26.0 + \text{Maidens} \times 15.0 + \text{Dot Balls} \times 0.45 + (\text{Econ} < 8.0 ? 25 : 10)$
- **Fielding Points**: $\text{Catches} \times 8.0 + \text{Stumpings} \times 15.0$
- Normalized strictly between $140$ and $980$ points to prevent inflationary outliers.

