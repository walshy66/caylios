# Caylios Constitution (v0.3.0)

## Purpose, Users & Scope

Caylios (formerly SimpleTS) is a white-label client portal and workflow orchestration platform for professional services businesses. Its strategic idea: every business has hidden capacity — Caylios unlocks it by removing operational friction and improving how work moves through a business. Tagline: Make Work Simple.

Its product promise is:

```text
Submit once → review once → distribute everywhere
```

Caylios helps subscribers stop double-handling client data across multiple business applications. End-clients submit information once through a branded portal; subscriber staff review and approve it; Caylios distributes the approved data to configured third-party systems.

Rebrand status: docs and application code are renamed to Caylios (`docs/caylios/rebrand-plan.md`). Remaining: repo folder name and the `STS_*` env var family (coordinated rename; deployed secrets depend on the old names). Where `STS_*` appears in configuration it refers to the Caylios platform.

### Primary users

- **End-clients** — submit forms and documents through a branded subscriber portal.
- **Subscriber staff** — review, correct, approve, and monitor submitted data.
- **Subscriber admins** — manage users, connected apps, workflow configuration, and branding.
- **Caylios platform admins** — manage workspaces and platform operations.

### Scope of this repo

This repository governs the Caylios operational platform, including:

- Branded subscriber portals on workspace subdomains.
- Structured web-form data intake.
- Subscriber review and approval flows.
- Native workflow definition and execution (approval-gated distribution).
- Third-party connector configuration and data distribution.
- OAuth token lifecycle management.
- Workspace isolation and role-based access control.
- Zero-retention data deletion after successful completion.
- Minimal audit records for compliance and operations.

The previous local AI coding-agent dashboard direction is obsolete and MUST NOT guide new product, architecture, or implementation decisions.

---

## Design Philosophy

The Caylios Philosophy ([`docs/caylios/philosophy.md`](docs/caylios/philosophy.md)) is the thinking behind this constitution. Where a decision needs a tiebreaker, the philosophy supplies the default direction; this constitution supplies the binding rules. Its core stances:

- **Make Work Simple** — every system, process, and interaction should reduce the effort required to complete meaningful work.
- **Simplicity Before Complexity** — the simplest solution that achieves the required outcome is preferred; complexity must earn its way in with clear, measurable value.
- **One Source of Truth** — information has one authoritative location; duplication creates uncertainty. (Grounds Principle II: pipe, not a database.)
- **Design for Reuse** — create once, reuse many times, before building anything new.
- **Keep the Human in Control** — people remain accountable for outcomes; technology increases visibility and confidence without removing ownership. (Grounds Principle III: human approval before writeback.)
- **Everything Should Earn Its Place** — every feature, field, workflow, and report exists because it creates value; otherwise simplify or remove it.

---

## Core Principles

### I. Submit Once, Review Once, Distribute Everywhere (NON-NEGOTIABLE)

Every feature MUST reduce duplicate data entry, simplify client intake, or improve safe data distribution.

Work MUST anchor to an explicit user journey and observable success criteria. Features that add complexity without improving intake, review, distribution, reliability, or configuration are out of scope unless explicitly approved.

---

### II. Caylios Is a Pipe, Not a Database (NON-NEGOTIABLE)

Caylios MUST NOT become a permanent store for end-client PII, financial data, or uploaded documents.

Caylios MAY store:

- Workspace configuration.
- User/account metadata required for access control.
- Workflow definitions and mappings.
- Encrypted OAuth tokens scoped to a workspace.
- Operational execution status.
- Minimal audit records.

Caylios MUST purge submitted field data, extracted data, and uploaded source files after successful approval and distribution to all required destinations.

Minimal audit records MUST NOT include submitted field values, extracted values, document contents, or raw PII/financial data.

---

### III. Human Approval Before Writeback (NON-NEGOTIABLE)

No client-submitted or AI-extracted data may be written to a destination system without explicit subscriber approval.

- Auto-writeback is prohibited for v1.
- Reviewer corrections MUST be captured before approval.
- Approval MUST be attributable to a user, timestamp, workspace, and destination set.
- If any destination push fails, data MUST NOT be deleted until the failure is resolved or explicitly discarded by an authorised user.

---

### IV. Workspace Isolation & Tenant Boundaries (NON-NEGOTIABLE)

Each subscriber workspace is an isolation boundary.

Workspace-scoped data includes:

- Users and roles.
- Branding and subdomain configuration.
- Forms, workflows, mappings, and connector configuration.
- OAuth tokens and connector state.
- Intake submissions, review queues, execution state, and audit records.

All backend reads and writes MUST be workspace-scoped. A user authenticated to workspace A MUST NOT be able to access workspace B data through UI state, API parameters, connector configuration, subdomain routing, or workflow execution.

Subdomain routing such as `clientname.caylios.com` MUST resolve to exactly one workspace.

---

### V. Backend Authority & Explicit Failure Semantics (NON-NEGOTIABLE)

The backend is the authority for workspace scoping, role permissions, approval state, deletion state, connector state, and workflow execution boundaries.

The frontend MUST NOT infer, repair, bypass, or silently override backend authority.

- Unauthenticated requests MUST return 401.
- Authenticated users without permission MUST return 403.
- Validation errors MUST NOT return 403.
- Invariant violations MUST fail explicitly with structured errors.
- Silent fallback, partial success, or best-guess behavior is prohibited for approval, deletion, authorization, and connector execution.

---

### VI. Caylios Brand Hierarchy

Caylios branding, as defined in [`docs/caylios/brand-kit.md`](docs/caylios/brand-kit.md) (identity/naming) and executed per [`docs/caylios/visual-language.md`](docs/caylios/visual-language.md), is the authoritative default for platform-owned experiences. Where the two documents overlap, the Brand Kit wins on identity and naming; the Visual Language Guide wins on execution.

Workspace/client branding may override only in tenant-branded contexts and must not weaken platform authority, data safety, approval, retention, or workspace isolation rules.

The Caylios name is used per the Brand Kit casing rules (CAYLIOS as a visual mark, Caylios in prose) and is never abbreviated.

Brand assets are immutable (NON-NEGOTIABLE):

- Only Director-approved exports in `docs/caylios/assets/` may ship. Brand elements MUST NOT be redrawn, traced, recoloured, restyled, generated, or composed into arrangements that do not exist as approved exports — including combining the logo icon with text to imitate a lockup.
- If no approved asset fits a surface, the closest approved asset is used unmodified, the gap is recorded in `docs/caylios/asset-gaps.md`, and the Directors are asked for a proper export. Improvised interims are prohibited; a surface without a suitable approved asset ships without brand art rather than with invented brand art.
- The brand does not drift: any new variant enters the Brand Kit by Director approval before it enters this repository.

---

### VII. Caylios Owns the Workflow Engine

Workflow definition, visualization, and execution are native Caylios capabilities. No third-party workflow engine (embedded, forked, or hosted) may sit between approval and distribution, because the approval gate, retention rules, and workspace isolation are enforced by the Caylios backend and MUST NOT be delegated.

- A workflow definition is workspace-scoped configuration: a trigger (intake source), the mandatory human approval gate, and destination steps with field mappings.
- The approval gate is structural — workflow definitions MUST NOT be able to express a path from intake to destination that bypasses review.
- Connectors are first-class Caylios adapters: direct API integrations owned in this repo, each declaring its provider, OAuth scopes, actions, and field schema.
- Execution is the Caylios push framework: per-destination status, safe retry, and retain-until-resolved failure handling.
- Workflow-engine scope MUST stay minimal: no general-purpose DAG engine, scheduler, or queue infrastructure unless an explicit product requirement justifies it.

---

### VIII. OAuth, Secrets & Connector Safety (NON-NEGOTIABLE)

Connector credentials are security-critical infrastructure.

- OAuth tokens MUST be encrypted at rest and scoped to a workspace.
- Raw tokens MUST NOT appear in logs, API responses, UI output, comments, test snapshots, or error payloads.
- Token refresh MUST be handled deliberately.
- Revoked or invalid tokens MUST surface as a disconnected connector state.
- Workflows depending on disconnected connectors MUST pause or fail visibly; they MUST NOT silently continue.
- Destination API failures MUST be visible, retryable where safe, and must not cause data loss.
- Retries MUST be deterministic and must not create duplicate destination records unless idempotency rules explicitly allow it.

Secrets MUST stay out of source control.

---

### IX. Test-First Reliability

New behavior SHOULD begin with failing automated tests. For high-risk platform behavior, tests are mandatory before merge.

Mandatory test areas:

- Workspace isolation and cross-workspace access denial.
- Role-based authorization.
- Human approval gating before writeback.
- Data deletion after successful distribution.
- Retention when destination distribution fails.
- OAuth token encryption/non-exposure.
- Connector revoked/disconnected states.
- Subdomain-to-workspace routing.
- Workflow execution success/failure status.

Bug fixes MUST include regression tests when the bug affected data safety, authorization, deletion, connectors, workflow execution, or tenant isolation.

---

### X. Observability & Operational Recovery

Data movement must be observable, auditable, and recoverable.

Changes that affect intake, approval, workflow execution, connectors, deletion, or auth MUST include meaningful logs and clear error states.

Operational records SHOULD answer:

- Which workspace initiated the run?
- Which user approved it?
- Which destinations were targeted?
- Which destinations succeeded or failed?
- Whether data was retained, deleted, or awaiting retry/discard?

Logs MUST NOT include raw PII, submitted field values, uploaded document contents, or OAuth tokens.

---

### XI. Incremental, Releasable Slices

Work MUST be broken into independently valuable slices that can be tested and demonstrated.

The first golden path is:

```text
Branded web form intake → subscriber review/approval → third-party app distribution
```

Document upload, OCR/extraction, advanced workflow templates, and broader connector coverage are valid platform capabilities, but they MUST NOT derail the first end-to-end web-form intake path unless explicitly reprioritised.

---

## Infrastructure & Stack Authority

The current platform direction is:

- **Frontend:** React-based Caylios UI and branded client portal.
- **Backend:** FastAPI service layer for Caylios-specific APIs and orchestration boundaries.
- **Workflow engine:** native — Caylios workflow definitions, connector adapters, and the approval-gated push framework in the FastAPI backend.
- **Database:** Postgres for workspace configuration, workflow metadata, encrypted OAuth tokens, execution metadata, and minimal audit records.
- **Auth:** Clerk for subscriber staff, end-clients, and platform admins.
- **Hosting:** Fly.io, Sydney region, Docker-native deployment.
- **Domains:** `caylios.com` with wildcard subscriber subdomains such as `clientname.caylios.com`. (`caylios.com.au` is planned but not yet active; the former `simplets.com.au` is retired.)
- **AI extraction:** Claude API called directly from the backend extraction module.

Major deviations from this stack MUST be documented before implementation.

---

## Connector Priority

Initial connector priority is:

1. HubSpot — contact and deal creation.
2. Google Drive — folder creation and file storage.
3. PandaDoc — onboarding document generation.
4. Xero — contact and invoice creation.

Additional connectors are allowed when they support a real subscriber workflow and follow the OAuth, isolation, testing, and observability rules above.

---

## UI & Product Experience Requirements

- Subscribers and end-clients MUST experience the product as Caylios; third-party tooling MUST NOT be visible in the product experience.
- Subscriber portals MUST support workspace branding.
- Review screens MUST make flagged, missing, low-confidence, or failed fields obvious.
- Approval actions MUST be explicit and hard to trigger accidentally.
- Destination failures MUST be understandable and actionable by subscriber staff/admins.
- Accessibility and keyboard usability SHOULD be considered from the first implementation, especially for forms, review queues, and approval actions.

---

## Documentation & Review Discipline

Before implementation, feature work SHOULD identify:

- The user journey it supports.
- The workspace/role boundary involved.
- Whether submitted data, documents, tokens, or audit records are affected.
- The deletion/retention behavior.
- The connector failure behavior.
- The tests required for data safety and authorization.

Before merge, review MUST confirm:

- The implementation matches the README, PRD, Linear issue, and this constitution.
- Workspace isolation is preserved.
- Backend authority is preserved.
- No secrets or raw tokens are exposed.
- No long-term PII/financial data retention was introduced unintentionally.
- Required tests were added and run.

Intentional deviations from this constitution MUST be documented with rationale and approved before implementation.

---

## Related Documents

- [`README.md`](README.md) — project overview and build direction.
- [`docs/caylios/philosophy.md`](docs/caylios/philosophy.md) — the 15 Caylios design principles behind this constitution.
- [`docs/caylios/brand-kit.md`](docs/caylios/brand-kit.md) — canonical brand contract: naming, messaging, palette, typography, logo system.
- [`docs/caylios/visual-language.md`](docs/caylios/visual-language.md) — visual execution: layout, hierarchy, diagrams, shape legend, icons, components.
- [`docs/caylios/icon-standard.md`](docs/caylios/icon-standard.md) — icon construction rules.
