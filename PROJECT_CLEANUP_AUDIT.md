# IPL AUCTION — COMPLETE PROJECT CLEANUP AUDIT

**Audit Date:** 2026-11-09  
**Auditor:** Senior Full-Stack & DevOps Deployment Specialist  
**Project:** IPL Auction — Real-Time Multiplayer IPL Auction Game  
**Target Repositories & Environments:**
- **Source Code Repository:** `https://github.com/MalyadriLakshmiNarasimha/IPL-Auction.git`
- **Frontend Platform:** Next.js 14.2.35 on Netlify
- **Backend Platform:** Node.js & Socket.IO on Render
- **Database:** TiDB Cloud (Serverless MySQL 8.0 wire-compatible)
- **Local Source Pre-Cleanup Backup:** `C:\Game_backup_pre_cleanup` (Verified)

---

## 1. ARCHITECTURE & CURRENT STATE AUDIT

### 1.1 Architecture Breakdown
The application employs an authoritative dual-service decoupled architecture:
1. **Frontend (Netlify)**:
   - Next.js 14 App Router (React 18, Tailwind CSS, TypeScript).
   - Handles player rosters, responsive auction stage displays, statistics, PDF report downloads, and user interfaces.
   - Communicates with the backend through REST API routes and Socket.IO client connections.
   - Provides `/api/proxy/*` reverse-proxy capabilities in `netlify.toml` for cross-origin cookie preservation.
2. **Authoritative Backend (Render)**:
   - Node.js HTTP server + Socket.IO server (`server/index.ts`).
   - State machine (`server/room.ts`) governing all 8 auction stages (Lobby, Squad Review, Marquee, Accelerated, Unsold, Trading Window, Playing XI Selection, Auction Results).
   - Authoritative timer, bid sequences, participant purses, and instant unsold resolution.
   - Periodic and event-driven state snapshots into MySQL.
3. **Database Layer (TiDB Cloud / MySQL via Prisma ORM)**:
   - Relational tables: `users`, `sessions`, `rooms`, `room_snapshots`, `bid_events`, `results`, `room_participants`, `commentary_logs`.
   - Migration history preserved under `prisma/migrations/`.
4. **Player Photograph System**:
   - 255 Approved High-Quality 1024x1024 Studio RGBA cutouts (`public/images/players/*.webp`).
   - 19 Procedural Fallbacks (including Keshav Maharaj and un-photographed uncapped players).
   - Central synchronized manifest: `player-images.json`, `src/shared/player-images.json`, and `public/images/player-images.json`.

---

## 2. EXHAUSTIVE ENVIRONMENT VARIABLE AUDIT

Every environment variable referenced across the entire frontend and backend codebase was scanned and indexed:

| Variable Name | Required By | Target Platform | Description & Purpose | Example / Format |
|---|---|---|---|---|
| `DATABASE_URL` | Prisma & Backend (`src/lib/db.ts`, `server/db.ts`) | Render & Local | MySQL / TiDB Cloud connection string with SSL configuration. | `mysql://<user>:<password>@<host>:4000/<db>?sslaccept=strict` |
| `NODE_ENV` | Next.js & Server runtime | Render & Netlify | Environment mode (`production`, `development`, `test`). | `production` |
| `PORT` | Backend (`server/index.ts`) | Render & Local | Server listening port. In Render, `$PORT` is dynamically injected (defaults to 3001). | `3001` or `$PORT` |
| `CLIENT_ORIGIN` | Backend (`server/cors.ts`, `server/index.ts`) | Render | Primary frontend domain allowed for CORS & Socket.IO. | `https://<your-netlify-site>.netlify.app` |
| `ALLOWED_ORIGINS` | Backend (`server/cors.ts`) | Render | Comma-separated list of all allowed origins. | `https://<site>.netlify.app,http://localhost:3000` |
| `SESSION_SECRET` | Auth & Sessions (`src/lib/auth.ts`) | Render & Netlify | Cryptographic secret for signing session tokens (≥32 chars). | Long random alphanumeric string |
| `JWT_SECRET` | Auth fallback (`server/index.ts`) | Render | Optional fallback alias for `SESSION_SECRET`. | Same as `SESSION_SECRET` |
| `MIN_AUCTION_PARTICIPANTS` | Server rules (`server/room.ts`) | Render & Local | Minimum participants required before host can start auction. | `2` (default) |
| `NEXT_PUBLIC_MIN_AUCTION_PARTICIPANTS` | Client validation (`src/app/room/[code]/page.tsx`) | Netlify & Local | Minimum participant validation rule for host UI. | `2` (default) |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend Socket client (`src/lib/socket.ts`) | Netlify | Public URL pointing to authoritative Render Socket.IO server. | `https://<your-render-backend>.onrender.com` |
| `NEXT_PUBLIC_API_URL` | Frontend REST client (`src/lib/api.ts`) | Netlify | Public URL for backend REST API endpoints. | `https://<your-render-backend>.onrender.com` |
| `BACKEND_INTERNAL_URL` | Server-side proxy (`src/app/api/rooms/route.ts`) | Netlify | Internal backend endpoint for Next.js API routes. | `https://<your-render-backend>.onrender.com` |
| `RENDER` | Cloud Environment (`server/index.ts`) | Render | System-injected flag indicating execution on Render cloud. | `true` |

---

## 3. IDENTIFIED CLEANUP TARGETS & DEPENDENCY VERIFICATION

Before deleting any local files, all project files were audited for runtime, import, build, and test dependencies:

| Target File / Directory | Size | Verification Finding | Action Planned |
|---|---|---|---|
| `.dist.zip` | ~275 MB | Legacy zipped build artifact in root. Zero code references. | **Safe to Delete** |
| `.dist/` | 0 B | Empty directory from past artifact testing. Zero code references. | **Safe to Delete** |
| `archive/old-player-images-backup` | ~53 MB | Redundant local duplicate of old unverified player images. Already backed up to `C:\Game_backup_pre_cleanup`. | **Safe to Delete** |
| `audit-evidence/` | ~38 KB | Temporary inspection files from previous audit runs. Zero runtime or build references. | **Safe to Delete** |
| `tsconfig.tsbuildinfo` | ~125 KB | Ephemeral TypeScript compiler build cache. Regenerated on build. | **Safe to Delete** |
| `.next/` | ~220 MB | Next.js local build output. Safe to clean; regenerated during production build. | **Clean & Rebuild** |
| `node_modules/` | ~600 MB | Local npm dependency tree. Safe to reinstall cleanly. | **Clean & Reinstall** |
| `start-mysql.bat` | 113 B | Obsolete local script for starting XAMPP. Not used in production. | **Safe to Remove** |
| Old root report files (`FINAL_*.md`, `SECOND_ROUND_*.md`, `PROJECT_COMPLETION_*.md`) | ~80 KB | Historical reports superseded by comprehensive audit and clean deployment guides. | **Consolidate & Archive** |

---

## 4. IDENTIFIED PRODUCTION DEPLOYMENT DEFECTS & HOTSPOTS

The audit discovered several critical deployment bugs that would prevent a fresh deployment if uncorrected:

1. **`scripts/db-manager.ts` `ensure` Command Failure on Render**:
   - In `package.json`, `"preserver": "tsx scripts/db-manager.ts ensure"`.
   - When Render executes `npm run server`, npm automatically triggers `preserver`.
   - `db-manager.ts` attempts to connect to `127.0.0.1:3306` and looks for local `mysqld` binaries.
   - On Render (Linux cloud container), local MySQL is not running because the production database is TiDB Cloud.
   - As a result, `ensureMysqlRunning()` fails, calls `process.exit(1)`, and crashes the Render service on startup!
   - **Fix**: Update `db-manager.ts` so that in production (`NODE_ENV === 'production'`, `RENDER`, or remote `DATABASE_URL`), it skips local mysqld checks and immediately permits startup.

2. **Hardcoded Old Render URL Fallbacks**:
   - Multiple files had `https://ipl-auction-jqsd.onrender.com` hardcoded as fallback:
     - `netlify.toml` line 11
     - `render.yaml` line 3
     - `src/lib/socket.ts` line 19
     - `src/app/login/page.tsx` line 58
     - `src/app/register/page.tsx` line 58
     - `src/app/api/rooms/route.ts` line 16
     - `src/app/api/rooms/[code]/route.ts` line 14
     - `src/app/api/results/[code]/route.ts` line 14
   - **Fix**: Centralize backend URL resolution so when the fresh Render service is provisioned, the new URL is cleanly configured via environment variables and configuration files without residual traffic to the deleted service.

3. **`pg` and `@types/pg` Unused Dependencies**:
   - `package.json` contains `"pg": "^8.13.1"` and `"@types/pg": "^8.11.11"`.
   - The database engine is exclusively MySQL/TiDB Cloud via `@prisma/client`. PostgreSQL (`pg`) is nowhere imported or used.
   - **Fix**: Cleanly remove `pg` and `@types/pg` from `package.json`.

---

## 5. AUDIT CONCLUSION & SAFEGUARDS

- **Database Preservation**: TiDB Cloud MySQL database connection and all records remain 100% untouched.
- **Source Code Backup**: Verified full backup created at `C:\Game_backup_pre_cleanup`.
- **Zero Loss Guarantee**: All 274 player database records, 255 verified 1024x1024 studio RGBA cutouts, 19 procedural fallbacks, authentication logic, bidding mechanics, and unit tests are intact.
- **Proceeding to Phase 2**: Folder cleanup can now proceed safely adhering strictly to verified deletion targets.

