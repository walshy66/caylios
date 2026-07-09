# Caylios Asset Gaps

Tracks brand-asset coverage per app surface and what is still needed from the brand owner (Kylie). Rules: only Director-approved exports ship, used exactly as supplied — see the "No composition, no improvisation" section of [`brand-kit.md`](brand-kit.md). When a surface has no suitable approved asset, it is recorded here and escalated; nothing is improvised.

## App surfaces (all using official exports as of 2026-07-09)

| Surface | Asset (from `docs/caylios/assets/`) | Status |
| --- | --- | --- |
| Browser favicon (`frontend/index.html`) | `Logo Icons Simple/Caylios Icon Simple_Transparent.png` → `public/brand/caylios-favicon.png` | Official export |
| Apple touch icon (`frontend/index.html`) | `Logo Icons/Caylios_Icon.png` (solid indigo) → `public/brand/caylios-touch-icon.png` | Official export |
| Sidebar (`App.tsx`) | Full lockup, theme-swapped between two approved variants: `Logos/Caylios Logo_Midnight Indigo.png` (light theme) / `Logos/Caylios Logo_Transparent.png` (dark theme) | Official exports |
| Auth page (`auth.tsx` via `CayliosLogo` full) | `Logos/Caylios Logo_Transparent.png` (navy card) | Official export |
| Tenant fallback (`BrandLogo.tsx`, white hero card) | `Logos/Caylios Logo_Midnight Indigo.png` | Official export |
| `CayliosLogo` mark variant | `Logo Icons/Caylios Icon_Transparent.png` → `public/brand/caylios-icon.png` | Official export |

## Remaining requests (nice-to-have, nothing blocked)

- **SVG masters** of the lockup, logo icons, simplified icons, and Icon Library — PNGs are high-res (3200–3750px for logos/icons) and fine for the app; SVG only matters for future print/embroidery, payload size, and vector handoff.
- **Multi-size favicon.ico** (16/32/48) — current single PNG favicon is acceptable.
- **Icon Library implementation mapping**: the approved PNG Icon Library now exists in canonical source location `icon and shape library/` (31 production-usable assets covering the approved concepts), but app/runtime copies and usage mapping should be documented wherever the application consumes them.
- **Shape legend drawings** are not available as standalone extracted assets from the Visual Language Guide .docx or `assets/`; canvas geometry follows `docs/basic_icons.drawio`.

## History

- 2026-07-10: approved PNG Icon Library supplied in `assets/icon and shape library/`; concept coverage gap partially closed, with SVG/vector masters, app usage mapping, and standalone shape assets still outstanding.
- 2026-07-09: official export folders (`Logos/`, `Logo Icons/`, `Logo Icons Simple/`) supplied by Kylie; all interim docx-render assets replaced and deleted; an earlier non-compliant icon+text composition was removed and the no-composition rule made binding in the constitution and brand kit.
