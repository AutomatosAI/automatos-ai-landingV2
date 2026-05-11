# Color Theory for BudStacks Templates

## HSL Color Format (MANDATORY)

ALL colors in defaults.json and styles.css MUST be raw HSL:
- Correct: `"178 48% 21%"` (hue saturation% lightness%)
- WRONG: `"#2A3D3A"` (hex)
- WRONG: `"hsl(178, 48%, 21%)"` (wrapper)
- WRONG: `"rgb(42, 61, 58)"` (rgb)

In CSS, wrap with hsl():
```css
color: hsl(var(--tenant-color-primary));
background: hsl(var(--tenant-color-primary) / 0.5);  /* with opacity */
```

## Generating a Color Scale (50-900)

From a base primary HSL, generate a 10-step scale by varying lightness while keeping hue and saturation relatively stable:

```
50:  H  S-10%  97%   (near-white tint)
100: H  S-5%   92%
200: H  S-2%   82%
300: H  S      70%
400: H  S      58%
500: H  S      46%   (mid-tone — often the "primary" value)
600: H  S+4%   38%
700: H  S+8%   30%
800: H  S+12%  22%
900: H  S+16%  14%   (near-black shade)
```

Adjust saturation slightly: lighter tones = slightly less saturated, darker = slightly more.

## Color System Architecture

Every template needs these 8 colors:

| Variable | Purpose | Typical Range |
|----------|---------|---------------|
| `primary` | Main brand, CTAs, icons | The hero color — medium-dark for dark themes, medium for light |
| `secondary` | Gradients, accents | Complementary or shifted hue, slightly lighter/darker than primary |
| `accent` | Highlights, badges, hover states | High saturation, draws the eye |
| `background` | Page bg | Near-white (light themes) or near-black (dark themes) |
| `surface` | Card bg, section alternating bg | Slightly tinted neutral — distinguishes from background |
| `text` | Body copy | Near-black (light theme) or near-white (dark theme) |
| `heading` | h1-h4 text | Usually matches primary or is darker/bolder |
| `border` | Dividers, card borders | Subtle, low-saturation version of surface |

## Color Mood Palettes

### Earthy / Organic
- Primary: deep forest (140-160 hue, 30-50% sat, 20-35% light)
- Secondary: sage or olive variant
- Accent: warm gold or copper (30-50 hue)
- Surface: warm cream (40-50 hue, 10-20% sat, 96-98% light)
- Example: `primary: "148 38% 28%"`, `accent: "38 72% 55%"`

### Medical / Clinical
- Primary: teal or deep blue-green (170-200 hue, 40-60% sat, 20-35% light)
- Secondary: lighter teal
- Accent: sage green (140-170 hue)
- Surface: cool neutral (180+ hue, 10-20% sat)
- Example: `primary: "178 48% 21%"`, `accent: "164 48% 53%"`

### Luxury / Dark
- Primary: deep jewel tone (250-300 hue for purple, 0-20 for burgundy)
- Secondary: warm gold or champagne (40-50 hue)
- Accent: bright metallic (45-55 hue, high sat)
- Background: very dark (0 0% 4-8%)
- Text: off-white (0 0% 90-95%)
- Example: `primary: "275 50% 25%"`, `accent: "45 85% 55%"`

### Bold / Street
- Primary: high-saturation statement (any hue, 70-100% sat)
- Secondary: darker shade or complementary
- Accent: neon or contrasting bright
- Surface: near-black or very dark
- Example: `primary: "145 80% 45%"`, `accent: "45 100% 50%"`

### Warm / Friendly
- Primary: warm coral, terracotta, or amber (0-40 hue)
- Secondary: peach or warm brown
- Accent: bright warm (gold, orange)
- Surface: warm cream
- Example: `primary: "15 70% 50%"`, `accent: "38 90% 60%"`

### Cool / Modern
- Primary: blue, indigo, or slate (200-260 hue)
- Secondary: lighter blue or cyan
- Accent: electric blue or cyan
- Surface: cool gray
- Example: `primary: "225 60% 35%"`, `accent: "200 90% 55%"`

### Minimal / Monochrome
- Primary: dark gray or charcoal (0 0% 15-25%)
- Secondary: medium gray (0 0% 35-45%)
- Accent: single bright color for pops (any hue, high sat)
- Surface: very light gray (0 0% 97-99%)
- Example: `primary: "0 0% 18%"`, `accent: "210 85% 55%"`

## Shadow Generation

Brand-tinted shadows use the primary color's RGB values:

```
Convert primary HSL → RGB (e.g., "178 48% 21%" → rgb(28, 79, 77))

theme-sm:  0 2px 8px rgba(R, G, B, 0.06)
theme-md:  0 4px 16px rgba(R, G, B, 0.08)
theme-lg:  0 8px 32px rgba(R, G, B, 0.12)
theme-xl:  0 12px 48px rgba(R, G, B, 0.16)
theme-2xl: 0 20px 64px rgba(R, G, B, 0.20)
```

## Gradient Generation

```
primary:     linear-gradient(135deg, hsl(accent) 0%, hsl(primary) 100%)
secondary:   linear-gradient(135deg, hsl(secondary) 0%, hsl(primary-900) 100%)
hero-overlay: linear-gradient(180deg, rgba(R,G,B,0.7) 0%, rgba(R2,G2,B2,0.85) 100%)
card-hover:  linear-gradient(135deg, hsl(accent/0.1) 0%, hsl(primary/0.1) 100%)
medical:     linear-gradient(180deg, hsl(primary/0.05) 0%, hsl(accent/0.05) 100%)
```

## Contrast Check

Ensure WCAG AA compliance:
- Body text on background: minimum 4.5:1 contrast ratio
- Large text (headings) on background: minimum 3:1
- CTA button text on button bg: minimum 4.5:1

**Quick rule:** If primary is dark (lightness < 40%), use white text on primary bg.
If primary is light (lightness > 60%), use dark text on primary bg.

## Dark Section Color Scoping

When a section has a dark background, locally override the CSS variables:

```css
.template-slug #section-id {
  --tenant-color-surface: H S% L%;      /* dark bg */
  --tenant-color-heading: 0 0% 100%;    /* white headings */
  --tenant-color-text: 0 0% 85%;        /* light body text */
  --tenant-color-border: H S% L%;       /* subtle dark border */
}
```

**Footer** always needs this treatment. `Stats` and `CTABanner` have built-in dark gradient
backgrounds but still need heading color overrides.
