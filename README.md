# Caylios

Caylios is a white-label client portal and workflow orchestration platform with a native, approval-gated workflow engine.

It helps professional services businesses stop double-handling data across multiple applications. End-clients submit information once through a branded portal; subscriber staff review and approve it; Caylios then distributes the approved data into the business systems the subscriber already uses.

## Product direction

Caylios is being built as an operational automation platform, not as a local coding-agent dashboard.

The core product promise is:

```text
Submit once → review once → distribute everywhere
```

Caylios acts as the front door for client data intake and the pipe between intake, review, and third-party systems. It is not intended to become a permanent client document archive or long-term PII database.

## Primary users

- **End-clients** — submit forms and documents through a branded portal.
- **Subscriber staff** — review, correct, approve, and monitor submitted data.
- **Subscriber admins** — manage users, connected apps, workflow configuration, and branding.
- **Caylios platform admins** — manage subscriber workspaces and platform operations.

## Core modules

1. **Workflows**  
   Subscribers configure how data moves through their business as native Caylios workflow definitions: an intake trigger, the mandatory review/approval gate, and destination steps with field mappings. A visual workflow builder (React Flow, matching the Current State canvas) is the planned configuration surface.

2. **Document Intake**  
   End-clients can upload digital documents such as invoices, PDFs, images, ATO notices, or supporting files. This is a core platform capability, but it is secondary to the first web-form intake slice.

3. **Data Extraction**  
   Caylios extracts, validates, normalises, and prepares structured data from intake sources. Initial work focuses on structured web-form submissions. Document extraction calls the Claude API directly from the backend extraction module.

4. **Data Distribution**  
   Caylios pushes approved data into connected third-party applications such as HubSpot, Google Drive, PandaDoc, Xero, Microsoft SharePoint/OneDrive, MYOB, and future client-specific systems.

## First golden path

The first product slice is:

```text
Branded web form intake → subscriber review/approval → third-party app distribution
```

This means the initial platform should allow a subscriber to:

- Provide a branded intake portal for their end-clients
- Capture structured data through a hardcoded first-client form
- Save in-progress draft state locally in the end-client browser for v1
- Show submitted data in a subscriber review queue
- Allow staff to correct fields before approval
- Push approved data into configured destination apps
- Track success, failure, retry state, and minimal audit metadata

Document upload and AI extraction remain part of the wider architecture, but the first end-to-end path is web-form data intake.

## Key product rules

- **Human approval is mandatory** before any data is written to destination systems.
- **No silent writeback** — destination failures must be visible, retryable, and must not lose submitted data.
- **Zero retention after completion** — once all destination pushes succeed, uploaded files and extracted/submitted field data are purged from STS storage.
- **Minimal audit only** — retain who approved, when approval happened, and which destinations received data; do not retain field values in the audit record.
- **Workspace isolation is mandatory** — each subscriber has isolated users, branding, workflows, connected apps, tokens, and data.
- **STS is a pipe, not a database** — store configuration and operational metadata, not long-term client PII or financial records.

## Platform architecture direction

Planned platform foundations:

- **Frontend:** React-based STS UI and branded client portal
- **Backend:** FastAPI service layer for STS-specific APIs and orchestration boundaries
- **Workflow engine:** Native — STS workflow definitions, connector adapters, and the approval-gated push framework in the FastAPI backend
- **Database:** Postgres for workspace configuration, workflow metadata, encrypted OAuth tokens, and minimal audit records
- **Auth:** Clerk for subscriber staff, end-clients, and platform admins
- **Hosting:** Fly.io, Sydney region, Docker-native deployment
- **Domains:** wildcard subscriber subdomains such as `clientname.simplets.com.au`
- **AI extraction:** Claude API called directly from the backend extraction module

## Workflow engine

Caylios owns workflow definition, visualization, and execution — there is no embedded third-party workflow engine. The approval gate, retention rules, and workspace isolation are enforced by the backend and are never delegated.

- **Connector adapters** (`backend/app/connectors.py`) — direct API integrations per provider, using workspace-scoped encrypted OAuth tokens.
- **Push framework** (`backend/app/destinations.py`) — pushes approved data to connected destinations with per-destination status, idempotent retry, and retain-until-resolved failure handling.
- **Workflow definitions** (planned) — workspace-scoped configuration of trigger, approval gate, and destination steps with field mappings, edited through a native visual builder with AI-suggested drafts.

## Initial connector priorities

For the first client/demo path, connector priority is:

1. **HubSpot** — contact and deal creation
2. **Google Drive** — folder creation and file storage
3. **PandaDoc** — onboarding document generation
4. **Xero** — contact and invoice creation

OAuth tokens must be stored encrypted per workspace, never exposed in API responses or logs, and refreshed or marked disconnected deliberately.

## Near-term scope

Included in the near-term direction:

- Fly.io deployment baseline
- Clerk authentication
- Workspace isolation and branded subdomain routing
- Hardcoded first-client intake form
- Subscriber review and approval screen
- Centralised OAuth token management
- HubSpot and Google Drive connector paths
- Zero-retention deletion behavior after successful approval/distribution

Planned but secondary:

- Digital invoice/document upload
- Claude-backed document extraction
- PandaDoc and Xero connector completion
- More advanced workflow templates
- Native visual workflow builder with AI-suggested workflow drafts

Out of scope for v1:

- Permanent document archive
- Auto-writeback without human approval
- Server-side draft storage for incomplete forms
- Drag-and-drop form builder
- Email ingestion
- Watched folder ingestion
- NAS/self-hosted subscriber deployment
- Real client PII in early demos

## Current build stance

This repository should be treated as a clean build toward the new Caylios platform direction.

The previous local AI coding-agent session dashboard has been removed from the codebase entirely and must not be reintroduced.

## Related planning docs

- [`docs/prd-sts-orchestration-platform.md`](docs/prd-sts-orchestration-platform.md) — current product PRD and implementation decisions

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run tests to verify setup:
   ```bash
   python -m pytest
   ```

5. Start the backend server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will typically run on `http://localhost:5173`

### Configuration

Before running the application, ensure you have the required environment variables set:

- **Backend**: Update `.env` files in `backend/` with Clerk API keys and other configuration
- **Frontend**: Update `.env` files in `frontend/` with API endpoints and Clerk configuration

### Running Tests

**Backend:**
```bash
cd backend
python -m pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

## Development notes

Local setup, package structure, and run commands should be updated as the clean build structure stabilises.
