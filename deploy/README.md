# One-droplet deployment (backend + MongoDB + HTTPS)

Everything the backend needs runs in four containers on a single Ubuntu droplet:

- `mongo`         — MongoDB 7 with a persistent volume for `/data/db`
- `api`           — the FastAPI backend built from `backend/Dockerfile`
- `caddy`         — reverse proxy that gets a Let's Encrypt HTTPS cert automatically
- `mongo-backup`  — dumps MongoDB every 24 h, keeps 30 days (see below)

Total cost: whatever your droplet plan is (a $6/mo Basic droplet handles this fine for GameShop Nepal's volume).

## 1. Point your DNS at the droplet first

Before starting the stack, add an **A record** at your DNS provider:

| Host | Type | Value |
|---|---|---|
| `api` | A | *your droplet's public IPv4 address* |

Caddy can only fetch the HTTPS cert once `api.gameshopnepal.com` resolves to the droplet. Wait ~5 min for DNS to propagate (`dig api.gameshopnepal.com` or [dnschecker.org](https://dnschecker.org)).

## 2. SSH into the droplet

Use the **DigitalOcean web console** button on your droplet's page (no SSH client needed) or:

```bash
ssh root@YOUR_DROPLET_IP
```

## 3. Run the bootstrap script

```bash
curl -fsSL https://raw.githubusercontent.com/sushant-poudel/YesGSN/main/deploy/setup.sh | bash
```

The script installs Docker, opens the firewall, clones the repo to `/opt/gsn`, and copies `deploy/.env.example` -> `deploy/.env`.

## 4. Fill in `.env`

```bash
nano /opt/gsn/deploy/.env
```

Edit every value that says `CHANGE-ME` or is blank. See the section at the bottom for what each variable does. Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

## 5. Start the stack

```bash
cd /opt/gsn/deploy
docker compose up -d --build
```

Watch it come up:

```bash
docker compose ps            # all three should say "healthy" / "running"
docker compose logs -f api   # tail backend logs, Ctrl+C to exit
```

## 6. Sanity check

```bash
curl https://api.gameshopnepal.com/health
# {"status":"healthy","database":"connected"}
```

The first request may take 10-30 s while Caddy fetches the cert. After that it's instant.

## 7. Import your data

Copy the CSVs and dump onto the droplet (from your laptop):

```bash
scp db_backup.json Customer_Details.csv Order_Log.csv root@YOUR_DROPLET_IP:/opt/gsn/
```

Then on the droplet:

```bash
cd /opt/gsn
docker compose -f deploy/docker-compose.yml exec -T api bash -c '
  cd /app &&
  pip install --quiet pymongo &&
  MONGO_URL="$MONGO_URL" DB_NAME="$DB_NAME" python3 /import_db.py --mode upsert
'
```

Or, simpler: run the import scripts from your laptop after opening the Mongo port temporarily. Ask Claude to walk you through whichever you prefer.

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `API_DOMAIN` | Public hostname for the backend, used by Caddy for HTTPS |
| `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD` | Local Mongo credentials (never exposed to the internet) |
| `DB_NAME` | Database name inside Mongo (default: `gameshopnepal`) |
| `JWT_SECRET` | Random 64-char hex; signs login tokens |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `/admin` panel credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google customer login |
| `TAKEAPP_API_KEY`, `DISCORD_ORDER_WEBHOOK`, `IMGBB_API_KEY`, `OPENAI_API_KEY` | Third-party integrations |
| `SMTP_*` | Gmail app password used for order emails |
| `SITE_URL` | Public site URL used in email templates |
| `DAILY_SUMMARY_EMAIL` | Where the daily order-summary email is sent |

## Common tasks

Redeploy after a `git push`:
```bash
cd /opt/gsn && git pull && cd deploy && docker compose up -d --build
```

Restart just one service:
```bash
docker compose restart api
```

Full teardown (keeps volumes / data):
```bash
docker compose down
```

Nuke everything including the database (**destructive**):
```bash
docker compose down -v
```

## Backups

The `mongo-backup` container runs `deploy/backup.sh` on start and then every 24 h. Each run writes a gzipped archive to the `mongo-backups` docker volume and prunes anything older than `BACKUP_KEEP_DAYS` (default 30).

List backups:
```bash
docker compose exec mongo-backup ls -lh /backups
```

Copy the latest backup to the host (so you can `scp` it off-droplet):
```bash
LATEST=$(docker compose exec mongo-backup ls -t /backups | head -1 | tr -d '\r')
docker compose cp "mongo-backup:/backups/${LATEST}" ./
```

Force a backup right now:
```bash
docker compose exec mongo-backup /usr/local/bin/backup.sh
```

### Restore from a backup

```bash
# Copy a backup file into the running mongo container
docker compose cp ./gsn-2026-07-15_0300.gz mongo:/tmp/restore.gz

# Restore it (destructive: overwrites matching collections)
docker compose exec mongo mongorestore --archive=/tmp/restore.gz --gzip \
    --username "$MONGO_ROOT_USERNAME" --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin --drop
```

### Off-droplet backups (recommended)

The dumps only survive as long as the droplet's disk does. For real safety copy them somewhere else, e.g. weekly `scp` from your laptop:

```bash
scp root@YOUR_DROPLET_IP:/var/lib/docker/volumes/deploy_mongo-backups/_data/gsn-*.gz \
    ~/gsn-backups/
```

Or use DigitalOcean Spaces (~$5/mo) with `s3cmd` in a cron job.
