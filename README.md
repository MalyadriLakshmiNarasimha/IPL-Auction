# IPLAuction — Real-Time Multiplayer IPL Auction Game with Authentication

An authentic, broadcast-grade real-time multiplayer IPL auction night web application built for friends and WhatsApp groups, equipped with traditional user authentication, MySQL persistence via Prisma ORM, and low-latency Socket.IO auction tables.

![Design System](https://img.shields.io/badge/Theme-Twilight_Scoreboard-FF7A1A?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-MySQL_Prisma_ORM-00758F?style=for-the-badge)
![Auth](https://img.shields.io/badge/Auth-Bcrypt_Session_Cookies-1FA36B?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js_14-Socket.IO_WebSocket-000000?style=for-the-badge)

---

## 🏆 Authentication & Database Architecture

- **Traditional User Authentication**:
  - Replaced anonymous sessions with a secure, credential-based authentication system.
  - Zero dependencies on third-party services like Supabase.
  - Password hashing via `bcryptjs` with salt rounds.
  - Protected session tokens stored in secure, HTTP-only cookies (`SameSite=lax`, `Secure` in production).
  - Rate limiting on `/api/auth/register` and `/api/auth/login` to prevent brute-force attacks.
  - Session fixation protection on login/registration.
- **Relational Database with Prisma ORM**:
  - Database schema defined in `prisma/schema.prisma` targeting MySQL (`users`, `sessions`, `rooms`, `results`).
  - Production-ready MySQL migrations located in `prisma/migrations/20261104_init_mysql/migration.sql`.
  - Development & test fallback store ensuring zero-crash test execution even when a local MySQL daemon is not running.
- **Real-Time Multiplayer Socket.IO Integration**:
  - Handshake authentication middleware verifying session tokens before allowing WebSocket connections.
  - Room host validation and bid permissions authoritatively linked to the authenticated user's database ID.
  - Room membership checks on all auction events (`place_bid`, `withdraw_bid`, `start_auction`, etc.).

---

## 📋 Database Schema

### `users` Table
| Column | Type | Attributes |
|---|---|---|
| `id` | VARCHAR(191) | Primary Key (CUID) |
| `name` | VARCHAR(100) | Full Name |
| `email` | VARCHAR(191) | Unique Index |
| `password_hash` | VARCHAR(255) | Bcrypt Hash |
| `created_at` | DATETIME(3) | Default CURRENT_TIMESTAMP |
| `updated_at` | DATETIME(3) | Auto-updated |

### `sessions` Table
| Column | Type | Attributes |
|---|---|---|
| `id` | VARCHAR(191) | Primary Key (CUID) |
| `session_token` | VARCHAR(191) | Unique Index |
| `user_id` | VARCHAR(191) | Foreign Key -> `users(id)` (CASCADE) |
| `expires_at` | DATETIME(3) | Expiration Timestamp (7 Days) |
| `created_at` | DATETIME(3) | Default CURRENT_TIMESTAMP |

---

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
# MySQL Database Connection URL
DATABASE_URL="mysql://root:password@localhost:3306/ipl_auction"

# Session & Auth Secret
SESSION_SECRET="ipl-auction-auth-secret-key-32-chars-long"

# Server Ports & CORS
PORT=3001
CLIENT_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
NODE_ENV="development"
```

---

## ⚡ Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Apply MySQL Migrations (when MySQL is running)
```bash
npx prisma db push
# or
npx prisma migrate dev --name init_mysql
```

### 4. Run Development Servers
```bash
npm run dev
```
- Client running at: `http://localhost:3000`
- Authoritative Server running at: `http://localhost:3001`

### 5. Run Test Suite
```bash
# Unit & Authentication Tests
npm test

# 20-Bot Race Condition & Stress Simulator
npx tsx server/tests/run-sim-test.ts
```

---

## 🔄 Complete User Workflow

1. **Register** (`/register`):
   - Input Name, Email, Password (at least 6 characters).
   - Validated on frontend & backend; password hashed with bcrypt.
   - Automatically issues session cookie and redirects.
2. **Login** (`/login`):
   - Authenticates against database.
   - Sets secure HTTP-only session cookie.
3. **Create Room** (`/create`):
   - Protected: Only logged-in users can create rooms.
   - Authoritative host ID linked to user's database ID.
4. **Join Room** (`/join` or `/room/[code]`):
   - Protected: Authenticated users join with their verified account name.
   - Identity preserved across page refreshes and reconnections.
5. **Bid Live**:
   - Split-flap scoreboard, circular timer ring, reserve rule check, and gavel celebrations.
6. **Results & Logout**:
   - View 100-point balanced squad ratings, awards, and download share card.
   - Click user profile in top-right navbar -> **Log Out** to destroy session and clear cookies.
