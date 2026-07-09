# Deploying Caylios to Fly.io (COA-272)

Two apps, both in `syd`:

| App | Source | Config |
|---|---|---|
| `sts-api` | `backend/` | `backend/fly.toml` |
| `sts-web` | `frontend/` | `frontend/fly.toml` |

Prerequisites (COA-270, HITL): Fly.io account, `flyctl` installed and authenticated,
`simplets.com.au` registered. Optional: `fly mcp launch` to manage infra from Claude Code.

## 1. Backend (`sts-api`)

```sh
cd backend
fly launch --no-deploy --copy-config --name sts-api --region syd
fly volumes create sts_data --region syd --size 1
fly secrets set \
  STS_ENCRYPTION_KEY="$(python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')" \
  ANTHROPIC_API_KEY=... \
  CLERK_ISSUER=https://<instance>.clerk.accounts.dev \
  CLERK_AUTHORIZED_PARTIES=https://coachcw.simplets.com.au \
  STS_PLATFORM_ADMINS=<clerk-user-id> \
  STS_HUBSPOT_CLIENT_ID=... STS_HUBSPOT_CLIENT_SECRET=... \
  STS_GOOGLE_DRIVE_CLIENT_ID=... STS_GOOGLE_DRIVE_CLIENT_SECRET=... \
  STS_PANDADOC_CLIENT_ID=... STS_PANDADOC_CLIENT_SECRET=... \
  STS_XERO_CLIENT_ID=... STS_XERO_CLIENT_SECRET=...
fly deploy
```

Health check: `GET /health` (configured in fly.toml).

> **Stack note (documented deviation):** v1 ships with volume-backed SQLite on a
> single Sydney machine — the schema is Postgres-compatible and the constitution's
> Postgres target applies from the multi-machine milestone. Migrating means
> provisioning `fly postgres create`, attaching it, and porting `app/db.py` to a
> Postgres driver.

## 2. Frontend (`sts-web`)

```sh
cd ../simplets/frontend
fly launch --no-deploy --copy-config --name sts-web --region syd
fly deploy --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

## 3. Wildcard domain + SSL

```sh
fly certs add "*.simplets.com.au" --app sts-web
fly certs add simplets.com.au --app sts-web
fly certs add api.simplets.com.au --app sts-api
```

DNS at the registrar:

```
*.simplets.com.au   CNAME  sts-web.fly.dev
simplets.com.au     A/AAAA <fly IPs from `fly ips list --app sts-web`>
api.simplets.com.au CNAME  sts-api.fly.dev
```

The frontend serves every subscriber subdomain; the backend resolves the
workspace from the Host header (`X-Forwarded-Host` is honoured), so a new
workspace's subdomain works as soon as the row exists — no per-subscriber DNS.

Point the frontend at the deployed API by setting the API base URL for the
production build (currently `http://localhost:8000` in `src/api.ts` — switch to
`https://api.simplets.com.au` at deploy time).

## Smoke checks after deploy

1. `curl https://api.simplets.com.au/health` → `{"status":"ok"}`
2. `https://coachcw.simplets.com.au` loads the portal with Clerk sign-in
3. Submit intake → review queue → approve → destination pushes recorded
4. `fly logs --app sts-api` shows no tokens or PII
