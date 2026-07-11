# Hosting Guide — Vercel (frontend) + DigitalOcean (backend + MongoDB)

This repo is a monorepo:

- `frontend/` — Next.js 15 app (Vercel)
- `backend/` — FastAPI + Motor/MongoDB (DigitalOcean App Platform, Docker)
- `db_backup.json` — the seed dump you'll import into managed MongoDB

Stack summary:

| Layer     | Host                                    | URL example                     |
| --------- | --------------------------------------- | ------------------------------- |
| Frontend  | Vercel                                  | `https://gameshopnepal.com`     |
| Backend   | DigitalOcean App Platform (Docker)      | `https://api.gameshopnepal.com` |
| Database  | DigitalOcean Managed MongoDB            | `mongodb+srv://...`             |

> **Rotate secrets first.** `backend_env_backup.txt` in this repo contains a live SMTP password, JWT secret, and a Google service-account private key. Treat them as compromised: rotate the Gmail App Password, generate a new `JWT_SECRET` (`openssl rand -hex 32`), and issue a new Google service-account key before going live.

---

## 1. Provision the database (DigitalOcean Managed MongoDB)

1. DO Console → **Databases → Create Database Cluster → MongoDB**.
   - Region: pick the same region you'll use for the backend App (e.g. `SGP1` for Singapore).
   - Size: the smallest shared plan is fine to start.
   - Name: `gsn-mongo` (or similar).
2. When the cluster is Green, open **Connection Details → Connection string** (Flags = `Public network`) and copy the SRV URI. It looks like:
   ```
   mongodb+srv://doadmin:PASSWORD@db-mongodb-xxx.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=db-mongodb-xxx
   ```
3. Replace the trailing `/admin` with `/gameshopnepal` so your app opens the right DB:
   ```
   mongodb+srv://doadmin:PASSWORD@db-mongodb-xxx.mongo.ondigitalocean.com/gameshopnepal?tls=true&authSource=admin&replicaSet=db-mongodb-xxx
   ```
4. Under **Settings → Trusted sources**, temporarily add your workstation IP so you can run the import from your laptop. You'll swap this for the App Platform app after import.

Keep this connection string handy — it's the `MONGO_URL` env var for both the backend and the import step.

---

## 2. Import customer + order data

The dump has ~22 collections (customers, orders, takeapp_orders, admins, products, reviews, visits, etc.). Full inventory:

```
visits: 44           users: 2                reviews: 23
trustpilot_config: 1 site_settings: 1        categories: 2
social_links: 5      payment_methods: 1      notification_bar: 1
promo_codes: 1       orders: 21              blog_posts: 1
takeapp_orders: 525  permissions: 19         otp_records: 1
customers: 2         admins: 2               newsletter: 1
products: 5          bundles: 1              faqs: 4
pages: 2             order_status_history: 2
```

### Option A — Full load (fresh cluster, safe)

```bash
cd YesGSN
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

export MONGO_URL='mongodb+srv://doadmin:PASSWORD@db-mongodb-xxx.mongo.ondigitalocean.com/gameshopnepal?tls=true&authSource=admin&replicaSet=db-mongodb-xxx'
export DB_NAME=gameshopnepal

python3 import_db.py --dry-run          # sanity check: prints counts, no writes
python3 import_db.py                    # default mode = replace (drop + insert all)
```

### Option B — Only customer + order data (non-destructive)

Use this if the cluster already has data you want to keep. `--mode upsert` writes by `_id`, so re-runs are idempotent.

```bash
python3 import_db.py --mode upsert \
    --collections customers orders takeapp_orders order_status_history newsletter otp_records
```

### Verify

```bash
python3 - <<'PY'
import os
from pymongo import MongoClient
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
for c in ("customers", "orders", "takeapp_orders", "order_status_history"):
    print(f"{c:24s} {db[c].count_documents({})}")
PY
```

You should see `customers 2`, `orders 21`, `takeapp_orders 525`, `order_status_history 2`.

---

## 3. Deploy the backend (DigitalOcean App Platform)

The backend ships as a Docker image built from `backend/Dockerfile`. A ready App Platform spec is in `.do/app.yaml`.

1. Push this branch to GitHub (so App Platform can watch it).
2. DO Console → **Apps → Create App → GitHub → sushant-poudel/yesgsn**.
   - Source Directory: `backend`
   - Detection: choose **Dockerfile** (path `backend/Dockerfile`).
   - Region: match the Mongo cluster.
   - Plan: Basic-XXS is enough to start (~$5/mo).
3. Set environment variables (mark each secret as **Encrypted**):
   - `MONGO_URL` — the SRV URI from step 1.
   - `DB_NAME` = `gameshopnepal`
   - `JWT_SECRET` = `openssl rand -hex 32`
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `TAKEAPP_API_KEY`, `DISCORD_ORDER_WEBHOOK`, `IMGBB_API_KEY`, `OPENAI_API_KEY`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
   - `SITE_URL` = `https://gameshopnepal.com`
   - `DAILY_SUMMARY_EMAIL`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (paste the JSON as one line)
   - `GOOGLE_DRIVE_FOLDER_ID` (optional)

   Full list with descriptions lives in `backend/.env.example`.
4. **HTTP settings**: port `8080`, health check path `/health`.
5. Deploy. When the app is Green, hit `https://<app-name>.ondigitalocean.app/health` — you should get `{"status":"healthy","database":"connected"}`.
6. Back on the Mongo cluster: **Settings → Trusted sources → add the App Platform app** (dropdown lists your app by name). Then remove your workstation IP.
7. Add a custom domain (`api.gameshopnepal.com`) in **App Platform → Settings → Domains**. Add the CNAME DO shows you at your DNS provider.

CLI alternative — if you prefer `doctl`:
```bash
doctl apps create --spec .do/app.yaml
```
(You'll still fill in `MONGO_URL` and the other secrets via the DO console after creation.)

### CORS

`backend/server.py` currently whitelists these origins:

```
https://gameshopnepal.com
https://www.gameshopnepal.com
http://localhost:3000
https://codebase-import-8.preview.emergentagent.com
```

If you use Vercel preview URLs for QA, add `https://<project>-*.vercel.app` (or a specific preview host) to that list and redeploy.

---

## 4. Deploy the frontend (Vercel)

`vercel.json` at the repo root already points the build at the `frontend/` workspace.

1. [vercel.com/new](https://vercel.com/new) → import `sushant-poudel/yesgsn`.
2. Framework preset: **Next.js** (auto-detected).
3. Root directory: leave as repo root (the `vercel.json` handles it) **or** set to `frontend/` and delete `vercel.json` — either works.
4. Environment variables → **Production** (and **Preview** if you want previews to hit the same backend):
   - `NEXT_PUBLIC_BACKEND_URL` = `https://api.gameshopnepal.com`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = your Google OAuth web client ID
5. Deploy.
6. **Domains → Add** `gameshopnepal.com` and `www.gameshopnepal.com`. Vercel will show the A/CNAME records to set at your DNS provider. `next.config.js` already redirects `www` → apex.

---

## 5. DNS cheat sheet

At your registrar (Namecheap / Cloudflare / etc.):

| Host  | Type  | Value                                             | Purpose             |
| ----- | ----- | ------------------------------------------------- | ------------------- |
| `@`   | A     | (Vercel gives you an IP)                          | Apex → Vercel       |
| `www` | CNAME | `cname.vercel-dns.com`                            | www → Vercel        |
| `api` | CNAME | `<your-app>.ondigitalocean.app`                   | api → DO backend    |

If you're behind Cloudflare, set the `api` record to **DNS only** (grey cloud) initially so DO's cert issuance isn't blocked; you can proxy after the cert is live.

---

## 6. Smoke test end-to-end

```bash
# Backend
curl -s https://api.gameshopnepal.com/health
curl -s https://api.gameshopnepal.com/api/ | jq .stats

# Frontend
open https://gameshopnepal.com
```

Then check the storefront: products list should populate, admin login (`/admin`) should work with the credentials you set, and the customer login flow should complete a round-trip.

---

## 7. Ongoing

- **Uploads directory** — `backend/uploads/` lives on the container's ephemeral disk. Anything the backend writes there is lost on redeploy. The code already prefers ImgBB / Google Drive / Google Sheets for persistent artifacts; keep it that way, or attach a DO Spaces volume if you want on-disk uploads to survive.
- **Backups** — enable automated backups on the Mongo cluster (Settings tab). You can also re-run `import_db.py --dry-run` against a fresh dump anytime.
- **Redeploys** — pushing to `main` triggers both Vercel and DO auto-deploys once wired.
