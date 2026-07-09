# Caylios Brand Kit — Developer Contract

> Source: `Brand Kit_V4.02.docx` (V4.02, distributed to Directors 8 July 2026, by Kylie Stewart).
> The .docx is the human-authored source of truth; update this file when a new version lands.
> This file is the canonical developer-facing brand contract for platform-owned experiences.
> It supersedes `docs/branding/brand-kit.md` (Simple Technology Solutions — retired brand).

## Document precedence

The Brand Kit defines **identity and naming**. The [Visual Language Guide](visual-language.md) defines **execution** (layouts, components, icons, diagrams). Where they overlap, the Brand Kit wins on identity and naming; the Visual Language Guide wins on execution.

## Brand name

- The brand name is **Caylios** — always a single word, never abbreviated, never an acronym.
- Pronunciation: **CAL-ee-oss**.
- Two casing forms:
  - **CAYLIOS** (visual identity form) — logo, wordmark, headers/UI elements where the brand is a mark, standalone identifiers (slide titles, dashboard headers, section headers).
  - **Caylios** (written language form) — body text, descriptions, documentation narrative, conversational content.
- Derivation (internal narrative only, not customer-facing): Cameron (Ca) + Kylie (yli) + Operating System (OS) — people + systems.
- Brand assets are proprietary IP; trademark registration is intended. Variations or derivative marks require Director approval.

## Brand foundation

- **Tagline / primary expression:** Make Work Simple
- **Strategic brand idea:** Every business has hidden capacity. Caylios unlocks it.
- **Core message:** Unlock hidden capacity by removing operational friction and improving how work moves through a business.
- **Elevator pitch:** We help businesses unlock hidden capacity by removing operational friction and redesigning how work moves through their business. This gives teams more time, more control, and the ability to scale without increasing workload.
- **Three-layer value system:** Hidden Capacity (strategic insight) → Make Work Simple (operational approach) → Unlocking Hidden Capacity (outcome).
- Caylios is platform-led; while the platform is in development, a structured delivery model implements operational improvements and informs platform development.

## Messaging pillars

Hidden Capacity · Operational Friction · Movement of Work · Scalability · Clarity & Control

## Voice

- We sound: clear and direct, simple language, human tone.
- We do NOT sound: buzzword heavy, overly technical, corporate jargon, abstract or vague.
- Personality: practical, clear, professional, reliable, straightforward, modern, minimal, clean, streamlined.

## Colour palette

| Hierarchy | Colour | Hex | Usage |
| --- | --- | --- | --- |
| Primary | Midnight Indigo | `#150A32` | Leads all core branding elements (logos, headers, key identity areas). Stability, depth, reliability. |
| Secondary | Digital Teal | `#20B4C9` | Structure, sections, secondary emphasis. Clarity, intelligence, approachability. |
| Accent | Electric Mint | `#15F5BA` | Reserved for CTAs, highlights, key points of focus. Energy, efficiency, transformation. Use sparingly. |
| Neutral | White | `#FFFFFF` | Default background. Simplicity, readability, contrast. |

## Typography

- **Primary typeface: Montserrat** — logo, headings, key messaging, emphasis.
- **Secondary typeface: Calibri** — body text, longer-form and instructional content.

| Element | Typeface | Weight | Size | Spacing |
| --- | --- | --- | --- | --- |
| H1 | Montserrat Black | Bold | 36–44pt | 18pt above / 6pt below; section divider |
| H2 | Montserrat | Bold | 24–30pt | 12pt above / 6pt below |
| H3 | Montserrat | Medium | 18–22pt | 6pt above / 6pt below |
| Body | Calibri | Regular | 11pt | 6pt above / 6pt below |
| Captions/notes | Calibri | Regular | 11pt | 6pt above / 6pt below |
| Table headings | Calibri | Bold | 11pt | 6pt above / 6pt below |
| Table rows | Calibri | Regular | 11pt | 3pt above / 3pt below |

Rules: use the lower end of size ranges for dense documents, higher end for presentations/marketing. No additional heading levels. No additional fonts without approved business need. Prioritise clarity over styling.

## Logo system

Assets extracted from the Brand Kit are in [`assets/`](assets/). These are PNG renders suitable for reference and documentation; production app assets (favicons, headers) should come from original exports (ideally SVG) when the app rebrand happens.

Hierarchy (use the most complete asset the application allows):

```text
Primary Logo → Wordmark → Logo Icon → Simplified Logo Icon
```

- **Primary logo** = icon + wordmark + horizontal accent line; elements must not be separated, rearranged, or modified.
  - [`logo-primary.png`](assets/logo-primary.png) — full colour on Midnight Indigo (website, platform, proposals, presentations, marketing).
  - [`logo-primary-transparent.png`](assets/logo-primary-transparent.png) — preferred wherever the application controls the background (wordmark is white — invisible on white).
  - [`logo-reverse-white.png`](assets/logo-reverse-white.png) — all-white, for dark backgrounds (invisible on white).
  - Single-colour variants: [`logo-midnight-indigo.png`](assets/logo-midnight-indigo.png), [`logo-digital-teal.png`](assets/logo-digital-teal.png), [`logo-electric-mint.png`](assets/logo-electric-mint.png).
- **Logo icons** (where the full logo is impractical — apps, dashboard, favicons, social): `logo-icon-primary.png`, `logo-icon-transparent.png`, `logo-icon-reverse-white.png`, `logo-icon-midnight-indigo.png`, `logo-icon-digital-teal.png`, `logo-icon-electric-mint.png`.
- **Simplified logo icons** (favicons, small UI, low-res, embroidery/engraving): `logo-icon-simplified-*.png` in the same six variants.
- **Wordmarks** are typographic, not image assets: CAYLIOS in Montserrat Regular, ALL CAPS, line height 1.4, letter spacing 0 — White `#FFFFFF` on dark surfaces, Midnight Indigo `#150A32` on light surfaces.

### Primary logo colour anatomy

| Element | Colour | Hex |
| --- | --- | --- |
| Inner circle | Electric Mint | `#15F5BA` |
| Middle circle | Digital Teal | `#20B4C9` |
| Outer circle | Electric Mint (neon effect) | `#15F5BA` |
| Diagonal elements | Electric Mint | `#15F5BA` |
| Horizontal accent line | Digital Teal | `#20B4C9` |
| Wordmark | White | `#FFFFFF` |

### Logo usage rules

- Use only approved assets; respect the built-in clear space.
- Do not stretch, distort, rotate, redraw, or recreate any logo element.
- Do not alter colours outside the approved palette; no gradients, shadows, glows, outlines, or effects.
- Single-colour assets must use one colour for all elements (White, Midnight Indigo, Digital Teal, or Electric Mint) — never recolour individual elements.
- Use the version with the greatest clarity and contrast for the application; use simplified icons where small sizes or production methods require reduced detail.

## Domains

- Primary domain: **caylios.com** (workspace subdomains e.g. `clientname.caylios.com`).
- `caylios.com.au` is planned but not yet active.
