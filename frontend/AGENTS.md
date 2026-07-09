# Frontend AGENTS.md

## Purpose

React/Vite Caylios user interfaces for branded intake, subscriber review/approval, dashboards, auth-aware views, and native workflow pages.

## Ownership

Owns frontend source in `src/`, Vite/TypeScript config, frontend Docker/Fly files, and frontend model tests.

## Local Contracts

- Do not infer, repair, or bypass backend authority for auth, workspace scope, approval, deletion, connector, or workflow state.
- Surface distribution and connector failures visibly.
- Use `docs/caylios/brand-kit.md` as the canonical Caylios platform brand: Caylios logo assets, Midnight Indigo/Digital Teal/Electric Mint palette, Montserrat headings, and Calibri-first body text.
- Preserve a clear seam for future workspace/client theme overrides; tenant logos may override STS only in workspace-branded contexts.
- Do not reintroduce obsolete coding-agent dashboard direction.
- Do not create permanent archive UX for client PII or submitted field values.

## Work Guidance

- Keep behavior in testable model modules where possible.
- Use synthetic/demo data only.
- The Clients page owns the subscriber/operator invoice ingestion entry point: client assignment, document import, extracted-field review, and approve/cancel/retry actions before connector distribution.
- Preserve accessibility and responsive behavior when changing screens.
- Current State UI must treat only Draft maps as editable; Approved/Archived states come from backend and must not be bypassed client-side.
- Form editor work starts as a mock-backed, real-route prototype: template-first creation, vertical canvas, connector chips/mapping review, form-level confirmation, and draft-to-publish UX before backend persistence.
- `src/components/CanvasShapes.tsx` is the shared canvas foundation (shape geometry, rename-in-place, four-sided handles, labelled edges) for both the Current State and Workflows canvases — improve it there, not per-page; canvases use React Flow with `ConnectionMode.Loose`.
- Workflows canvas v1 persists drafts to localStorage via `workflowCanvasModel.ts`; its load/save seam is where backend workflow definitions will plug in. No approval/lifecycle semantics client-side until the backend owns them.

## Verification

```bash
cd frontend
npm test
npm run build
```

## Child DOX Index

- `src/` — React app, API client, auth integration, UI models, tests, and components.
