# Caylios Asset Gaps

Tracks every app surface using an **interim** brand asset (PNG render extracted from `Brand Kit_V4.02.docx`) and what final asset is needed. Update this file whenever an interim asset is replaced or a new brand surface is added. Owner for final assets: Kylie (original exports, ideally SVG).

## App surfaces

| Surface | Current asset | Status | Final asset needed |
| --- | --- | --- | --- |
| Browser favicon (`frontend/index.html`) | `public/brand/caylios-favicon.png` (simplified logo icon, transparent) | Interim | SVG or multi-size ICO export of simplified logo icon |
| Apple touch icon (`frontend/index.html`) | `public/brand/caylios-touch-icon.png` (logo icon on Midnight Indigo) | Interim | 180×180+ export of logo icon on solid Midnight Indigo |
| Sidebar mark + wordmark (`App.tsx`) | `public/brand/caylios-logo-icon-transparent.png` + typographic CAYLIOS | Interim (mark) / Final (wordmark is typographic per brand kit) | SVG logo icon, transparent |
| Auth page lockup (`auth.tsx` via `CayliosLogo`) | `public/brand/caylios-logo-primary-transparent.png` | Interim | SVG primary logo, transparent |
| Tenant fallback logo (`BrandLogo.tsx`) | `public/brand/caylios-logo-icon-transparent.png` + typographic CAYLIOS (Midnight Indigo — sits on white surfaces) | Interim (mark) / Final (wordmark) | SVG logo icon, transparent |

## Known constraints

- All `caylios-*.png` files are docx-render quality (~430–1200 px). Adequate at current display sizes; replace with source exports before print/marketing reuse.
- The primary lockup and both transparent icon variants carry white/light elements — dark surfaces only. The app's platform chrome is Midnight Indigo/navy, so this holds today; any future light-surface placement needs the Midnight Indigo single-colour variants (already extracted in `docs/caylios/assets/`).
- Typeface gap: the brand wordmark spec is Montserrat; the app currently renders the sidebar CAYLIOS wordmark with `--font-heading`. If that token isn't Montserrat, either load Montserrat or accept the deviation deliberately.
- Icon Library: only 3 of ~28 approved icon concepts exist as assets (understand, improve, automate). In-app UI icons remain inline SVGs and are NOT Caylios Icon Library icons; replace progressively as the library is produced. Do not hand-build library icons (Icon Construction Standard governs).
- Shape legend drawings are not extractable from the Visual Language Guide .docx; canvas shape geometry follows `docs/basic_icons.drawio`.
- Retired STS assets were deleted from `frontend/public/brand/` (recoverable from git history). `regroup-logo.png` retained — demo tenant logo, not platform brand.
