# Frontend AGENTS.md

## Purpose

React/Vite SimpleTS user interfaces for branded intake, subscriber review/approval, dashboards, auth-aware views, and embedded workflow access.

## Ownership

Owns frontend source in `src/`, Vite/TypeScript config, frontend Docker/Fly files, and frontend model tests.

## Local Contracts

- Do not infer, repair, or bypass backend authority for auth, workspace scope, approval, deletion, connector, or workflow state.
- Surface distribution and connector failures visibly.
- Keep UI white-labeled as SimpleTS; do not reintroduce obsolete coding-agent dashboard direction.
- Do not create permanent archive UX for client PII or submitted field values.

## Work Guidance

- Keep behavior in testable model modules where possible.
- Use synthetic/demo data only.
- Preserve accessibility and responsive behavior when changing screens.

## Verification

```bash
cd frontend
npm test
npm run build
```

## Child DOX Index

- `src/` — React app, API client, auth integration, UI models, tests, and components.
