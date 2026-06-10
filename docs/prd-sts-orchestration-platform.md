# PRD — STS Orchestration Platform

**Status:** Draft  
**Date:** 2026-06-07  
**Author:** Cameron Walsh  

---

## Problem Statement

Professional services firms (e.g. financial advisors, brokers) manually re-enter the same client data across multiple platforms — HubSpot, Xero, Google Drive, PandaDoc, MYOB, and others. This is slow, error-prone, and pulls staff away from high-value work.

Their clients (end-clients) currently have no single place to submit their information. Data arrives via email, paper forms, PDFs, and phone calls — each requiring manual processing and re-entry by staff.

STS solves this by being the front door: end-clients submit once, STS routes the data to every destination automatically.

---

## Solution

STS is a white-label client portal and workflow orchestration platform. Each STS subscriber (e.g. CoachCW) gets a branded subdomain (`clientname.simplets.com.au`). Their end-clients log in, fill in forms or upload documents (PDFs, images), an AI extracts and structures the data, the subscriber's staff review and approve, and STS pushes the data to all connected platforms in one action.

No data is stored in STS after completion. STS is a pipe, not a database.

---

## User Stories

### Priority 1 — End-client data intake

**As an end-client,** I want to log into a branded portal and fill in my details once, so that my advisor's team has everything they need without me being asked the same questions multiple times.

**As an end-client,** I want to upload a PDF or image of a document (e.g. invoice, ATO notice) and have the key fields extracted automatically, so I don't have to manually transcribe the data into a form.

**As an end-client,** I want to save a partially completed form and return to it later, so that I can gather information at my own pace.

### Priority 2 — Subscriber review and approval

**As a subscriber (e.g. CoachCW staff),** I want to review AI-extracted data before it is sent anywhere, so that I can catch errors and maintain compliance accountability.

**As a subscriber,** I want a single approval action to push confirmed data to all connected platforms simultaneously, so that my team never re-keys information.

**As a subscriber,** I want to see a minimal audit record of what was approved and when, so that I can demonstrate process compliance.

### Priority 3 — Workflow configuration

**As a subscriber,** I want to use a visual canvas to map which form fields go to which destination platform fields, so that I can configure automations without writing code.

**As a subscriber,** I want to connect my existing platforms (HubSpot, Xero, Google Drive, PandaDoc) via OAuth, so that STS can write to them on my behalf.

**As a subscriber admin,** I want to onboard with a credit card and start building workflows immediately, so that there is no sales friction blocking me from getting value.

### Priority 4 — Multi-tenant platform management

**As an STS platform admin,** I want each subscriber to have an isolated workspace with their own branding, users, connected apps, and workflows, so that data and config never bleed between clients.

---

## Implementation Decisions

### Hosting
- **Platform:** Fly.io (Docker-native PaaS, Sydney region)
- **Why Fly.io:** Native MCP server (FlyMCP) connects directly to Claude Code — infrastructure managed via natural language rather than dashboard UI. Sydney region serves Australian clients with low latency. Docker-native is a strong fit for Activepieces.
- **Subdomains:** Wildcard DNS `*.simplets.com.au` with wildcard SSL via Let's Encrypt. One subdomain provisioned per subscriber at onboarding.
- **Services:** FastAPI backend, React frontend, Postgres (Fly managed), Activepieces (self-hosted, forked)
- **Setup:** `fly mcp launch` connects Fly.io to Claude Code. Infrastructure managed via `flyctl` CLI and MCP rather than dashboard.

### Auth
- **Clerk** handles all authentication — subscriber admins, subscriber staff, and end-clients. Nothing custom built.

### Workflow Engine
- **Activepieces** (MIT licensed, forked) embedded invisibly inside the STS UI. Clients see STS branding only — Activepieces is never exposed. The fork allows branding customisation and feature control. Upstream changes merged manually as needed — keep customisations shallow (theming, feature flags) to keep merging clean.

### AI Extraction
- **Claude API** (claude-sonnet-4-6 or equivalent) implemented as a custom Activepieces piece called "STS Extract". Takes a file (PDF or image), returns structured JSON. Sits in the workflow canvas alongside connector pieces. End-user waits during extraction (~5–15s with loading state) — no background job queue needed.

### Data Policy
- **Zero retention after completion.** Uploaded files and extracted data are deleted after the subscriber approves and STS pushes to destinations.
- **Draft state** (in-progress forms) is stored in the end-client's browser (localStorage) for v1. No server-side draft storage in STS.
- **STS stores only:** workspace configuration, user accounts, encrypted OAuth tokens per workspace, workflow definitions. No client PII or financial data at rest.

### OAuth / Integrations
- STS registers one developer app per integration provider (HubSpot, Xero, Google, Microsoft, PandaDoc, MYOB, etc.).
- Each subscriber workspace stores its own OAuth tokens (encrypted in Postgres) obtained via a per-workspace consent flow.
- **Integration build priority for CoachCW (first client):**
  1. HubSpot — contact and deal creation (backbone of their workflow)
  2. Google Drive — folder creation and file storage
  3. PandaDoc — onboarding document generation
  4. Xero — contact and invoice creation

### Multi-tenancy
- Each subscriber is an isolated workspace: own users, own connected apps, own workflows, own branded subdomain.
- Subscriber staff roles: admin, reviewer, operator.
- Platform-level admin role for STS to manage all workspaces.

### Connector Framework
- Activepieces piece architecture used as the connector standard. Each integration is a piece. Custom pieces built for integrations not in Activepieces' library.
- Future connectors added without rebuilding the platform.

---

## Testing Decisions

### Core behaviors to verify

- End-client submits a form → data appears correctly structured in the subscriber's review queue
- End-client uploads a PDF → AI extracts fields → extracted data matches document content (accuracy check with synthetic test documents)
- Subscriber approves → data posts to HubSpot AND Google Drive simultaneously → both records confirmed created
- Subscriber approves → source file and extracted data are confirmed deleted from STS storage
- OAuth token refresh works transparently — failed token refresh surfaces as a clear error to subscriber admin, not a silent failure
- Subdomain routing — `clienta.simplets.com.au` serves only clienta's workspace; `clientb.simplets.com.au` serves only clientb's workspace

### Important failure cases

- AI extraction returns low-confidence or missing fields → reviewer is shown which fields need manual attention, not silently passed through
- Destination API (e.g. HubSpot) returns an error on push → subscriber is shown a clear error, data is not lost, push can be retried
- End-client's browser storage is cleared mid-form → clear UX message that draft was not saved server-side
- OAuth token is revoked by the subscriber's platform admin → connector shows disconnected state, workflows using it are paused not silently failed

---

## Out of Scope

- Permanent document archive in STS
- Auto-writeback without human approval
- STS-hosted draft storage (v1 — browser only)
- AI-assisted form schema suggestion (v1 — forms built manually for first client)
- Self-serve form builder with drag-and-drop (v1 — forms hardcoded per client)
- Email ingestion as an intake channel
- Watched folder ingestion (Google Drive / SharePoint auto-trigger)
- NAS or self-hosted deployment option for subscribers
- Billing and product tier management beyond Clerk-gated access
- Xero App Partner program application (needed at 25+ connected Xero orgs — not a day-one blocker)
- MYOB developer partner program (same — build first, apply when ready)
- Hermes or any other deterministic workflow engine
- Real client PII in first demo

---

## Further Notes

### First milestone (proof of life)
Before building the canvas, branding, or multi-tenant infrastructure — validate the core pipe works:

1. Activepieces running locally (unfork, just running)
2. Hardcoded test workflow: static JSON → HubSpot sandbox → contact created
3. Replace static JSON with Claude extraction from a test intake form PDF
4. Add a minimal STS approval screen before the push
5. Wire Clerk auth around it

If this works, everything else is product on top of a proven pipe.

### Developer registrations to complete immediately
- HubSpot Developer Portal
- Google Cloud Console (Drive API + OAuth)
- Xero Developer (developer.xero.com) — sandbox available immediately, 25 org limit before partner review
- PandaDoc Developer
- Microsoft Azure AD app registration (for SharePoint/OneDrive)
- MYOB Developer Portal

### Domain / infra to set up immediately
- Register `simplets.com.au` (and `.com` if available)
- Configure wildcard DNS `*.simplets.com.au` pointing to Railway
- Provision wildcard SSL cert

### Cost estimate
| Line item | Month 1 | Month 12 |
|---|---|---|
| Fly.io (API + DB + Activepieces + frontend, Sydney) | ~$20 | ~$55 |
| Claude API (~$0.005/extraction) | ~$5 | ~$60 |
| Temporary file storage (S3) | ~$1 | ~$5 |
| Clerk (auth) | Free–$25 | ~$50 |
| **Total** | **~$30–55** | **~$175** |
