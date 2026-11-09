# IPL AUCTION — STEP-BY-STEP FRESH DEPLOYMENT GUIDE

This guide provides the exact procedure to safely remove your old Netlify and Render deployments, deploy the authoritative backend on Render, deploy the frontend on Netlify, and verify production end-to-end.

---

## BEFORE YOU BEGIN: IMPORTANT SAFEGUARDS

> [!CAUTION]
> **NEVER DELETE YOUR TiDB CLOUD DATABASE OR DROP TABLES.**  
> Your TiDB Cloud database holds user accounts, sessions, and completed auction results. This fresh deployment only rebuilds the stateless application services on Render and Netlify; the database remains untouched and connected.

> [!NOTE]
> Local pre-cleanup backup verified at: `C:\Game_backup_pre_cleanup`.

---

## PART 1: RECORD EXISTING SETTINGS & REMOVE OLD DEPLOYMENTS

### Step 1: Remove Old Netlify Site
1. Log in to your [Netlify Dashboard](https://app.netlify.com/).
2. Select your existing IPL Auction site (e.g. `iplauctionlive`).
3. Click on **Site configuration** (left sidebar).
4. *(Optional Reference)* Note down any custom domains or site name under **General** > **Site details**.
5. Scroll down to the bottom to the **Danger zone**.
6. Click **Delete site**.
7. Type the site name to confirm deletion and click **Delete**.
*Your old Netlify frontend is now completely decommissioned.*

---

### Step 2: Remove Old Render Web Service
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Locate and select your existing backend service: **`ipl-auction-jqsd`**.
3. Click **Settings** in the left sidebar.
4. *(Optional Reference)* Under **Environment**, confirm you have your `DATABASE_URL` saved securely on your password manager or notes.
5. Scroll down to the bottom to the **Danger Zone**.
6. Click **Delete Web Service**.
7. Type the service name `ipl-auction-jqsd` to confirm and click **Delete Web Service**.
*Your old Render backend is now completely decommissioned. Your TiDB Cloud database remains intact.*

---

## PART 2: DEPLOY FRESH RENDER BACKEND (DEPLOY FIRST)

Deploy the backend first so its public URL (`https://<new-backend>.onrender.com`) is ready before building the frontend.

### Step 3: Create New Render Web Service
1. In your [Render Dashboard](https://dashboard.render.com/), click **New +** (top right) and select **Web Service**.
2. Under **Connect a repository**, select your repository:
   - `MalyadriLakshmiNarasimha/IPL-Auction`
   *(If not visible, click "Configure GitHub App" to grant repository access).*
3. Fill in the deployment details:
   - **Name:** `ipl-auction-backend` (or a name of your choice)
   - **Region:** Ohio (US East) or Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank)*
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && npx prisma generate
     ```
   - **Start Command:**
     ```bash
     npm run server
     ```
   - **Instance Type:** `Free` (or `Starter`)
4. Click **Advanced** and configure:
   - **Health Check Path:** `/health`
   - **Auto-Deploy:** `Yes`

### Step 4: Add Render Environment Variables
Under the **Environment Variables** section, add the following key-value pairs:

| Key | Value |
|---|---|
| `DATABASE_URL` | *Your existing TiDB Cloud connection string* (`mysql://...sslaccept=strict`) |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | `https://iplauctionlive.netlify.app` *(or your planned Netlify domain)* |
| `ALLOWED_ORIGINS` | `https://iplauctionlive.netlify.app,http://localhost:3000` |
| `SESSION_SECRET` | *Your secure 32+ character random secret* |
| `MIN_AUCTION_PARTICIPANTS` | `2` |

5. Click **Create Web Service**.
6. Wait 2–3 minutes for Render to build and start.
7. Once Render displays **"Live"**, copy your new backend URL:  
   `https://ipl-auction-backend-XXXX.onrender.com`
8. Verify in your browser: open `https://<your-render-url>/health`.  
   You should see:
   ```json
   { "status": "ok", "db": "connected", "time": 173114... }
   ```

---

## PART 3: CONFIGURE & DEPLOY FRESH NETLIFY FRONTEND

### Step 5: Update `netlify.toml` with the New Backend URL
In your project repository, open `netlify.toml` and update the proxy target to your **new** Render backend URL:
```toml
[[redirects]]
  from = "/api/proxy/*"
  to = "https://<your-new-render-backend-url>/api/:splat"
  status = 200
  force = true
```

Commit and push this change to GitHub:
```bash
git add netlify.toml
git commit -m "chore(deployment): update netlify proxy target with new render backend URL"
git push origin main
```

---

### Step 6: Create New Netlify Site
1. In your [Netlify Dashboard](https://app.netlify.com/), click **Add new site** > **Import an existing project**.
2. Select **GitHub** and authorize if prompted.
3. Choose the repository: **`MalyadriLakshmiNarasimha/IPL-Auction`**.
4. Configure basic build settings:
   - **Branch to deploy:** `main`
   - **Base directory:** *(leave blank)*
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
5. Click **Add environment variables** and enter the following:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | `https://<your-new-render-backend-url>` |
| `NEXT_PUBLIC_API_URL` | `https://<your-new-render-backend-url>` |
| `BACKEND_INTERNAL_URL` | `https://<your-new-render-backend-url>` |
| `NEXT_PUBLIC_MIN_AUCTION_PARTICIPANTS` | `2` |
| `NODE_ENV` | `production` |

6. Click **Deploy IPL-Auction**.
7. Under **Site configuration** > **Site details**, click **Change site name** if you wish to reclaim `iplauctionlive` (e.g. `iplauctionlive.netlify.app`).
8. If you customized the Netlify site name, ensure that Render's `CLIENT_ORIGIN` and `ALLOWED_ORIGINS` match the Netlify URL.

---

## PART 4: PRODUCTION VERIFICATION

Once both Render and Netlify display **Published / Live**:

1. Open your Netlify site URL in your browser.
2. Register a new user account (or sign in with an existing user from TiDB Cloud).
3. Create an auction room — verify a 6-character room code is generated.
4. Join the room on a secondary browser or phone.
5. Confirm real-time participant synchronization and team selection.
6. Start the auction — verify player portraits load cleanly in 4:5 ratio on the studio charcoal background with zero black halos or action photos.
7. Test live bidding and pass actions.
