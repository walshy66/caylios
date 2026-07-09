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
- [ ] **Slice 1 — Frontend brand assets + logo component.** Copy needed Caylios assets from `docs/caylios/assets/` into `frontend/public/brand/`; replace favicon (`index.html`, use `logo-icon-simplified-*`); rename `STSLogo.tsx` → `CayliosLogo.tsx` rendering the Caylios mark + typographic wordmark; update `BrandLogo.tsx` and all importers; update `index.html` title. Create `docs/caylios/asset-gaps.md` (surface → asset in use → interim/final → what's needed from Kylie). Old `sts-*.png` files in `public/brand/` deleted only when nothing references them. Verify: frontend tests + build + visual pass (login, sidebar, dashboard header, favicon) — watch white-on-white with reverse/transparent variants.
- [ ] **Slice 2 — Frontend strings + CSS tokens.** User-facing SimpleTS/STS → Caylios (App.tsx, auth, SettingsPage, FormsPage, IntakeFormPanel, ReviewQueuePanel, theme.ts, model files + their .test.mjs). Rename CSS token/class prefix `sts-`/`--sts-` → `caylios-`/`--caylios-` across `App.css` and all TSX referencing it (mechanical find/replace; ~126 refs in App.css). Verify: frontend tests + build + quick visual sanity.
- [ ] **Slice 3 — Backend domain + tenancy.** `simplets.com.au` → `caylios.com` in subdomain/tenancy logic (`app/tenancy.py`, `app/db.py`, `app/main.py`, `app/current_state.py`) and all backend tests (`test_workspace_isolation.py` has ~16 refs; also clerk_auth, approval_pipeline, oauth_tokens, current_state_maps, drive_datastore_gate, subscriber_roles, review_queue, document_uploads, workspace_access_model). Behavior-sensitive: subdomain-to-workspace routing is a mandatory test area — update fixtures and logic together, keep isolation tests meaningful. Verify: full backend pytest.
- [ ] **Slice 4 — Backend naming + repo docs sweep.** Remaining STS/SimpleTS words in backend (`app/auth.py`, `app/clerk.py`, `app/connectors.py`, `app/destinations.py`, `seed_demo.py`) — comments, messages, seed data names. README.md rebrand. Rename `docs/prd-sts-orchestration-platform.md` → `docs/prd-caylios-orchestration-platform.md` (fix inbound links: constitution.md, docs/AGENTS.md, README). Sweep remaining docs/ references where they state current identity (leave historical decision records as-is). Verify: backend pytest + grep sweep `SimpleTS|simplets|\bSTS\b` shows only intentional/historical remnants.
- [ ] **Slice 5 — Closeout.** Update root AGENTS.md rebrand-status note (docs+app done; folder rename pending/done), constitution rebrand-status line, `asset-gaps.md` final state. DOX pass over touched AGENTS.md files. Provide the user manual steps for the repo folder rename (`simplets` → `caylios`) — done from outside a session because it invalidates the working directory and the Claude project memory path.

## Slice log

- 2026-07-09 Slice 0 committed. (Session 1)
