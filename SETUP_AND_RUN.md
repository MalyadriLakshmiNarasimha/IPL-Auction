# IPLAuction — Installation & Execution Guide

> **Authoritative Setup & Operations Guide**  
> **Application Version:** `1.0.0`  
> **Architecture:** Next.js 14 App Router + Node.js / Socket.IO Authoritative Server + MySQL with Prisma ORM

---

## 1. Project Requirements

Before installing and running the IPLAuction application, ensure your development environment satisfies the following minimum hardware and software prerequisites:

### A. Runtime & Package Manager
| Dependency | Minimum Version | Recommended Version | Verification Command | Notes |
|---|---|---|---|---|
| **Node.js** | `>= 18.17.0` or `>= 20.0.0` | `22.x LTS` (Verified: `v22.23.2`) | `node -v` | Next.js 14 and Prisma 6 require Node.js 18.17+ |
| **npm** | `>= 9.0.0` | `10.x` (Verified: `10.9.8`) | `npm -v` | Bundled with modern Node.js distributions |

### B. Database System
| Component | Requirement | Notes |
|---|---|---|
| **MySQL Server** | MySQL `8.0+` or MariaDB `10.5+` | Running locally on port `3306` (or hosted remotely via AWS RDS, PlanetScale, etc.). |
| **Database Charset** | `utf8mb4` | Ensures full support for international player names and symbols. |
| **Collation** | `utf8mb4_unicode_ci` | Standard case-insensitive Unicode comparison. |
| **Relational Fallback** | *Built-in Automatic In-Memory Store* | The codebase in `src/lib/db.ts` and `server/db/index.ts` automatically engages an in-memory fallback store when MySQL is unreachable on `localhost:3306`. This allows developers to run unit tests and develop UI components without requiring a running MySQL daemon. |

### C. Required Development Tools
- **Git:** For source code control and versioning.
- **Modern Web Browser:** Google Chrome, Mozilla Firefox, Microsoft Edge, or Apple Safari (supporting WebSocket RFC 6455 and CSS Grid).
- **Terminal / Shell:** PowerShell on Windows, or Bash/Zsh on macOS and Linux.

---

## 2. Project Structure

The project follows a modular full-stack architecture cleanly dividing the Next.js frontend, the authoritative Socket.IO auction engine, and shared game logic.

```
IPLAuction/
├── .env.example                         # Canonical environment variable template
├── .env                                 # Local environment configuration (gitignored)
├── next.config.mjs                      # Next.js configuration
├── package.json                         # Project dependencies and lifecycle scripts
├── tsconfig.json                        # TypeScript configuration with path aliases (@/*)
├── tailwind.config.ts                   # Twilight Scoreboard design tokens & theme palette
├── prisma/                              # Prisma ORM Database Layer
│   ├── schema.prisma                    # Declarative database models (users, sessions, rooms, results)
│   └── migrations/
│       └── 20261104_init_mysql/
│           └── migration.sql            # Idempotent MySQL DDL migration
├── server/                              # Authoritative Node.js & Socket.IO Game Engine
│   ├── index.ts                         # Standalone HTTP & Socket.IO server on PORT 3001
│   ├── room.ts                          # RoomManager state machine, timer loops, auction logic
│   ├── db/
│   │   ├── index.ts                     # Database initialization and results persistence
│   │   └── schema.sql                   # Raw SQL schema reference
│   └── tests/                           # Integration, authentication & stress test suites
│       ├── auth.test.ts                 # Password hashing, user uniqueness, session lifecycle
│       ├── validation.test.ts           # Authoritative bid validation and reserve rule tests
│       ├── protected-routes.test.ts     # Handshake authentication and API security checks
│       ├── bot-simulator.ts             # 20-bot concurrent stress and race-condition simulator
│       └── run-sim-test.ts              # Standalone test runner for 20-bot simulation
└── src/                                 # Frontend Application & Shared Libraries
    ├── middleware.ts                    # Edge-compatible authentication redirect middleware
    ├── app/                             # Next.js 14 App Router Pages & API Routes
    │   ├── globals.css                  # Global styles, fonts, and Tailwind utilities
    │   ├── layout.tsx                   # Root HTML shell with Navbar, theme & toast providers
    │   ├── page.tsx                     # Landing homepage with interactive mini-auction demo
    │   ├── login/page.tsx               # User login form with credentials verification
    │   ├── register/page.tsx            # Account registration with password strength checks
    │   ├── create/page.tsx              # Protected room creation dashboard
    │   ├── join/page.tsx                # Room join entry page
    │   ├── join/[code]/page.tsx         # Direct join route via URL invite
    │   ├── room/[code]/page.tsx         # Main real-time live auction room & scoreboard
    │   ├── legal/page.tsx               # Terms of Service & Privacy Policy
    │   └── api/auth/                    # Native Authentication REST Endpoints
    │       ├── login/route.ts           # Login endpoint: verifies password, issues session cookie
    │       ├── logout/route.ts          # Logout endpoint: invalidates session, clears cookie
    │       ├── me/route.ts              # Identity endpoint: returns current authenticated user
    │       └── register/route.ts        # Registration endpoint: hashes password, creates user
    ├── components/                      # UI Components (Twilight Scoreboard Theme)
    │   ├── BidLadder.tsx                # Dynamic bid increment buttons (+₹25L, +₹50L, +₹1Cr)
    │   ├── CircularTimerRing.tsx        # High-precision SVG circular countdown timer
    │   ├── GavelOverlay.tsx             # Animated gavel strike celebration on SOLD players
    │   ├── HostControlsModal.tsx        # Host administrative modal (pause, skip, end auction)
    │   ├── LiveChat.tsx                 # Real-time room chat with system notices
    │   ├── MiniAuctionDemo.tsx          # Interactive preview widget on the homepage
    │   ├── PoolPickerModal.tsx          # Custom player pool selector with filters & presets
    │   ├── ReactionRail.tsx             # Floating emoji reactions (🔥, 👏, 💰, 😱)
    │   ├── ResultsView.tsx              # Final 100-pt squad evaluation and awards leaderboard
    │   ├── SoundToggle.tsx              # Web Audio API stadium sound toggle
    │   ├── SplitFlapNumber.tsx          # Mechanical retro split-flap number display
    │   ├── StickyBidDock.tsx            # Mobile-optimized bottom bidding dock
    │   ├── TeamsDrawer.tsx              # Slide-out drawer showing all franchise squads & purses
    │   ├── ThemeToggle.tsx              # Dark / Twilight theme switcher
    │   └── UserNav.tsx                  # Profile avatar, username display, and logout button
    ├── lib/                             # Core Utilities & Infrastructure
    │   ├── auth.ts                      # Bcrypt password hashing, session tokens, rate limiting
    │   ├── db.ts                        # Prisma Client instance with in-memory fallback repository
    │   ├── socket.ts                    # Client-side Socket.IO singleton instance
    │   └── sound.ts                     # Web Audio API synthesizer for gavel strikes & ticks
    └── shared/                          # Universal Code Shared by Frontend & Server
        ├── constants.ts                 # Preset franchises, purse sizes, and currency formatters
        ├── player-data.ts               # Authoritative player dataset (PLAYERS_SEED & ALL_PLAYERS)
        ├── scoring.ts                   # 100-point squad balance rating & awards engine
        ├── types.ts                     # Shared TypeScript interfaces, events, and data contracts
        └── validation.ts                # Authoritative bid rules & empty-slot reserve calculators
```

---

## 3. Initial Setup

Follow these exact steps from your terminal to install and configure the project.

### Step 1: Clone or Open the Workspace
Navigate to the project root directory:
```bash
cd c:\Game
```

### Step 2: Install Node Dependencies
Install all required production and development dependencies:
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to create your local `.env` configuration file:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Linux / macOS (Bash):**
```bash
cp .env.example .env
```

### Step 4: Create the MySQL Database
Log into MySQL and create the `ipl_auction` database:
```sql
CREATE DATABASE IF NOT EXISTS ipl_auction CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 5: Generate the Prisma Client
Generate the TypeScript Prisma Client bindings matching `prisma/schema.prisma`:
```bash
npx prisma generate
```

### Step 6: Apply Database Migrations
Sync the database schema with your MySQL instance:
```bash
npx prisma db push
```
*Alternatively, you can apply migrations via:*
```bash
npx prisma migrate dev --name init_mysql
```

---

## 4. Environment Configuration

The file `.env.example` serves as the single source of truth for all required configuration variables. The table below details every variable:

| Environment Variable | Source of Truth Default | Type | Description |
|---|---|---|---|
| `DATABASE_URL` | `"mysql://root:password@localhost:3306/ipl_auction"` | `string` | MySQL connection string for Prisma ORM. Format: `mysql://<user>:<password>@<host>:<port>/<database>` |
| `SESSION_SECRET` | `"ipl-auction-auth-secret-key-32-chars-long"` | `string` | Cryptographic secret key used for session cookie signing and token entropy. Should be at least 32 characters. |
| `PORT` | `3001` | `number` | Port on which the standalone authoritative Node.js & Socket.IO server listens. |
| `CLIENT_ORIGIN` | `"http://localhost:3000"` | `string` | Allowed frontend origin for CORS headers on HTTP endpoints (`/api/rooms`, `/api/results`). |
| `NEXT_PUBLIC_SOCKET_URL` | `"http://localhost:3001"` | `string` | Public WebSocket endpoint consumed by the browser's client-side Socket.IO connection. |
| `NODE_ENV` | `"development"` | `string` | Application runtime environment (`development`, `production`, or `test`). |

> [!CAUTION]
> **Security Reminder:** Never commit your actual `.env` file containing real database passwords or secrets to Git. The `.gitignore` file is configured to exclude `.env` automatically.

---

## 5. Database Setup & Management

### A. Creating the MySQL Database
You can create the database using any of the following methods:

#### Method 1: Using the MySQL Command-Line Client
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ipl_auction CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### Method 2: Using Docker (Fast Local Container)
If you prefer not to install MySQL directly on your host machine:
```bash
docker run -d --name ipl-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=ipl_auction mysql:8.0
```

### B. Prisma Schema Architecture
The database schema defined in `prisma/schema.prisma` contains 4 core models:
1. **`users` (`User`)**: Stores authenticated accounts (`id`, `name`, `email`, `password_hash`, `created_at`, `updated_at`).
2. **`sessions` (`Session`)**: Tracks active user sessions with 7-day expiration (`id`, `session_token`, `user_id`, `expires_at`).
3. **`rooms` (`Room`)**: Persists rooms created by users (`room_code`, `name`, `host_user_id`, `status`).
4. **`results` (`Result`)**: Stores permalinks of completed auctions (`room_code`, `completed_at`, `awards`, `leaderboard`, `total_money_spent`).

### C. Migration Workflows
- **Development Schema Push (Fastest):**
  ```bash
  npx prisma db push
  ```
  Applies schema changes directly to your database without generating incremental SQL files. Ideal for local prototyping.

- **Deploy Pre-Existing Migration:**
  ```bash
  npx prisma migrate deploy
  ```
  Applies the existing migration in `prisma/migrations/20261104_init_mysql/migration.sql` directly to the target database.

- **Generate New Migration:**
  ```bash
  npx prisma migrate dev --name <migration_name>
  ```
  Generates a new SQL migration file and applies it to the database.

### D. Verifying the Database
You can visually inspect and manage your database using Prisma Studio:
```bash
npx prisma studio
```
This launches a web-based database GUI accessible at `http://localhost:5555`.

### E. Useful Prisma CLI Commands
| Command | Purpose |
|---|---|
| `npx prisma generate` | Regenerates Prisma Client after modifying `schema.prisma`. |
| `npx prisma db push` | Pushes schema changes directly to the database. |
| `npx prisma migrate status` | Checks the status of migrations in the target database. |
| `npx prisma validate` | Validates the syntax of `schema.prisma`. |
| `npx prisma format` | Automatically formats `schema.prisma`. |

---

## 6. Running the Application

The IPLAuction project consists of two servers:
1. **Next.js Frontend Server:** Runs on port `3000` (serving UI pages, SSR, and `/api/auth` endpoints).
2. **Socket.IO Authoritative Server:** Runs on port `3001` (handling WebSocket connections, rooms, bid validation, and timer loops).

### A. Run Both Servers Concurrently (Recommended)
The root `package.json` includes a concurrent development script:
```bash
npm run dev
```
This executes `npm run server:dev` and `npm run client:dev` in parallel with color-coded terminal output:
- `[SERVER]`: Authoritative Socket.IO server running on `http://localhost:3001`
- `[NEXT]`: Next.js web application running on `http://localhost:3000`

### B. Run Servers Individually (Two Terminals)
If you prefer running the processes in dedicated terminal windows:

**Terminal 1 — Socket.IO Server:**
```bash
npm run server:dev
```
*(Uses `tsx watch server/index.ts` with hot-reloading)*

**Terminal 2 — Next.js Frontend:**
```bash
npm run client:dev
```
*(Uses `next dev -p 3000`)*

---

### C. Complete End-to-End User Journey

Once both servers are running, open your browser and follow this walkthrough:

#### 1. Access the Application
Navigate to `http://localhost:3000`. You will see the Twilight Scoreboard landing page with the interactive Mini Auction Demo.

#### 2. Register a New Account
- Click **"Register"** in the top navbar or navigate to `http://localhost:3000/register`.
- Provide:
  - **Full Name:** e.g., `Rohit Sharma`
  - **Email:** e.g., `rohit@mumbaiindians.com`
  - **Password:** e.g., `Hitman45!` (minimum 6 characters)
- Click **"Create Account"**. Upon success, a secure HTTP-only cookie (`ipl_session_token`) is automatically set in your browser, and you are redirected to the homepage.

#### 3. Log In
- If returning with an existing account, navigate to `http://localhost:3000/login`.
- Enter your registered email and password to authenticate.

#### 4. Create an Auction Room
- Click **"Create Room"** in the navigation bar or visit `http://localhost:3000/create`.
  *(Protected route: unauthenticated visitors are automatically redirected to `/login?redirect=/create`)*.
- Configure room settings:
  - **Room Name:** e.g., `Mega Auction 2026`
  - **Team Purse:** Select `₹100 Cr`, `₹125 Cr`, or `₹150 Cr` (Default: ₹100 Cr).
  - **Squad Size:** Select `15`, `20`, or `25` players per team (Default: 15).
  - **Bid Timer:** Select `10s`, `15s`, or `20s` (Default: 15s).
  - **Player Order:** Choose `Random (Shuffled)`, `By Role (BAT -> WK -> AR -> BOWL)`, or `By Base Price (High to Low)`.
  - **Accelerated Round:** Toggle whether unsold players return in Round 2.
  - **Player Pool Selection:** Click **"Customize Player Pool"** to select specific players, or filter by role/country, or apply presets (`STARS`, `UNCAPPED`, `INDIAN`).
- Click **"Launch Auction Room"**. The server generates a unique 6-character room code (e.g., `XY7K2M`).

#### 5. Invite Participants
- In the room lobby, copy the room code or click the share button to copy the direct URL:
  `http://localhost:3000/join/<ROOM_CODE>`
- Friends can log in on their devices and navigate to `http://localhost:3000/join` to enter the 6-character code.

#### 6. Lobby & Franchise Selection
- Each participant selects their franchise identity from the 20 available IPL presets (e.g., CSK, MI, RCB, KKR, RR, SRH, DC, PBKS, GT, LSG, etc.).
- The system enforces unique color and franchise claims—no two participants can pick the same team.
- At least 2 participants must select a franchise before the auction can begin.

#### 7. Conduct Live Bidding
- The host clicks **"Start Auction"**.
- A 2.5-second stadium intro transitions into the live bidding phase.
- The authoritative server broadcasts `next_player` with opening details.
- Participants place bids using the Bid Ladder (+₹25L, +₹50L, +₹1Cr) or click **"Withdraw"** if bowing out.
- Each new bid authoritatively resets the circular timer ring.
- If all other eligible participants withdraw, the gavel automatically strikes immediately.

#### 8. Accelerated Round & Completion
- Unsold players are stored in `unsold_pool`. If the primary pool concludes and squads still have open slots, Round 2 (Accelerated Round) begins automatically.
- Upon completion, the system calculates 100-point balanced squad ratings, distributes awards (Best Value Pick, Most Expensive Player), and displays the final leaderboard with share card downloads.

---

## 7. Testing Suite

The repository includes a comprehensive testing suite verifying unit logic, authentication security, bid validation rules, WebSocket handshakes, and concurrent stress loads.

### A. Run Vitest Unit & Integration Tests
Execute all unit and integration test suites:
```bash
npm test
```
*To run tests in interactive watch mode during development:*
```bash
npm run test:watch
```

### B. What Each Test Verifies

#### 1. Authoritative Rules & Bid Validation (`server/tests/validation.test.ts`)
- **First Bid Rule:** Asserts that the opening bid on any player must equal `player.base_price`.
- **Highest Bidder Check:** Verifies that the current leading bidder cannot bid against themselves.
- **Withdrawal Rejection:** Rejects bids from participants who have previously withdrawn from the current player.
- **Squad Capacity:** Rejects bids from participants whose squads have reached the maximum `squad_size`.
- **Purse Sufficiency:** Validates that the participant possesses sufficient purse balance for the bid amount.
- **Reserve Rule Calculation:** Verifies that a participant reserves at least `₹20 Lakhs` per unfilled slot.
- **Timer Expiry Check:** Confirms that bids submitted after server timer expiration are rejected.

#### 2. Authentication & Session Management (`server/tests/auth.test.ts`)
- **Bcrypt Password Hashing:** Tests salt generation and password verification.
- **User Uniqueness:** Confirms that duplicate emails are rejected with a unique constraint error.
- **Session Lifecycle:** Validates token generation (32-byte hex string), database storage, and session destruction.
- **Credential Protection:** Confirms that `password_hash` is never exposed in user query responses.
- **Rate Limiting:** Confirms that brute-force attempts trigger rate-limit lockouts.

#### 3. Protected Routes & Socket.IO Handshake Security (`server/tests/protected-routes.test.ts`)
- **Unauthenticated Socket Rejection:** Tests that WebSocket connections without an auth token are rejected.
- **Invalid Token Rejection:** Confirms that connections with invalid/tampered tokens are refused.
- **Authenticated Connection:** Confirms that sockets with valid session tokens are granted entry.
- **Protected Room Creation:** Asserts that `/api/rooms` returns HTTP `401 Unauthorized` without a valid session.

#### 4. 20-Bot Race Condition & Stress Simulator (`server/tests/bot-simulator.ts`)
Simulates 20 concurrent automated bots competing in a live auction room under high network contention:
```bash
npx tsx server/tests/run-sim-test.ts
```
*(Or via `npm run test:bot-sim` when the server is already running)*

- **What it verifies:**
  - Creates a live room and connects 20 distinct Socket.IO clients simultaneously.
  - Each bot picks a unique franchise and joins the lobby.
  - Bots place thousands of concurrent, competing bids within milliseconds of each other.
  - Verifies atomic bid mutex locks in `server/room.ts` to ensure zero race conditions, double-allocations, or corrupted squad states.

---

## 8. Troubleshooting

### A. MySQL Connection Issues
**Symptom:** Terminal shows `Can't reach database server at localhost:3306`.  
**Solutions:**
1. **Verify MySQL Daemon is Running:**
   - **Windows:** Open Services (`services.msc`), find **MySQL80**, and click **Start**.
   - **Linux:** Run `sudo systemctl status mysql` (or `sudo systemctl start mysql`).
   - **macOS:** Run `brew services start mysql`.
2. **Verify Credentials in `.env`:** Check `DATABASE_URL` username, password, host, and port.
3. **Fallback In-Memory Mode:** The application features an automatic in-memory fallback in `src/lib/db.ts`. If MySQL is unavailable, development and tests will continue seamlessly using local memory stores.

### B. Prisma Migration Errors
**Symptom:** `P3005: The database schema is not empty` or migration drift.  
**Solutions:**
- For local development, use `npx prisma db push` to synchronize the schema without migration conflicts.
- To re-apply migrations cleanly:
  ```bash
  npx prisma generate
  npx prisma db push
  ```

### C. Port Conflicts (`EADDRINUSE`)
**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000` or `:::3001`.  
**Solutions:**
- **Find and kill process on port 3000 (Windows PowerShell):**
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
  ```
- **Find and kill process on port 3001 (Windows PowerShell):**
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
  ```
- **On Linux / macOS:**
  ```bash
  kill -9 $(lsof -t -i:3000)
  kill -9 $(lsof -t -i:3001)
  ```

### D. Socket.IO Connection Failures
**Symptom:** Client repeatedly logs `WebSocket connection to ws://localhost:3001 failed` or `connect_error`.  
**Solutions:**
1. **Ensure Backend is Running:** Verify that `npm run server:dev` is actively running on port `3001`.
2. **Verify `NEXT_PUBLIC_SOCKET_URL`:** Must match `http://localhost:3001` in `.env`.
3. **Verify `CLIENT_ORIGIN`:** Must match `http://localhost:3000` in `.env`.
4. **Session Cookie Missing:** Make sure you are logged in; unauthenticated WebSocket handshakes are rejected.

### E. Rate Limiting Lockouts on Auth Endpoints
**Symptom:** HTTP `429 Too Many Requests` when logging in or registering.  
**Solutions:**
- The in-memory rate limiter allows 5 failed attempts per 60 seconds per IP address. Wait 60 seconds for the window to reset, or restart the server process.

---

## 9. Production Build & Deployment

### A. Production Build
To create an optimized production build of the Next.js application:
```bash
npm run build
```
This performs TypeScript type-checking, CSS optimization, and pre-renders static routes.

### B. Database Migration in Production
Always apply migrations in production using the non-destructive deploy command:
```bash
npx prisma migrate deploy
```

### C. Production Environment Configuration
In production environments, ensure:
1. `NODE_ENV="production"`
2. `SESSION_SECRET` is set to a secure, randomly generated 64-character string.
3. `DATABASE_URL` points to your managed MySQL instance with SSL enabled (`?sslaccept=strict` or appropriate CA certificates).
4. `CLIENT_ORIGIN` matches your public domain (e.g., `https://iplauction.example.com`).
5. `NEXT_PUBLIC_SOCKET_URL` matches your public Socket.IO server domain (e.g., `https://socket.iplauction.example.com`).

### D. Running in Production

#### 1. Authoritative Socket.IO Server (Requires Persistent Node.js Process)
Because Socket.IO relies on stateful in-memory room management and persistent WebSocket connections, run `server/index.ts` using **PM2**, **Docker**, or a containerized VPS (AWS ECS, DigitalOcean, Railway, or Render with persistent instances):
```bash
# Using tsx or compiled JavaScript
npx tsx server/index.ts
# Or with PM2 process manager
pm2 start "npx tsx server/index.ts" --name "ipl-socket-server"
```

#### 2. Next.js Frontend
Run the production Next.js server:
```bash
npm start
# Or with PM2
pm2 start "npm start" --name "ipl-frontend"
```
Alternatively, deploy the Next.js frontend to **Vercel** or **AWS Amplify**, configuring `NEXT_PUBLIC_SOCKET_URL` to point to your persistent Socket.IO server.

