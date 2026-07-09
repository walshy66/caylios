# Caylios Rebrand — Phase 2 Execution Plan

Status tracker for the app-wide SimpleTS → Caylios rebrand. **Any session resuming this work: read this file first, do the next unchecked slice, run its verification, tick it, commit, then stop or continue.** One slice per commit; the repo must be green (backend pytest + frontend npm test + build) at every commit.

Rules that bind every slice:

- Brand contract: `docs/caylios/brand-kit.md`. Casing: CAYLIOS as mark/identifier, Caylios in prose, never abbreviated.
- Domain: `caylios.com` (subdomains `clientname.caylios.com`). `caylios.com.au` planned, NOT active. `simplets.com.au` retired.
- Do not redraw/invent the logo mark. Do not hand-build unproduced Icon Library icons. Wordmark is typographic (Montserrat, ALL CAPS) — render as text, not images.
- Interim assets are the PNG renders in `docs/caylios/assets/` (docx extractions); every interim use gets a row in `asset-gaps.md` (created in slice 1).
- Tests live: `cd backend && python -m pytest` · `cd frontend && npm test && npm run build`.

## Slices

- [x] **Slice 0 — Anchor.** Commit the phase-1 docs layer (docs/caylios/, constitution v0.3.0, AGENTS.md updates, retired docs/branding) plus this plan.
- [x] **Slice 1 — Frontend brand assets + logo component.** Copy needed Caylios assets from `docs/caylios/assets/` into `frontend/public/brand/`; replace favicon (`index.html`, use `logo-icon-simplified-*`); rename `STSLogo.tsx` → `CayliosLogo.tsx` rendering the Caylios mark + typographic wordmark; update `BrandLogo.tsx` and all importers; update `index.html` title. Create `docs/caylios/asset-gaps.md` (surface → asset in use → interim/final → what's needed from Kylie). Old `sts-*.png` files in `public/brand/` deleted only when nothing references them. Verify: frontend tests + build + visual pass (login, sidebar, dashboard header, favicon) — watch white-on-white with reverse/transparent variants.
- [x] **Slice 2 — Frontend strings + CSS tokens.** User-facing SimpleTS/STS → Caylios (App.tsx, auth, SettingsPage, FormsPage, IntakeFormPanel, ReviewQueuePanel, theme.ts, model files + their .test.mjs). Rename CSS token/class prefix `sts-`/`--sts-` → `caylios-`/`--caylios-` across `App.css` and all TSX referencing it (mechanical find/replace; ~126 refs in App.css). Verify: frontend tests + build + quick visual sanity.
- [x] **Slice 3 — Backend domain + tenancy.** `simplets.com.au` → `caylios.com` in subdomain/tenancy logic (`app/tenancy.py`, `app/db.py`, `app/main.py`, `app/current_state.py`) and all backend tests (`test_workspace_isolation.py` has ~16 refs; also clerk_auth, approval_pipeline, oauth_tokens, current_state_maps, drive_datastore_gate, subscriber_roles, review_queue, document_uploads, workspace_access_model). Behavior-sensitive: subdomain-to-workspace routing is a mandatory test area — update fixtures and logic together, keep isolation tests meaningful. Verify: full backend pytest.
- [x] **Slice 4 — Backend naming + repo docs sweep.** Remaining STS/SimpleTS words in backend (`app/auth.py`, `app/clerk.py`, `app/connectors.py`, `app/destinations.py`, `seed_demo.py`) — comments, messages, seed data names. README.md rebrand. Rename `docs/prd-sts-orchestration-platform.md` → `docs/prd-caylios-orchestration-platform.md` (fix inbound links: constitution.md, docs/AGENTS.md, README). Sweep remaining docs/ references where they state current identity (leave historical decision records as-is). Verify: backend pytest + grep sweep `SimpleTS|simplets|\bSTS\b` shows only intentional/historical remnants.
- [ ] **Slice 4b — STS_* env var family rename (COORDINATED — do not do casually).** ~20 env vars (`STS_AUTH_MODE`, `STS_BASE_DOMAIN`, `STS_ENCRYPTION_KEY`, `STS_PLATFORM_ADMINS`, connector client IDs/secrets, `STS_DATA_DIR`, extraction vars) span backend code, `.env.example`, `fly.toml`, `Dockerfile`, AND deployed Fly secrets. Renaming code without first setting the new-name secrets on Fly breaks prod (encryption key + OAuth creds). Runbook: set new `CAYLIOS_*` secrets on Fly alongside old → rename in code with old-name fallback or atomically → deploy → remove old secrets. Requires user coordination; skip until asked.
- [x] **Slice 5 — Closeout.** Update root AGENTS.md rebrand-status note (docs+app done; folder rename pending/done), constitution rebrand-status line, `asset-gaps.md` final state. DOX pass over touched AGENTS.md files. Provide the user manual steps for the repo folder rename (`simplets` → `caylios`) — done from outside a session because it invalidates the working directory and the Claude project memory path.

## Slice log

- 2026-07-09 Slice 0 committed. (Session 1)
- 2026-07-09 Slice 1 committed: CayliosLogo replaces STSLogo; favicon/touch icon/title; sidebar mark + typographic CAYLIOS wordmark; BrandLogo fallback; retired STS assets deleted; asset-gaps.md created. In-app visual pass NOT done (only tests+build) — do a browser check of login, sidebar, tenant header, favicon when convenient. (Session 1)
- 2026-07-09 Slice 2 committed: SimpleTS/STS -> Caylios in all frontend strings/comments; sts-/--sts- class+token prefixes -> caylios-; storage keys simplets.* -> caylios.* (stored dev prefs reset once). (Session 1)
- 2026-07-09 Slice 3 committed: simplets.com.au -> caylios.com in tenancy default, .env.example, both fly.toml; simplets.sqlite3 -> caylios.sqlite3 (fresh local dev DB on next run); all backend test hosts updated; 107 backend tests pass. CAUTION: next Fly deploy needs caylios.com DNS + wildcard cert configured first, and STS_BASE_DOMAIN secret (if set) updated — fly.toml now says caylios.com. Env var NAMES unchanged (see slice 4b). Working venv is backend/venv (backend/.venv has broken compiled deps). (Session 1)
- 2026-07-09 Slice 4 committed: backend comments/titles (Caylios API), dev header X-STS-User -> X-Caylios-User (frontend+backend+tests+seed), README + deploy-fly + local-demo + licenses + docs/AGENTS.md rebranded. NOT done: PRD rename — docs/prd-sts-orchestration-platform.md is DELETED (uncommitted) in the working tree by the user; constitution.md still links to it. Awaiting user call: restore+rename, or drop the links. 107 backend + all frontend tests pass. (Session 1)
- 2026-07-09 Slice 5 committed: child AGENTS.md files (frontend/backend/demo/front-end-themes/ReGroup) rebranded; root AGENTS.md + constitution rebrand-status notes updated to "code done; folder + STS_* env vars + SVG assets outstanding". Folder rename runbook below. (Session 1)

## Repo folder rename (user-run, outside a Claude session)

1. Close all sessions/editors/terminals using the folder.
2. Rename `C:/Users/camer/Documents/simplets` → `C:/Users/camer/Documents/caylios` (Explorer, or `Rename-Item simplets caylios` in PowerShell from Documents).
3. Git is unaffected (remotes are URLs, not paths); update IDE recent-projects lists and any shortcuts.
4. Start a fresh Claude Code session in the new folder. Claude's project memory is keyed to the folder path, so it starts empty — point Claude at `docs/caylios/rebrand-plan.md` and it will re-anchor.
