# Agent Dashboard Themes

A collection of 5 carefully designed theme variations for the COA-204 Agent Dashboard. Each theme maintains the same layout and functionality while offering distinct visual aesthetics.

## Themes Overview

### 1. Glassmorphism (Default)
**File:** `glassmorphism.html`

Modern, elegant design with translucent glass effects and frosted blur.

**Color Palette:**
- Background: Deep blue gradient (#0a0e27 → #1a1a4d)
- Primary: Purple (#7c3aed)
- Secondary: Blue (#3b82f6)
- Text: Light silver (#e0e6ed)
- Accent: Cyan/Purple glow effects

**Best For:**
- Modern, tech-forward applications
- Premium product feel
- When you want a contemporary aesthetic
- Backgrounds with images/logos (see-through effect)

**Key Features:**
- Glassmorphism with 30px blur
- Gradient backgrounds
- Glowing border effects
- Smooth hover animations
- Works great with transparent backgrounds

---

### 2. Dark Corporate
**File:** `dark-corporate.html`

Professional, enterprise-focused design with teal/cyan accents.

**Color Palette:**
- Background: Navy gradient (#0d1117 → #1a2537)
- Primary: Teal (#06b6d4)
- Secondary: Light Blue (#0ea5e9)
- Text: Cool gray (#d4d8e0)
- Status: Green/Yellow/Red

**Best For:**
- Enterprise/corporate environments
- Financial or data-heavy dashboards
- Professional workspaces
- B2B applications

**Key Features:**
- Clean, minimal design
- High contrast for readability
- Professional color scheme
- Enterprise color language

---

### 3. Light Airy
**File:** `light-airy.html`

Soft, inviting design with purple/pink pastels on a light background.

**Color Palette:**
- Background: Light gray gradient (#f8f9fa → #e8eef5)
- Primary: Purple (#7c3aed)
- Secondary: Pink (#ec4899)
- Text: Dark gray (#4a5568)
- Accents: Soft pastels

**Best For:**
- Creative/design-focused teams
- User-friendly interfaces
- Modern SaaS applications
- Friendly, approachable products

**Key Features:**
- Light, airy feel
- Soft gradient accents
- High accessibility
- Inviting aesthetic

---

### 4. Green Nature
**File:** `green-nature.html`

Eco-friendly, nature-inspired design with forest greens and mint accents.

**Color Palette:**
- Background: Deep green gradient (#0f3f2f → #1a4d42)
- Primary: Mint Green (#6ee7b7)
- Secondary: Emerald (#10b981)
- Text: Soft green-gray (#d1e8e0)
- Accents: Nature-inspired greens

**Best For:**
- Sustainability/environment-focused apps
- Health & wellness products
- Nature-inspired brands
- Eco-conscious companies

**Key Features:**
- Organic, natural feel
- Calming color palette
- Environmental messaging
- Balanced aesthetic

---

### 5. Warm Orange
**File:** `warm-orange.html`

Energetic, warm design with orange and amber accents on a rich brown background.

**Color Palette:**
- Background: Warm brown gradient (#2d1810 → #4a2820)
- Primary: Orange (#f97316)
- Secondary: Amber (#fb923c)
- Text: Warm cream (#f5e6d3)
- Accents: Golden/warm tones

**Best For:**
- Creative/artistic applications
- Community-focused products
- Warm, welcoming interfaces
- Brand-forward applications

**Key Features:**
- Energetic, warm feel
- Bold color palette
- Friendly atmosphere
- Brand personality

---

## Common Layout Elements

All themes include:

### Header Navigation
- Sticky navigation bar with 6 menu items
  - Dashboard (active by default)
  - Sessions
  - Analytics
  - Workflows
  - Settings
  - Docs
- Theme-specific styling

### Active Sessions Panel (Left)
- Search box with icon
- Filter button
- Session cards showing:
  - Session name
  - Status badge (Running/Idle/Errored)
  - Work type chip (Building/Task/Request/Bug/Refactor/Research)
  - Project chip
  - Harness type chip
  - LLM provider chip
  - Start/Stop/Restart buttons
  - Live output/logs preview

### New Session Form (Right)
- Project/Repo dropdown
- Harness Type dropdown
- LLM Provider dropdown
- Work Type dropdown
- Initial Prompt textarea
- Launch Session button

---

## Color-Coded Status Badges

All themes use consistent status colors:

- **Running** (Green) - Session is actively executing
- **Idle** (Gray) - Session is paused/waiting
- **Errored** (Red) - Session encountered an error

---

## Work Type Chips

Work types are color-coded across all themes:

- **Building** - Green
- **Task** - Primary color (varies by theme)
- **Request** - Purple/Pink
- **Bug** - Red
- **Refactor** - Orange/Yellow
- **Research** - Cyan/Blue

---

## Typography

**Fonts by Theme:**
- Glassmorphism: Inter, -apple-system, BlinkMacSystemFont
- Dark Corporate: Segoe UI, Roboto
- Light Airy: Poppins, Inter
- Green Nature: Nunito, Inter
- Warm Orange: Rubik, Inter

**Code/Monospace:**
- Fira Code, Monaco, Courier New

---

## Using the Themes

### Quick Start
1. Open any HTML file in a modern browser
2. No build process required
3. All files are self-contained

### Customization
Each theme uses CSS custom properties and can be modified by:
1. Editing the `<style>` section in the HTML
2. Updating color values in the gradient/background sections
3. Adjusting blur levels in backdrop-filter properties

### Responsive Design
All themes are responsive and work on:
- Desktop (1400px+ optimal)
- Tablet
- Mobile (adapts layout)

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (with -webkit prefixes included)
- Requires CSS backdrop-filter support

---

## Implementation Notes

### Transparency & Glassmorphism
All themes use glassmorphism with varying opacity levels:
- Panels: 0.02 opacity (very transparent)
- Cards: 0.01 opacity (ultra-transparent)
- Blur effect: 20-30px for depth

This allows background images/logos to show through clearly.

### Accessibility
- All color contrasts meet WCAG AA standards
- Form inputs are clearly visible
- Status indicators use both color and text
- Text shadows for readability in glass effect

### Performance
- No JavaScript required
- CSS-only animations
- Minimal file sizes (~30KB each)
- Optimized backdrop-filter for smooth performance

---

## Future Enhancements

Potential additions:
- Dark mode toggle
- Custom theme builder
- Theme export/import
- Component library
- Figma design system
- CSS variables for easy theming

---

## Related Issues

- **COA-204:** Agent Dashboard (main feature)
- **Design System:** Product design specifications
- **Theme Selection:** User preference persistence

---

## Questions?

For questions about theme selection, customization, or implementation, refer to the COA-204 specification or design system documentation.