# Editor Parity — Round-Trip Contract

> **Purpose.** The Store Editor at `/tenant-admin/branding` is the canonical UI that operators use to edit a template. Anything you generate in `layout.json` / `defaults.json` MUST round-trip cleanly through that editor: when an operator opens the editor, every field renders; when they save, every field re-emits unchanged. Generate keys the editor doesn't know about → silently dropped on save. Miss keys the editor expects → empty fields, broken UI.
>
> **Source of truth.** `nextjs_space/lib/types/template-layout.ts`, `nextjs_space/lib/section-schemas.ts`, `nextjs_space/app/tenant-admin/branding/tabs/*.tsx`. This doc mirrors them — if there is a conflict, the codebase wins.

---

## 1. The Six Editor Tabs

| Tab | Reads from | Writes to | Owns |
|---|---|---|---|
| **Layout** | `layout.json.sections[]` | same | Section ordering, add/remove |
| **Brand** | `defaults.json` top-level + `pageContent.*` + `logoPlacement` | same | Business name, tagline, logo files, favicon, `LogoPlacement`, About + Contact page text |
| **Colours** | `defaults.json` global colours + `navColorOverrides` + `footerColorOverrides` | same | Six global brand colours + per-nav and per-footer overrides |
| **Type** | `defaults.json` typography fields | same | Body/heading font, sizes, weights, letter-spacing |
| **Design** | `defaults.json` design-token fields | same | Button shape/size/hover, radius, shadow, spacing, premium effects |
| **Content** | `layout.json.sections[i].config` + per-section `colorOverrides` | same | Every per-section field defined in `section-schemas.ts` |

The Editor never invents data. It reads what exists and exposes editors for it. Generate everything below or operators see empty fields.

---

## 2. `layout.json` — Top-Level Shape

```jsonc
{
  "version": "1.0",
  "navigation": "NavMinimal",
  "navigationConfig": { /* see §6 */ },
  "sections": [
    {
      "type": "HeroFullScreen",                     // must exist in section-registry.ts
      "id": "hero-1",                               // unique within layout
      "config": { /* keys must exist in section-schemas.ts for this type */ },
      "visible": true,
      "colorOverrides": { /* §5 — keys ⊆ 8-key whitelist */ }
    }
  ],
  "footer": "FooterFull",
  "footerConfig": { /* see §7 */ },
  "settings": {
    "wrapperClass": "store-wrap",
    "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
    "sectionPadding": "2rem/3rem/3.5rem"            // mobile/sm/md — see §8
  }
}
```

**Rules:**
- `version` is required. Use `"1.0"`.
- `navigation` and `footer` are component **type names** — they look up in `section-registry.ts`. Never put paths or arbitrary strings.
- `sections[]` is ordered. The editor's drag-reorder writes back the array in this order.
- Each section's `id` MUST be stable and unique (the editor uses it as the React key + the storage key for `sectionColorOverrides[id]`). Recommended: `"{type-lowercased}-{slug-or-counter}"`.
- `visible: false` keeps the section in the layout but hides on render — useful for seasonal sections.
- `colorOverrides` is optional; when present, keys MUST be a subset of the 8-key palette (§5).

---

## 3. `defaults.json` — Top-Level Shape

```jsonc
{
  // ─── Brand (BrandTab) ─────────────────────
  "businessName": "Greenwood Apothecary",
  "tagline": "Your trusted medical cannabis partner",
  "logoUrl": "/uploads/logo.png",                   // S3 path, signed at render
  "faviconUrl": "/uploads/favicon.png",

  // ─── Logo Placement (BrandTab) ────────────
  "logoPlacement": { /* see §4 */ },

  // ─── Global Colours (ColoursTab) ──────────
  "primaryColor": "#0F4C2E",                        // hex; editor stores hex, renderer converts
  "secondaryColor": "#C8A951",
  "accentColor": "#7AB89A",
  "backgroundColor": "#FFFFFF",
  "textColor": "#1F2933",
  "headingColor": "#0A2818",

  // Nav + footer global colour overrides (8-key whitelist, all optional)
  "navColorOverrides":   { "background": "#0A2818", "text": "#FFFFFF" },
  "footerColorOverrides": { "background": "#0A2818", "text": "#E5E7EB" },

  // ─── Typography (TypeTab) ─────────────────
  "fontFamily": "Inter",                            // body
  "headingFontFamily": "Playfair Display",          // or "same" to inherit from body
  "fontSize": "16",                                 // body, px (12-24)
  "heroFontSize": "56",                             // hero title, px (24-96)
  "sectionFontSize": "32",                          // section heading, px (18-56)
  "fontWeight": "400",                              // 300|400|500|700
  "headingFontWeight": "700",                       // 400|500|600|700|800
  "letterSpacingPreset": "normal",                  // tight|normal|wide|wider

  // ─── Design tokens (DesignTab) ────────────
  "buttonStyle": "rounded",                         // rounded|square|pill
  "buttonSize": "medium",                           // small|medium|large
  "buttonHoverEffect": "lift",                      // none|lift|glow|scale
  "borderRadius": "medium",                         // none|small|medium|large
  "shadowStyle": "soft",                            // none|soft|medium|bold
  "spacing": "normal",                              // compact|normal|comfortable
  "glassEffect": "none",                            // none|light|heavy
  "animationType": "fade-up",                       // none|fade-up|slide-right|zoom-in
  "dividerStyle": "none",                           // none|wave|slant|curve

  // ─── Page content (BrandTab) ──────────────
  "pageContent": { /* see references/page-content.md */ },

  // ─── Per-section colour overrides (ContentTab → Colour sub-tab) ──
  // Mirrors layout.json sections[i].colorOverrides; the editor lets operators
  // override per section. Same 8-key whitelist (§5).
  "sectionColorOverrides": {
    "hero-1": { "primary": "#C8A951", "heading": "#FFFFFF" }
  },

  // ─── Education hotspots (legacy, optional) ──
  "educationHotspots": []
}
```

**Rules:**
- Hex colours, six chars, leading `#`. The editor's `ColorPicker` stores hex; the renderer converts to raw HSL channels at render time. Generators should emit hex.
- Numeric size fields (`fontSize`, `heroFontSize`, `sectionFontSize`) are **strings** — the editor stores them via `Input type="number"` but persists as strings. Don't switch to numbers.
- `fontWeight` and `headingFontWeight` are **strings** with explicit allowed enum (above).
- `headingFontFamily: "same"` inherits from `fontFamily`. Otherwise use a Google Fonts family name.
- All design-token enums above are exhaustive — values outside the listed sets break the StyleOption picker.

---

## 4. `LogoPlacement` — Full Spec

Read by `BrandTab` and rendered by `Nav*` / `Hero*` / `Footer*` components.

```typescript
interface LogoPlacement {
  // Navigation
  navPosition: "left" | "center" | "right";
  navSize: number;                   // px, 24–120 (slider step 2)
  showBusinessName: boolean;         // shows business name beside nav logo

  // Hero
  heroShowLogo: boolean;
  heroX: number;                     // 0–100 percentage from left
  heroY: number;                     // 0–100 percentage from top
  heroSize: number;                  // px, 24–400 (slider step 4)
  heroStyle: "plain" | "circular" | "badge";

  // Footer
  footerShowLogo: boolean;
}
```

**Defaults to use when generating:**

```json
{
  "navPosition": "left",
  "navSize": 52,
  "showBusinessName": true,
  "heroShowLogo": false,
  "heroX": 50,
  "heroY": 50,
  "heroSize": 80,
  "heroStyle": "plain",
  "footerShowLogo": true
}
```

**Legacy values still accepted** by render components (do not generate these — they are read-only compat for old tenants):
- `navSize`: `"small"` (36px) | `"medium"` (52px) | `"large"` (72px)
- `heroSize`: `"small"` (48px) | `"medium"` (80px) | `"large"` (120px) | `"watermark"` (200px)

Always generate **numbers** for new templates.

---

## 5. `colorOverrides` — 8-Key Whitelist

Single source-of-truth: `nextjs_space/lib/types/template-layout.ts` → `SectionColorOverrides`.

| Key | Editor label | Description |
|---|---|---|
| `primary` | Button Color | Main buttons and interactive elements |
| `accent` | Call-to-Action Color | CTA buttons (Book Now, Check Eligibility) |
| `secondary` | Links & Highlights | Links, secondary buttons, gradients |
| `heading` | Heading Text | Page titles and section headings |
| `text` | Body Text | Paragraphs and general content |
| `background` | Page Background | Main page background |
| `surface` | Card Background | Cards, panels, content boxes |
| `border` | Borders & Dividers | Lines, borders, separators |

**Rules:**
- All keys are optional. Omit a key to inherit from the global brand colour.
- All values are hex strings.
- The editor lets operators clear individual keys (× icon) → keys are removed from the object, not set to empty string. Generators should follow the same: if no override, omit the key.
- `colorOverrides` lives on `LayoutSection` (in `layout.json`) AND on `defaults.json.sectionColorOverrides[sectionId]`. They mean the same thing — pick one location and stick to it (the renderer reads both, but maintain a single source).
- `navColorOverrides` and `footerColorOverrides` apply to nav/footer specifically and use the same 8 keys.

**Cascade order at render time** (template-renderer.tsx):
1. Section-level `colorOverrides` (highest priority)
2. Global brand colour (`defaults.json.primaryColor` etc)
3. `:root` CSS variable from `styles.css` (template default)

---

## 6. `navigationConfig` — Full Spec

```typescript
interface NavigationConfig {
  links: { label: string; href: string }[];           // primary nav links
  cta:   { label: string; href: string };              // primary CTA button
  cta2?: { label: string; href: string };              // optional secondary CTA
  showCart: boolean;                                   // shopping cart icon visibility
}
```

**Generation defaults:**

```json
{
  "links": [
    { "label": "Shop", "href": "/products" },
    { "label": "About", "href": "/about" },
    { "label": "Education", "href": "/education" },
    { "label": "Contact", "href": "/contact" }
  ],
  "cta":  { "label": "Book Consultation", "href": "/consultation" },
  "cta2": { "label": "Patient Login",     "href": "/sign-in" },
  "showCart": true
}
```

**Rules:**
- `href` may be a relative path (`/products`) or absolute URL. Use relative for in-store routes.
- `links[]` order is preserved — the editor renders an array editor, not a sortable list.
- Compliance: do not put age-gated content behind a nav link without a gate; e.g., do not link to `/products` from a nav rendered before the age gate fires (if the template has an age gate).

---

## 7. `footerConfig` — Full Spec

```typescript
interface FooterConfig {
  tagline: string;                                                                // short footer hero line
  sections: { title: string; links: { label: string; href: string }[] }[];        // grouped link columns
  socialLinks: { platform: SocialPlatform; url: string }[];                       // platform IDs from SOCIAL_PLATFORMS
  disclaimer: string;                                                             // legal/compliance text
  address: string;                                                                // displayed in footer or contact column
  email: string;                                                                  // contact email shown in footer
}
```

`SocialPlatform` enum (from `section-schemas.ts` → `SOCIAL_PLATFORMS`): `instagram | facebook | twitter | linkedin | youtube | tiktok | pinterest | discord | telegram | whatsapp`.

**Generation defaults:**

```json
{
  "tagline": "Quality medical cannabis, prescribed by doctors.",
  "sections": [
    {
      "title": "Shop",
      "links": [
        { "label": "All Products", "href": "/products" },
        { "label": "Flowers", "href": "/products?category=flower" },
        { "label": "Oils", "href": "/products?category=oil" }
      ]
    },
    {
      "title": "Information",
      "links": [
        { "label": "About Us", "href": "/about" },
        { "label": "Education", "href": "/education" },
        { "label": "FAQ", "href": "/faq" },
        { "label": "Contact", "href": "/contact" }
      ]
    },
    {
      "title": "Legal",
      "links": [
        { "label": "Terms",   "href": "/terms" },
        { "label": "Privacy", "href": "/privacy" },
        { "label": "Cookies", "href": "/cookies" }
      ]
    }
  ],
  "socialLinks": [
    { "platform": "instagram", "url": "https://instagram.com/example" }
  ],
  "disclaimer": "Cannabis is a controlled substance. Use only as prescribed by a qualified medical professional. Keep out of reach of children.",
  "address": "Lisboa, Portugal",
  "email": "info@example.com"
}
```

---

## 8. `settings.sectionPadding` — Triple-Value Pattern

```
"2rem"               → 2rem on every breakpoint
"2rem/3rem"          → 2rem on mobile, 3rem on sm and up
"2rem/3rem/3.5rem"   → 2rem on mobile, 3rem on sm, 3.5rem on md+
```

The renderer parses on `/` and applies via Tailwind responsive padding. Triple-value is the recommended generation default — covers mobile, tablet, desktop with sensible scaling.

**Generation default:** `"2rem/3rem/3.5rem"` (premium feel) or `"1.5rem/2rem/2.5rem"` (compact / dense layouts).

---

## 9. ContentTab — Field-Type → Input Mapping

The Content tab reads each section's schema from `section-schemas.ts` and renders one input per field. Generators must emit values matching the field's `type`.

| Schema `type` | Editor renders | Value shape |
|---|---|---|
| `text` | `<Input type="text">` | `string` |
| `textarea` | `<Textarea>` | `string` (newlines allowed) |
| `image` | `<SectionImageUploader>` (S3 upload) | `string` URL — see Asset Keys (§10) |
| `video` | `<SectionVideoUploader>` (S3 upload) | `string` URL |
| `url` | `<Input type="url">` | `string` |
| `select` | `<Select>` with options | `string` — must be one of `field.options[].value` |
| `number` | `<Input type="number">` | `number` (renderer coerces if string) |
| `boolean` | `<Switch>` | `boolean` |
| `array` | Repeater (add/remove rows) of `itemFields` | `Array<Record<string, any>>` |
| `product-picker` | `<ProductPicker>` (multi-select from tenant catalog) | `string[]` of product slugs |

**Critical rule:** if your generator emits a key that does not exist in the section's schema, the editor will silently drop it on save. Always look up `SECTION_SCHEMAS[sectionType].fields[].key` and only emit those keys.

`migrateSectionConfig(type, oldConfig)` is run on load to add missing defaults — but this is a safety net, not a contract. Generate complete configs.

---

## 10. Asset Keys (signed/stripped on save)

`SECTION_ASSET_KEYS` (from `template-layout.ts`):

```
imageUrl, imageUrl2, imageUrl3,
videoUrl, watermarkUrl, rightImageUrl,
backgroundImageUrl
```

These keys, wherever they appear in section configs, get:
- **Signed on render** — converted to a presigned S3 URL at request time
- **Stripped on save** — query string removed before persistence so signing stays fresh

When generating layout.json values for these keys, use **path-only** strings: `"/uploads/healingbuds/hero.jpg"` — never include a query string.

---

## 11. Round-Trip Validation Checklist

Before shipping a generated template, verify by hand or with `scripts/validate-layout.ts`:

- [ ] `version` field present, value `"1.0"`
- [ ] `navigation` and `footer` are valid component type names (exist in `section-registry.ts`)
- [ ] Every `sections[i].type` exists in `section-registry.ts`
- [ ] Every `sections[i].id` is unique
- [ ] Every key inside `sections[i].config` exists in `SECTION_SCHEMAS[type].fields[].key`
- [ ] Every `select` field value is one of the schema's `options[].value`
- [ ] `colorOverrides` keys ⊆ 8-key whitelist (`primary, secondary, accent, background, surface, text, heading, border`)
- [ ] `navigationConfig` includes `links[]`, `cta`, `showCart` at minimum
- [ ] `footerConfig` includes `tagline`, `sections[]`, `socialLinks[]`, `disclaimer`, `address`, `email`
- [ ] `logoPlacement` includes all 9 keys with values within ranges (heroX/Y 0–100, navSize 24–120, heroSize 24–400)
- [ ] `pageContent.{home, about, contact}` populated
- [ ] All asset URLs are path-only (no query strings)
- [ ] `settings.sectionPadding` matches `<rem>` or `<rem>/<rem>` or `<rem>/<rem>/<rem>` pattern
- [ ] All hex colours are 7 chars (`#RRGGBB`)
- [ ] All `fontSize` / `heroFontSize` / `sectionFontSize` values are strings
