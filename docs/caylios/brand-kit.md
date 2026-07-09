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

Official production exports (high-resolution PNG) live in [`assets/`](assets/) in three folders. These are the ONLY shippable logo artwork; the exports are used exactly as supplied.

- **[`assets/Logos/`](assets/Logos/)** — full lockups (icon + wordmark + accent line), 3750×3750:
  - `Caylios Logo.png` — full colour on solid Midnight Indigo.
  - `Caylios Logo_Transparent.png` — full colour, white wordmark, transparent — **dark surfaces only**.
  - `Caylios Logo_Midnight Indigo.png` — single-colour indigo, transparent — **the approved lockup for light/white surfaces**.
  - `Caylios Logo White.png`, `Caylios Logo_Digital Teal.png`, `Caylios Logo_Electric Mint.png` — approved single-colour variants.
- **[`assets/Logo Icons/`](assets/Logo%20Icons/)** — logo icons (apps, dashboard, social, favicons), 3200×3200: `Caylios_Icon.png` (on indigo), `_Transparent` (full colour), `_White`, `_Midnight Indigo`, `_Digital Teal`, `_Electric Mint`.
- **[`assets/Logo Icons Simple/`](assets/Logo%20Icons%20Simple/)** — simplified icons (favicons, small UI, low-res, embroidery): same variant set.

Hierarchy (use the most complete asset the application allows):

```text
Primary Logo → Wordmark → Logo Icon → Simplified Logo Icon
```

- **Primary logo** elements (icon, wordmark, accent line) must not be separated, rearranged, or modified.
- **Wordmarks** (standalone only, where the Brand Kit defines them): CAYLIOS in Montserrat Regular, ALL CAPS, line height 1.4, letter spacing 0 — White `#FFFFFF` on dark surfaces, Midnight Indigo `#150A32` on light surfaces. A typographic wordmark is never combined with the logo icon to imitate a lockup.

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

### No composition, no improvisation (binding)

- Never compose, combine, layer, trace, or generate brand elements into arrangements that do not exist as approved exports — including pairing the logo icon with typographic text to imitate a lockup.
- If no approved asset fits a surface: use the closest approved asset unmodified (e.g. the Midnight Indigo lockup on light surfaces), record the gap in [`asset-gaps.md`](asset-gaps.md), and escalate to the Directors. An improvised interim is never acceptable.
- New variants, derivative marks, or third-party use require Director approval and land in this kit before they land in code.

## Domains

- Primary domain: **caylios.com** (workspace subdomains e.g. `clientname.caylios.com`).
- `caylios.com.au` is planned but not yet active.
