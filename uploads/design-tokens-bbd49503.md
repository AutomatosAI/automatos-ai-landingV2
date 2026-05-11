# Design Tokens — CSS Variable Contract

> **Purpose.** The platform renders tenant themes by injecting CSS custom properties into a scoped container (`.tenant-theme-container`). Every visible style — colour, type, radius, shadow, padding, button shape, glass effect — is driven by these variables. Generators must emit values in the exact format the renderer expects, or sections fall back to template `:root` defaults (or worse, render with `hsl(#hex)` which is invalid CSS).
>
> **Source of truth.** `nextjs_space/components/tenant-theme-provider.tsx` (the function `applyThemeToContainer` and the `TENANT_SCOPED_CSS` constant). This doc mirrors them — codebase wins on any conflict.

---

## 1. The Raw HSL Channel Format

Every colour CSS variable stores **raw HSL channels only**, no `hsl()` wrapper.

```css
/* CORRECT */
--tenant-color-primary: 178 48% 21%;
--primary: 178 48% 21%;

/* WRONG — produces hsl(hsl(...)) at use-site, invalid CSS */
--tenant-color-primary: hsl(178, 48%, 21%);

/* WRONG — produces hsl(#hex), invalid CSS */
--tenant-color-primary: #0F4C2E;
```

Components consume the variable wrapped: `color: hsl(var(--tenant-color-primary))` — so the variable must be channel-only.

**Format spec:**
- Hue: integer `0`–`360` (no degree symbol)
- Saturation: integer `0`–`100` followed by `%`
- Lightness: integer `0`–`100` followed by `%`
- Separator: single space (no commas)
- Pattern: `^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$`

**Convert hex → channels** with `hexToHSL(hex)` from `scripts/helpers.ts`. Never hand-author channel values; round-tripping a hex value is lossless and predictable.

The renderer (`tenant-theme-provider.tsx::formatColorValue`) auto-converts hex to channels at render time, so `defaults.json` may emit hex, but `styles.css` MUST emit channels (because it's a static stylesheet, not processed by the renderer).

---

## 2. Tenant Colour Variables

Set on the scoped container by `applyThemeToContainer`. Any colour key in `designSystem.colors` becomes `--tenant-color-{kebab-key}`.

| Variable | Source field | Purpose |
|---|---|---|
| `--tenant-color-primary` | `primaryColor` | Primary buttons, key UI accents |
| `--tenant-color-secondary` | `secondaryColor` | Secondary buttons, links, gradients |
| `--tenant-color-accent` | `accentColor` | CTA buttons (Book Now, Check Eligibility) |
| `--tenant-color-background` | `backgroundColor` | Page background |
| `--tenant-color-surface` | `surfaceColor` *(optional)* | Cards, panels, content boxes |
| `--tenant-color-text` | `textColor` | Body text |
| `--tenant-color-heading` | `headingColor` | H1–H6 |
| `--tenant-color-border` | `borderColor` *(optional)* | Borders, dividers |

**Shadcn-mirrored variables** (set when the corresponding tenant colour is set):

| Variable | Mirrors |
|---|---|
| `--primary` | `primaryColor` |
| `--secondary` | `secondaryColor` |
| `--accent` | `accentColor` |
| `--background` | `backgroundColor` |
| `--foreground` | `textColor` |

These power Shadcn UI primitives (`bg-primary`, `text-foreground` etc) within the tenant container.

---

## 3. Typography Variables

```css
--tenant-font-body:           "Inter", sans-serif;
--tenant-font-heading:        "Playfair Display", serif;
--tenant-font-weight:         400;
--tenant-font-weight-heading: 700;
--tenant-letter-spacing:      0;        /* tight: -0.025em | normal: 0 | wide: 0.025em | wider: 0.05em */
--tenant-font-size-base:      16px;
--tenant-hero-scale:          1.5556;   /* heroFontSize / 36 */
--tenant-section-heading-scale: 1;      /* sectionFontSize / 30 */
```

The `--tenant-hero-scale` and `--tenant-section-heading-scale` multipliers apply to `h1`/`h2`–`h6` respectively, so the renderer can scale headings independently from base body size.

---

## 4. Layout / Component Tokens

```css
--tenant-border-radius:    0.5rem;       /* none: 0 | small: 0.25rem | medium: 0.5rem | large: 1rem */
--tenant-button-radius:    0.5rem;       /* rounded: 0.5rem | square: 0.25rem | pill: 9999px */
--tenant-shadow:           0 1px 3px 0 rgb(0 0 0 / 0.1);
--tenant-spacing-scale:    1;            /* compact: 0.75 | normal: 1 | comfortable: 1.5 */
--tenant-button-padding:   0.75rem 1.5rem;
--tenant-button-font-size: 1rem;
--tenant-backdrop-blur:    0px;          /* none: 0 | light: 8px | heavy: 16px */
--tenant-card-opacity:     1;            /* none: 1 | light: 0.8 | heavy: 0.6 */
```

**Shadow token map** (`shadowStyle` → `--tenant-shadow`):

| `shadowStyle` | Value |
|---|---|
| `none` | `none` |
| `soft` | `0 1px 3px 0 rgb(0 0 0 / 0.1)` |
| `medium` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` |
| `bold` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` |

**Spacing scale token map** (`spacing` → `--tenant-spacing-scale`):

The spacing scale multiplies section vertical padding (`3rem` mobile, `4rem` md+) at render time. Compact sites feel dense, comfortable sites feel airy.

---

## 5. Data-Attribute Tokens

These live as DOM attributes on `.tenant-theme-container`, consumed by CSS selectors in `TENANT_SCOPED_CSS`:

```html
<div class="tenant-theme-container"
     data-hover="lift"      <!-- none | lift | glow | scale | pulse -->
     data-glass="none">     <!-- none | light | heavy -->
```

**Don't generate these directly.** Generate `buttonHoverEffect` and `glassEffect` in `defaults.json`; the renderer applies them as data-attrs.

---

## 6. The 50→900 Lightness Ladder

`generateColorScale(baseHSL)` from `scripts/helpers.ts` produces a 10-stop scale from a single base colour. Lightness is monotonic dark→light. The 500 step uses the input lightness; 50–400 are absolute lightnesses; 600–900 step down by 10 from base (clamped to 14 minimum):

| Step | Lightness rule | Use case |
|---|---|---|
| 50 | 97 | Backgrounds, hover surfaces |
| 100 | 92 | Subtle backgrounds, dividers |
| 200 | 82 | Disabled states, faint borders |
| 300 | 72 | Borders, secondary text on light bg |
| 400 | 66 | Muted text, decorative icons |
| 500 | `baseL` | Primary brand colour, buttons |
| 600 | `max(baseL - 10, 40)` | Hover states |
| 700 | `max(baseL - 20, 30)` | Active states, dark text |
| 800 | `max(baseL - 30, 20)` | Headings on light bg |
| 900 | `max(baseL - 40, 14)` | Body text on white, deepest dark |

**Use case in `styles.css`:**

```css
:root {
  --tenant-color-primary-50:  158 30% 97%;
  --tenant-color-primary-100: 158 35% 92%;
  --tenant-color-primary-500: 158 60% 35%;   /* base */
  --tenant-color-primary-700: 158 60% 22%;
  --tenant-color-primary-900: 158 60% 12%;
}
```

These give you Tailwind-style step references in section CSS without locking the palette: a tenant's brand teal will produce a teal scale; their amber will produce amber.

---

## 7. Mood Palettes

Curated hue ranges that map "feeling" → colour family. Use these to drive initial colour picks during brand discovery; never lock to exact values, always sample within the range and verify contrast.

| Mood | Description | Hue range | Base saturation | Base lightness | Examples |
|---|---|---|---|---|---|
| **earthy** | Grounded, organic, plant-forward — default for cannabis | 60–160 (amber → forest) | 25–55% | 30–45% | Forest green `158 60% 30%`, sage `120 25% 55%`, terracotta `20 50% 50%` |
| **medical** | Clinical, trustworthy, calm | 180–220 (teal → blue) | 35–65% | 30–50% | Medical blue `210 65% 45%`, calm teal `190 50% 40%` |
| **luxury** | Premium, refined, exclusive | 25–50 (amber → gold) + 270–330 (purple → magenta) | 30–70% | 18–35% | Deep gold `40 65% 50%`, oxblood `345 50% 30%`, royal purple `280 55% 28%` |
| **bold** | High-energy, modern, confident | 0–25 (red → orange), 330–360 (magenta → red) | 75–95% | 45–55% | Crimson `355 80% 50%`, electric orange `15 90% 55%` |
| **warm** | Welcoming, friendly, lifestyle | 15–60 (orange → yellow → amber) | 50–80% | 50–65% | Apricot `30 75% 60%`, dijon `45 70% 55%`, sunset `15 80% 60%` |
| **cool** | Composed, professional, dispensary-tech | 200–280 (blue → indigo → violet) | 30–60% | 35–55% | Cobalt `220 60% 45%`, slate-blue `215 35% 45%` |
| **monochrome** | Editorial, gallery, minimalist | any single hue | 0–10% | 0–100% | Neutral grey `0 0% 50%`, near-black `220 8% 12%`, off-white `40 10% 96%` |

**Compliance note for cannabis markets (PT/UK/DE):** avoid loud-recreational palettes (electric green, neon purple) for medical-licensed templates — regulators prefer earthy / medical / cool. Save bold/warm for lifestyle CBD or wellness positioning where the licence permits.

---

## 8. Section Padding Tokens

`settings.sectionPadding` is a single string with one to three slash-separated rem values:

```
"2rem"               → 2rem on every breakpoint
"2rem/3rem"          → 2rem on mobile, 3rem on sm+ (640px+)
"2rem/3rem/3.5rem"   → 2rem mobile, 3rem sm (640px+), 3.5rem md+ (768px+)
```

| Use case | Recommended value |
|---|---|
| Compact / dense (Shopify-like) | `"1.5rem/2rem/2.5rem"` |
| Default professional | `"2rem/3rem/3.5rem"` |
| Premium / editorial | `"2.5rem/4rem/5rem"` |
| Conversion-focused landing | `"2rem/2.5rem/3rem"` |

The renderer parses on `/` and emits responsive padding via Tailwind. Always emit triple-value for new templates so all three breakpoints have explicit values.

---

## 9. Border-Radius Token Map

| `borderRadius` value | `--tenant-border-radius` | Personality |
|---|---|---|
| `none` | `0` | Editorial, brutalist, gallery |
| `small` | `0.25rem` | Pharma-clinical, tight |
| `medium` | `0.5rem` | Default, modern Web |
| `large` | `1rem` | Premium, lifestyle, friendly |

**Button radius is independent** (`--tenant-button-radius` ← `buttonStyle`):

| `buttonStyle` | Radius | Personality |
|---|---|---|
| `square` | `0.25rem` | Editorial, clinical |
| `rounded` | `0.5rem` | Default modern |
| `pill` | `9999px` | Lifestyle, app-like, premium consumer |

Buttons can be `pill` while cards are `medium` — that's a common premium pattern.

---

## 10. Generation Defaults

When in doubt, use these as starting values for every generated template:

```json
{
  "borderRadius": "medium",
  "buttonStyle": "rounded",
  "buttonSize": "medium",
  "buttonHoverEffect": "lift",
  "shadowStyle": "soft",
  "spacing": "normal",
  "glassEffect": "none",
  "animationType": "fade-up",
  "dividerStyle": "none",
  "fontWeight": "400",
  "headingFontWeight": "700",
  "letterSpacingPreset": "normal",
  "fontSize": "16",
  "heroFontSize": "56",
  "sectionFontSize": "32",
  "settings": { "sectionPadding": "2rem/3rem/3.5rem" }
}
```

Diverge from these only when the brand brief calls for it — every divergence should map to a specific brand attribute (e.g., "premium" → `pill` buttons + `large` radius + `comfortable` spacing).

---

## 11. The `:root` Stylesheet Pattern

Every template's `styles.css` should begin with a `:root` block that sets template defaults. These become the **fallback layer** when a tenant has no per-section overrides AND no global brand colour set:

```css
:root {
  /* Brand colours — raw HSL channels */
  --tenant-color-primary:    158 60% 30%;
  --tenant-color-secondary:  40 65% 50%;
  --tenant-color-accent:     158 70% 45%;
  --tenant-color-background: 40 10% 97%;
  --tenant-color-surface:    0 0% 100%;
  --tenant-color-text:       150 15% 18%;
  --tenant-color-heading:    158 50% 14%;
  --tenant-color-border:     150 10% 88%;

  /* Optional 50–900 scale */
  --tenant-color-primary-50:  158 30% 97%;
  --tenant-color-primary-500: 158 60% 30%;
  --tenant-color-primary-900: 158 60% 12%;
}

/* Per-section scoping — overrides cascade above template defaults */
section[data-section-id="hero-1"] {
  --tenant-color-primary: 40 65% 50%;
  --tenant-color-heading: 0 0% 100%;
}
```

Per-section scoping uses `section[data-section-id="..."]` — the renderer emits the `data-section-id` attribute on every section's outer wrapper to enable this exact selector pattern.
