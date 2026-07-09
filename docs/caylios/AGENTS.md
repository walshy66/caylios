# Caylios Brand & Philosophy AGENTS.md

## Purpose

Canonical Caylios brand, philosophy, and visual-system documentation: who and what the product is, and how it looks and communicates.

## Ownership

Owns the four source .docx documents, their distilled markdown contracts, and extracted brand assets in `assets/`.

## Local Contracts

- The .docx files are the human-authored source of truth (maintained outside the repo by the Directors); the markdown contracts are the binding developer-facing distillations. When a new .docx version lands, update the matching markdown file and its version header in the same pass.
- Document precedence: Brand Kit → Visual Language Guide → Icon Construction Standard → Icon Library. The Brand Kit wins on identity/naming; the Visual Language Guide wins on execution.
- `brand-kit.md` here is the canonical developer-facing brand contract. It supersedes `docs/branding/brand-kit.md` (retired Simple Technology Solutions brand).
- Naming: the brand is **Caylios** (pronounced CAL-ee-oss), never abbreviated. Use **CAYLIOS** as a visual mark / standalone identifier; **Caylios** in prose.
- Brand colours: Midnight Indigo `#150A32` (primary), Digital Teal `#20B4C9` (secondary), Electric Mint `#15F5BA` (accent, CTAs only), White `#FFFFFF` (neutral). Same palette as the retired STS brand — existing frontend tokens carry over.
- Domain: `caylios.com` (workspace subdomains `clientname.caylios.com`); `caylios.com.au` planned, not yet active.
- `assets/` holds the official production logo exports in `Logos/`, `Logo Icons/`, and `Logo Icons Simple/` (high-res PNG, Director-approved), plus the approved production-usable PNG Icon Library in `icon and shape library/` and supporting graphic renders. The three logo folders are the only shippable logo artwork.
- Brand assets are immutable: never redraw, trace, recolour, restyle, generate, or compose brand elements into arrangements that don't exist as approved exports (e.g. icon + text imitating a lockup). No approved asset fits? Use the closest approved one unmodified, log the gap in `asset-gaps.md`, escalate to the Directors. Never improvise an interim.

## Work Guidance

- Keep the markdown contracts faithful to their source .docx — distill, don't editorialise.
- The shape legend in `visual-language.md` governs the shared canvas foundation (`frontend/src/components/CanvasShapes.tsx`); canvas shape changes must stay consistent with it.

## Verification

Cross-check markdown contracts against their source .docx version headers; check `constitution.md` and root `AGENTS.md` for contradictions.

## Child DOX Index

No child AGENTS.md files.

## Contents

- `philosophy.md` — the 15 Caylios design principles (source: Philosophy_V0.01.docx).
- `brand-kit.md` — identity, naming, messaging, palette, typography, logo system (source: Brand Kit_V4.02.docx).
- `visual-language.md` — layout, hierarchy, diagrams, shape legend, icon system, components, templates (source: Visual Language Guide_V1.0.docx).
- `icon-standard.md` — icon construction rules (source: Icon Construction Standard_V1.0.docx).
- `assets/` — extracted logo system (full/icon/simplified × colour variants), approved PNG Icon Library, and supporting graphic renders.
