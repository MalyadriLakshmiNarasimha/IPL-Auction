# IPL AUCTION — DEPLOYMENT CONFIGURATION SPECIFICATION

**Architecture:** Authoritative Decoupled Dual-Cloud Stack  
**Frontend Platform:** Netlify (Next.js 14 App Router)  
**Backend Platform:** Render (Node.js HTTP Server + Socket.IO)  
**Database:** TiDB Cloud Serverless (MySQL 8.0 Wire-Compatible)  
**Target Repository:** `https://github.com/MalyadriLakshmiNarasimha/IPL-Auction.git` (`main` branch)

---

## 1. ARCHITECTURE & TRAFFIC FLOW

```
[ User Browser / Mobile Device ]
          │
          ├── (1) HTTPS Page Requests & Static Assets (Port 443)
          ▼
   [ Netlify Edge CDN ] (Next.js 14 App Router)
          │
          ├── (2) WebSocket & Polling Transports (WSS / HTTPS)
          ▼
   [ Render Web Service ] (Node.js Authoritative Engine :3001)
          │
          ├── (3) TLS Encrypted Query Engine (Port 4000, sslaccept=strict)
          ▼
   [ TiDB Cloud Database ] (MySQL Wire-Compatible Cluster)
```

---

## 2. RENDER BACKEND CONFIGURATION (DEPLOY FIRST)

The backend server manages room states, authoritative bidding timers, participant synchronization, and database snapshots. It must be deployed before the Netlify frontend so its public URL can be provided to Netlify.

### 2.1 Service Specifications
- **Service Type:** Web Service
- **Name:** `ipl-auction-backend` (or custom name chosen in Render)
- **Region:** Ohio (US East) or Oregon (US West) — *Recommend matching your TiDB Cloud region to minimize query latency*
- **Branch:** `main`
- **Root Directory:** *(leave blank for repository root)*
- **Runtime:** `Node`
- **Build Command:**
  ```bash
  npm install && npx prisma generate
  ```
- **Start Command:**
  ```bash
  npm run server
  ```
- **Plan:** Free or Starter
- **Auto-Deploy:** Yes

### 2.2 Health Check Configuration
- **Health Check Path:** `/health`
- **Expected Status:** `HTTP 200 OK`
- **Response Format:**
  ```json
  { "status": "ok", "db": "connected", "time": 1731140000000 }
  ```
  *(Note: If TiDB is temporarily unreachable, `/health` returns `HTTP 503 Service Unavailable`, allowing Render to manage traffic gracefully).*

### 2.3 Port Binding & Network
- **Host Binding:** `0.0.0.0`
- **Port:** Render dynamically injects `$PORT`. The server reads `parseInt(process.env.PORT || '3001', 10)` and binds to `0.0.0.0:$PORT`.

### 2.4 Render Environment Variables

| Variable Key | Required | Value / Format | Purpose |
|---|:---:|---|---|
| `DATABASE_URL` | **Yes** | `mysql://<user>:<password>@<host>:4000/<database>?sslaccept=strict` | TiDB Cloud serverless connection string. |
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations and security checks. |
| `CLIENT_ORIGIN` | **Yes** | `https://<your-new-netlify-site>.netlify.app` | Primary frontend origin permitted for CORS and Socket.IO. |
| `ALLOWED_ORIGINS` | **Yes** | `https://<your-new-netlify-site>.netlify.app,http://localhost:3000` | Comma-separated list of origins allowed by CORS. |
| `SESSION_SECRET` | **Yes** | *Generate 64 random characters (e.g., `openssl rand -hex 32`)* | Used for cryptographic session token generation and signing. |
| `MIN_AUCTION_PARTICIPANTS` | No | `2` (or `1` for solo testing) | Minimum participant threshold before host can begin auction. |

---

## 3. NETLIFY FRONTEND CONFIGURATION (DEPLOY SECOND)

The frontend is an SSR & static Next.js 14 application providing responsive auction screens, statistics dashboards, and client-side Socket.IO event handlers.

### 3.1 Site Specifications
- **Framework Preset:** Next.js
- **Base Directory:** *(leave blank for repository root)*
- **Build Command:**
  ```bash
  npm run build
  ```
- **Publish Directory:** `.next`
- **Build Plugin:** `@netlify/plugin-nextjs` (declared in `netlify.toml`)

### 3.2 Netlify Environment Variables

| Variable Key | Required | Value / Format | Purpose |
|---|:---:|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | **Yes** | `https://<your-new-render-backend>.onrender.com` | Public URL for client-side WebSocket and Socket.IO connection. |
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://<your-new-render-backend>.onrender.com` | Public URL for client-side REST API calls. |
| `BACKEND_INTERNAL_URL` | **Yes** | `https://<your-new-render-backend>.onrender.com` | Server-side URL used by Next.js API routes (`/api/rooms`) to reach Render backend. |
| `NEXT_PUBLIC_MIN_AUCTION_PARTICIPANTS` | No | `2` | Client-side validation rule for room host UI. |
| `NODE_ENV` | **Yes** | `production` | Optimizes Next.js production bundle. |

### 3.3 Reverse Proxy & Cookie Configuration (`netlify.toml`)
Netlify provides same-origin proxying to prevent 3rd-party cross-domain cookie blocks in modern mobile browsers (Safari ITP / Chrome Partitioned Cookies):
```toml
[[redirects]]
  from = "/api/proxy/*"
  to = "https://<your-new-render-backend>.onrender.com/api/:splat"
  status = 200
  force = true
```

---

## 4. DATABASE HARDENING & RECORD PRESERVATION (TiDB CLOUD)

1. **Database Identity**: TiDB Cloud serverless cluster (MySQL 8.0 compatible).
2. **Preservation**: All tables, user accounts, and past auction records remain completely untouched.
3. **SSL Requirement**: TiDB Cloud strictly requires TLS connections. Ensure `?sslaccept=strict` or `?ssl={"rejectUnauthorized":true}` is present in the `DATABASE_URL`.
4. **Auto-Recovery**: If a network disconnect occurs between Render and TiDB, the connection pool automatically reconnects with exponential backoff (500ms, 1000ms, 2000ms, 4000ms).

