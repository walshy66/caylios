# Caylios Visual Language Guide — Developer Contract

> Source: `Visual Language Guide_V1.0.docx` (V1.0 FINAL with exception of examples, distributed to Directors, by Kylie Stewart).
> The .docx is the human-authored source of truth; update this file when a new version lands.
> In conflict, the [Brand Kit](brand-kit.md) takes precedence (identity/naming); this guide owns execution.

## Design principles

- **Clarity First** — every visual element must make information easier to understand; if it doesn't improve comprehension, remove it.
- **Structure Before Styling** — layout, alignment, and hierarchy communicate more than decorative styling.
- **Hierarchy Is Non-Negotiable** — the most important information is immediately obvious through placement, size, and spacing.
- **Consistency Creates Confidence** — reuse familiar layouts, components, and patterns.
- **Function Before Aesthetics** — design supports communication, not decoration.
- **Technology Without Theatre** — represent AI/automation as enabling systems, not the primary visual identity.
- **Reduce Cognitive Load** — present only what's needed to understand the message.
- **Design For Reuse** — reusable components before one-off designs.
- **Everything Earns Its Place** — every icon, shape, colour, line, and component must improve communication.
- **Familiar meaning. Consistent execution.** — leverage established visual conventions; distinguish Caylios through consistent construction, not reinvention.

## Layout system

- All layouts sit on a consistent column grid; align everything to it; consistent margins; no arbitrary positioning.
- Spacing communicates relationships, grouping, separation, and hierarchy — never filler.
- Left alignment is the default; avoid centre alignment for body content; no floating elements.
- White space is an active element: separates ideas, improves readability, strengthens hierarchy.

Layout types: Single Column (reports/policies) · Two Column (comparisons) · Three Column (feature summaries/marketing) · Dashboard (metrics/visibility) · Feature Layout (web/presentations) · Timeline (sequential) · Process Layout (workflow explanation).

Every layout: one primary message, clear hierarchy, minimal clutter, predictable, reusable.

## Information hierarchy

- **Level 1 — Primary message**: the single most important idea; immediately attracts attention.
- **Level 2 — Supporting information**: expands/explains without competing.
- **Level 3 — Detail**: evidence, examples, notes, once the primary message lands.

Visual priority order: **Position → Size → Spacing → Weight → Colour**. Group related information (proximity, spacing, containers, alignment). Disclose complexity progressively: summary → explanation → detail.

Hierarchy test: primary message understood in under 5 seconds; next level obvious; nothing competes; unnecessary detail removable.

## Diagram standards

Diagrams exist to simplify complexity, not increase it. Every diagram: simple, structured, consistent (approved shapes/icons/connectors only), reusable.

- One primary concept per diagram; clearly defined starting point; obvious reading direction; grouped related elements; minimal connector crossings; consistent spacing; aligned to the grid.
- Flow direction: **Left → Right** for operational workflows; **Top → Bottom** for hierarchies; **Circular** for lifecycles; **Hub → Spoke** for platform relationships. Never change reading direction mid-diagram.
- Connectors: consistent line weight, minimal bends and crossings, equal spacing, arrowheads only when direction matters.
- Labels: concise, consistent terminology, no sentences.
- Diagram test: main message in under 10 seconds; obvious reading direction; grouped concepts; nothing removable without losing understanding; legible to someone unfamiliar with the topic.

## Shape library

The shape legend is the single source of truth for process mapping. Only these shapes may be used; each has one fixed meaning; shapes must not be modified, combined, redesigned, or repurposed. This legend governs the shared canvas foundation (`frontend/src/components/CanvasShapes.tsx`) used by Current State and Workflows.

| Shape | Meaning |
| --- | --- |
| Start / End | Beginning or end of a process or workflow; defines process boundaries. |
| Process | A single step or activity where work is performed or progressed. |
| Predefined Process | A subprocess defined elsewhere and reused within the workflow. |
| Document | A single document, file, form, or information output. |
| Multiple Documents | Multiple documents or grouped document outputs. |
| Decision | A decision point with multiple possible paths based on a condition. |
| Data | Raw data, inputs, or information entering or used within a process. |
| Data Storage | A system or location where data is stored, held, or retrieved. |
| Manual Input | Information manually entered by a person into a system or process. |
| Manual Operation | A physical or manual action performed by a person outside automated systems. |

(The .docx shape drawings are not extractable as images; shape geometry follows `docs/basic_icons.drawio`.)

## Icon system

Icons are visual shorthand: simple, structured, precise, modern, consistent. Construction rules live in the [Icon Construction Standard](icon-standard.md).

Usage rules — icons must: represent one clearly defined concept, keep a consistent meaning everywhere, support hierarchy and layout. Icons must not: replace headings or key information, be decorative, communicate multiple concepts, or mix styles in one output. Icons are never the sole carrier of important meaning (accessibility) — pair with labels or context.

Colour: approved brand colours; accent colours only where they improve communication or indicate status.

### Icon set (approved concepts)

| Group | Icons |
| --- | --- |
| Caylios Capability | Understand · Improve · Structure & Organise · Automate · Implement · Platform |
| Workflow | Process · Workflow · Decision · Manual Task · Automation |
| Information | Document · Database · Folder/Drive · Dashboard · Report · Application (proprietary icon) |
| Communication | Message · Email · Notification |
| Outcomes | Capacity · Time · Visibility · Growth · Quality · Efficiency |
| Status | Success · Warning · Error · Information · Pending |

The source doc embeds three example icon renders: [`icon-understand.png`](assets/icon-understand.png) · [`icon-improve.png`](assets/icon-improve.png) · [`icon-automate.png`](assets/icon-automate.png).

The approved production-usable PNG Icon Library lives in the canonical source folder [`assets/icon and shape library/`](assets/icon%20and%20shape%20library/), with 31 assets covering the approved concepts above.

## Component library

Approved reusable components: Content Blocks · Process Steps · KPI/Metric Cards · Callout Sections · Before/After Comparison Blocks · Step-By-Step Modules.

Rules: one purpose per component; visually simple; reusable across formats; aligned to layout system and hierarchy; no new component structures outside this system; design for reuse before creating new components.

## Graphic elements

Supporting visuals (hero sections, slides, dividers, backgrounds, cards, infographics) must support content, never compete with it, never obscure readability, never become the primary feature. One asset extracted: [`graphic-circuit-board.png`](assets/graphic-circuit-board.png).

## Templates

Templates combine approved layouts, components, shapes, icons, and graphic elements into reusable deliverables (presentations, documents, digital/UI structures, operational formats). Templates must not introduce new visual styles, override system rules, or prioritise aesthetics over clarity. Select an existing template before creating a new layout.
