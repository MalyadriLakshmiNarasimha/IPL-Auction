# Project cleanup notes

This package preserves the Next.js frontend, Socket.IO auction server, Prisma schema/migration,
shared game logic, tests, and the consolidated `players-database.json` dataset.

Removed from the uploaded archive:
- `IPL_SCRAPER/`: contained only a local Python virtual environment.
- `players/`: per-player JSON exports; the running application imports `players-database.json`.
- `scraper.py` and `update_team_code.py`: optional data-maintenance scripts not needed at runtime.
- `PLAYER_DATABASE_REPORT.md` and `PLAYER_DATA_REPORT.md`: reports tied to removed exports; one report also described an outdated player-pool count.
- `.dist/` and `tsconfig.tsbuildinfo`: generated/empty local artifacts.
- `.env`: local credentials/secrets. Create a local `.env` using `.env.example` and insert your own values.

`node_modules/` and `.next/` are intentionally not packaged. Install dependencies with `npm ci`,
then generate Prisma Client with `npx prisma generate` before running the app.


## UI/UX redesign update

The frontend visual layer has been refreshed with a premium black-and-gold auction-night direction:
- Deep charcoal/near-black page and panel surfaces.
- Muted metallic-gold primary accent and refined typography.
- Updated global navigation and footer.
- Rebuilt landing page hero, calls to action, feature cards and room entry section.
- Unified form controls, focus states, panel borders, scrollbars and mobile spacing.
- Updated live auction timer accent and exported results-card palette.

Auction state, Socket.IO events, bidding rules, authentication, API routes, Prisma schema and player data were intentionally left unchanged.
