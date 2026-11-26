# PRODUCTION DEPLOYMENT GUIDE

## Project: IPL Auction & Team Management Ecosystem
**Frontend Target:** Netlify (or Vercel)
**Backend Target:** Render (or Railway / VPS)
**Database Target:** Hosted MySQL 8.0+ (AWS RDS, PlanetScale, Railway MySQL, or Aiven)

---

## 1. Environment Variable Configuration

### Authoritative Server (`server/`)
| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Yes | Target runtime environment | `production` |
| `PORT` | Yes | Port for Socket.IO HTTP server | `3001` (or `$PORT` assigned by host) |
| `DATABASE_URL` | Yes | Connection string to MySQL instance | `mysql://user:pass@host:3306/ipl_auction?sslaccept=strict` |
| `CLIENT_ORIGIN` | Yes | Allowed frontend origin for CORS & cookies | `https://my-ipl-auction.netlify.app` |
| `SESSION_SECRET` | Yes | Secret key used to sign sessions and JWTs | `a8f9c1...64hexchars` |

### Next.js Frontend (`src/`)
| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Public URL of authoritative Socket.IO backend | `https://ipl-auction-api.onrender.com` |
| `DATABASE_URL` | Yes | Shared database connection string | `mysql://user:pass@host:3306/ipl_auction?sslaccept=strict` |
| `SESSION_SECRET` | Yes | Must match backend session secret | `a8f9c1...64hexchars` |

---

## 2. Production Security & Cookie Policies

1. **CORS Enforcement**:
   - `server/index.ts` validates incoming connections against `CLIENT_ORIGIN`.
   - Wildcards (`*`) are strictly prohibited in production. `credentials: true` is enabled only for the configured origin.
2. **Cookie Attributes**:
   - `Secure`: Enabled automatically when `NODE_ENV === 'production'` or `https://` is active.
   - `SameSite`: Configured to `None` with `Secure: true` for cross-origin deployments (Netlify frontend + Render backend), or `Lax` for unified deployments.
   - `HttpOnly`: Always enabled to prevent XSS session theft.

---

## 3. Database Migration Deployment Steps

On your deployment pipeline or remote runner:
```bash
# 1. Install dependencies
npm ci

# 2. Run Prisma migrations against target production database
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate
```

---

## 4. Service Startup Commands

- **Backend Daemon (Render / Railway)**:
  ```bash
  npm run server
  ```
  Health Check Probe: `GET /health` (expects HTTP 200 with `{ "status": "ok", "db": "connected" }`)

- **Frontend Client (Netlify / Vercel)**:
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Start Command: `npm start`

