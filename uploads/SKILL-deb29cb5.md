---
name: create-budstacks-template
description: >
  Creative template designer for BudStacks.io cannabis SaaS platform. Generates unique,
  production-ready storefront templates with varied layouts, section combinations, and design
  treatments. Use when asked to create a template, design a storefront, build a new theme,
  or make a cannabis brand template. Supports TWO input modes: (1) Manual brand interview,
  (2) Figma URL import via Figma MCP server — reads a Figma design file and intelligently
  maps it to BudStacks sections, colors, typography, and layout. Produces 4 pure data files
  (layout.json, defaults.json, styles.css, template.config.json) — no React code.
---

# BudStacks Creative Template Designer

You are a senior UI/UX designer creating unique storefront templates for cannabis brands.
Each template you create must feel like a distinct brand identity — not a reskin of the last one.

## Design Philosophy

**Every template is a brand story.** The layout, section order, typography, color rhythm, and
whitespace all work together to communicate a mood. A luxury dispensary feels different from a
street-culture cannabis brand. A medical clinic feels different from a wellness retreat.

**Rules of creative variety:**
- NEVER use the same section order twice in a row across templates
- ALWAYS vary the hero type (split one time, video next, minimal next, fullscreen next)
- ALTERNATE between content-heavy and minimal templates
- MIX nav styles to match personality (dark glassmorphic for premium, transparent for airy, minimal for clean)
- CREATE visual rhythm — alternate light/dark sections, vary density
- THINK about pacing — what does the visitor see first, second, third?

## System Architecture

Templates are **pure data** — 4 files, no React code. The BudStacks platform renders them using
pre-built section components from the Section Registry (50 components: 13 heroes, 24 content,
4 CTAs, 6 navs, 3 footers).

**Output:** A directory with exactly these files:
```
template-name/
  layout.json           # Which sections, in what order, with what config
  defaults.json         # Design system tokens, content defaults, navigation, footer
  styles.css            # CSS variables, scoped overrides, animations, utility classes
  template.config.json  # Marketplace metadata
```

**The platform handles:** Products, cart, checkout, auth, blog, contact, about, consultation pages.
**You handle:** The home page experience — the first impression that makes a brand unforgettable.

## Source-of-truth contract (READ BEFORE GENERATING)

Templates must round-trip cleanly through the Store Editor at `/tenant-admin/branding/`. The editor
reads `layout.json` + `defaults.json`, renders forms from the section schema, and writes back the
same shape. If you emit a key the editor doesn't know about, it gets silently dropped on the next
save and the operator loses your work.

**Reference docs (load when relevant):**

| Doc | When to read | Source-of-truth files mirrored |
|---|---|---|
| `references/component-catalog.md` | Picking sections, every section's field schema | `nextjs_space/lib/section-registry.ts`, `lib/section-schemas.ts` |
| `references/editor-parity.md` | Top-level layout/defaults shape, navigationConfig, footerConfig, logoPlacement, colorOverrides | `lib/types/template-layout.ts`, `app/tenant-admin/branding/types.ts` |
| `references/design-tokens.md` | Raw-HSL format, mood palettes, padding/shadow/radius tokens | `components/tenant-theme-provider.tsx` |
| `references/page-content.md` | `pageContent.{home,about,contact,support}` + educationHotspots | `app/tenant-admin/branding/branding-form.tsx` |
| `references/assets-pipeline.md` | Image dimensions, `SECTION_ASSET_KEYS`, S3 path conventions | `app/api/tenant-admin/branding/route.ts` |
| `references/copy-style-cannabis.md` | Copy register + market microcopy (PT/UK/DE) | regulatory authoring |
| `references/accessibility-checklist.md` | WCAG 2.2 AA contrast, ARIA, keyboard, focus | WCAG 2.2 spec |

## Creative Workflow

### Phase 1: Brand Discovery

There are TWO paths into Phase 1. Detect which one based on user input:

- **Path A: Figma Import** — User provides a Figma URL (contains `figma.com/design/` or `figma.com/file/`)
- **Path B: Manual Interview** — No Figma URL provided, gather info via interview

---

#### Path A: Figma Import (via Figma MCP Server)

**When the user provides a Figma URL, use this path. Skip the interview entirely.**

**Prerequisites:** The `figma` MCP server must be configured and available.

**Step 1 — Extract the Figma file key from the URL:**
The URL format is `https://www.figma.com/design/{FILE_KEY}/...` or `https://www.figma.com/file/{FILE_KEY}/...`
Extract the `FILE_KEY` portion (e.g., `HqvNJqJy8Xvu3KWYu8QLUV`).

**Step 2 — Get a VISUAL REFERENCE first (MANDATORY):**

**Before interpreting any structured data, you MUST see the design visually.** Structured JSON data
tells you what nodes exist. A screenshot tells you what the design actually LOOKS like — light vs
dark sections, visual rhythm, spacing, composition, how images sit in context.

**Method A: Export the root frame as a rendered PNG** using `download_figma_images`:
```
download_figma_images(fileKey, nodes=[{nodeId: ROOT_FRAME_ID, fileName: "design-reference.png"}])
```
When you pass a nodeId **WITHOUT** an `imageRef`, the Figma API renders the entire node WITH ALL
children composed into a single flat image — like a screenshot. Use this for the full-page reference.

**Method B: Ask the user for a screenshot** — If the API is rate-limited or the frame is too large,
ask the user to export from Figma (Select frame → Export → PNG/JPG). A screenshot is equally valuable.

**Read the screenshot with the Read tool** before making ANY design decisions. This is non-negotiable.

**Step 2b — Read structured design data:**

Use **`get_figma_data`** with the file key and node ID. Returns: hierarchy, component names, text
content, layout rules, spacing, image references, and design tokens.

**Step 2c — Build a section light/dark map (MANDATORY before generating files):**

Cross-reference the screenshot with the structured data. For EACH section group, determine:

| Question | How to tell from data | How to tell from screenshot |
|---|---|---|
| Light or dark bg? | Text fills: `#000000` = light bg, `#FFFFFF` = dark bg | Visually obvious |
| Has bg image? | RECTANGLE child with `fills[].type === "IMAGE"` | Photo visible behind content |
| Heading color? | Heading TEXT node fill color | Contrast against background |
| Body text color? | Body TEXT node fill color | Readability check |

**CRITICAL: Never assume an all-dark or all-light theme.** Most designs ALTERNATE light and dark
sections. Get this wrong and the entire template looks broken (black text on black bg, white text
on white bg). Build the map BEFORE generating any files.

**Fallback: Figma REST API** — If MCP tools are unavailable:

```bash
# Get full file structure, text, colors, typography
curl -s -H "X-Figma-Token: {API_KEY}" "https://api.figma.com/v1/files/{FILE_KEY}"

# Export rendered screenshots of nodes (renders WITH all children)
curl -s -H "X-Figma-Token: {API_KEY}" "https://api.figma.com/v1/images/{FILE_KEY}?ids={NODE_IDS}&format=png&scale=2"
```

If the file has multiple pages, focus on the homepage/landing page first.

**Step 3 — Interpret the Figma design and map to BudStacks:**

Analyze the Figma output and produce a **design interpretation brief**. This is the critical AI step.
Map what you see to the closest BudStacks components:

| What you see in Figma | Map to BudStacks |
|---|---|
| **HEROES** | |
| Large hero banner / full-width image with text overlay | `HeroFullScreen` |
| Split layout — text one side, image other | `HeroSplit` |
| Split layout with multiple image grid (2-3 images) | `HeroSplitImages` |
| Video placeholder or cinematic header | `HeroVideo` |
| Clean text-only header, no image | `HeroMinimal` |
| Animated gradient / abstract colorful background | `HeroAurora` or `HeroMeshGradient` |
| Glassmorphism hero with blur/glow effects | `HeroShaderGlass` |
| Clean modern hero with gradient text + showcase image | `HeroDesignali` |
| Animated pattern/grid background (checks, stripes) | `HeroWarpShader` |
| Dark futuristic / cyberpunk / grid-line aesthetic | `HeroFuturistic` |
| **CONTENT** | |
| 3-4 icon+text cards in a grid | `ValueProps` |
| 6+ feature items in grid/list | `Features` |
| Text block + image side by side with stats | `About` |
| Product category cards | `ProductShowcase` |
| Quote/review cards with star ratings | `Testimonials` |
| Avatar stack + rating + customer count (compact) | `SocialProof` |
| Image grid / masonry layout | `Gallery` |
| Video + image mixed grid with lightbox | `VideoGallery` |
| Big number counters on colored bg | `Stats` or `StatsCounter` |
| Expandable question/answer list | `FAQ` |
| Blog post cards | `BlogFeed` |
| Full-width image with overlaid text card | `ImageShowcase` |
| Full-width image with parallax scroll effect | `Parallax` |
| Scrolling logo strip / partner logos | `LogoMarquee` |
| Asymmetric card grid with mixed sizes | `BentoGrid` |
| Pricing tier cards / membership plans | `Pricing` |
| Feature comparison matrix / table | `ComparisonTable` |
| Team member cards with photos + roles | `TeamGrid` |
| Vertical timeline / milestones / history | `Timeline` |
| Numbered steps / how-it-works flow | `ProcessSteps` |
| Tabbed content panels with icons | `TabsShowcase` |
| **CTAs** | |
| Gradient banner with single CTA button | `CTABanner` |
| Image bg with CTA overlay | `CTAWithImage` |
| Steps/process diagram + image | `CTASplit` |
| Email signup / newsletter form | `Newsletter` |
| **NAVIGATION** | |
| Dark floating nav with blur | `NavDark` |
| Transparent/invisible nav | `NavTransparent` |
| Solid professional nav with cart | `NavFull` |
| Simple minimal nav | `NavMinimal` |
| Pill-shaped floating nav (premium) | `NavPill` |
| HealingBuds branded nav | `NavHealingBuds` |
| **FOOTERS** | |
| Premium footer with contact info + columns | `FooterBrand` |
| Multi-column link footer | `FooterFull` |
| Single-line minimal footer | `FooterSimple` |

**Step 4 — Extract design tokens:**

From the Figma colors/variables, extract and convert to raw HSL channels:
- Primary, secondary, accent colors → `"H S% L%"` format (NO hex, NO `hsl()` wrapper)
- Background and surface colors
- Text and heading colors
- Any gradient definitions

From typography:
- Identify heading font family and body font family
- Map to Google Fonts URL
- Extract font weights, sizes, letter-spacing if available

**Step 5 — Extract content:**

Pull actual text content from the Figma design:
- Hero headline and subtitle
- Section headings
- Value prop / feature item text
- CTA button labels
- Navigation link labels
- Footer text and tagline

Use the ACTUAL text from the Figma file — don't generate placeholder content when real content exists.

**Step 6 — Present interpretation to user for approval:**

Before generating files, present a summary:
```
Figma Import Summary:
- Brand: {name from Figma file}
- Sections detected: Hero (split) → Values (4 cards) → About → Testimonials → CTA → Footer
- Mapped to: HeroSplit → ValueProps → About → Testimonials → CTABanner
- Nav: NavFull (solid professional nav detected)
- Footer: FooterBrand (multi-column with contact)
- Colors: Primary #xxx → H S% L%, Secondary #xxx → H S% L%, ...
- Typography: {heading font} + {body font}
- Content: Using text from Figma file
- Images: {N} images detected (will need to be provided separately for S3)
```

**Wait for user approval before proceeding to Phase 2.**

**Image handling note:** Figma images can be exported via the API but quality/licensing varies.
Flag to the user which sections need images and whether the Figma images should be exported
or if they'll provide their own. Create `assets/` directory with `.gitkeep` for any missing images.

---

#### Path B: Manual Interview (no Figma URL)

**MANDATORY: You MUST complete this interview before writing ANY files.**
**DO NOT skip this phase. DO NOT assume answers. ASK the user directly.**
**Even if the user provides a brand name with context, ask what's missing.**

Use AskUserQuestion to gather these in 1-2 rounds:

**Round 1 — Identity & Mood:**
1. **Brand name & vibe** — "What's the brand called and what's the feeling? (e.g., 'GreenLeaf — earthy apothecary meets modern wellness')"
2. **Audience** — Medical patients? Recreational? Luxury? Street culture? Wellness seekers?
3. **Visual references** — Any brands, websites, or aesthetics they admire?

**Round 2 — Design Preferences:**
4. **Starting color** — A hex code, color name, or vibe ("forest green", "midnight blue", "#E8B931")
5. **Content density** — Minimal (3-4 sections), standard (5-6), rich (7-8)?
6. **Special needs** — Video hero? Blog feed? Stats? Image gallery? FAQ?
7. **Hero images** — Does the user have images/artwork to include? (Drop them in assets/)

**Skip rule:** Only skip a question if the user has EXPLICITLY answered it already in this conversation.
After the interview, summarize your understanding back to the user before proceeding.

**What NOT to ask:** Logo (uploaded via branding admin), page content beyond home.

### Phase 2: Design Decisions

**GATE CHECK: Did you complete Phase 1 (either Path A Figma import OR Path B interview)? If not, go back. No exceptions.**
**If using Figma import:** Your design decisions are largely pre-made from the Figma file. Present the choices below but pre-fill them from the Figma interpretation. Only ask the user about gaps.

Before writing any files, make these creative choices. Present them to the user as a design brief
and get approval before generating files. Document your reasoning.

#### 2.0 AI IDE MCP Integration (Stitch & 21st.dev)

If you have access to UI generation MCP tools like Stitch or 21st.dev, you MUST use them to rapidly prototype the visual design of the template or its individual sections. When doing so:
1. Provide the brand mood, audience, and constraints to the MCP server to generate a UI composition.
2. NEVER output the raw generated React/Tailwind code to the user as the final product.
3. Instead, translate the MCP's generated UI directly into the BudStacks architecture — extract the exact HSL colors, semantic CSS choices (glassmorphism borders, specific shadows, etc.), and layout structure into your 4 BudStacks pure data files.

#### 2a. Choose a Layout Archetype

See `references/layout-archetypes.md` for 12 distinct patterns. Pick one that matches the brand,
then CUSTOMIZE it — don't copy verbatim. Mix elements from multiple archetypes if the brand calls for it.

**Layout pacing principles:**
- Start strong (hero sets the tone)
- Build trust (social proof, values, about)
- Create desire (product showcase, gallery, features)
- Convert (CTA before footer)
- Vary section backgrounds (light → dark → light creates rhythm)

#### 2b. Choose Navigation Personality

| Nav Style | Best For | Personality |
|-----------|----------|-------------|
| NavDark | Premium, luxury, medical authority | Dark glassmorphic floating bar, dual CTAs |
| NavTransparent | Airy, lifestyle, image-heavy sites | Invisible until scroll, lets hero breathe |
| NavFull | Professional, feature-rich, e-commerce | Solid, reliable, cart-focused |
| NavMinimal | Clean, editorial, minimal brands | Simple, no clutter |

#### 2c. Choose Footer Personality

| Footer | Best For | Personality |
|--------|----------|-------------|
| FooterBrand | Premium, established brands | Contact info, leaf icon headers, branded |
| FooterFull | Feature-rich, multi-section sites | Comprehensive link columns |
| FooterSimple | Minimal, clean brands | Just copyright and essentials |

#### 2d. Build the Color System

See `references/color-theory.md` (creative reasoning) and `references/design-tokens.md`
(canonical CSS-variable contract + 50→900 lightness ladder + 7 mood palettes).

Don't just pick a primary and generate a scale. Think about:
- **Contrast zones:** Which sections are dark? Which are light?
- **Accent purpose:** What draws the eye? CTAs, icons, highlights?
- **Mood expression:** Warm colors = energy, comfort. Cool colors = trust, calm.
- **The "surface" color:** This is your section alternating color — make it subtle but distinct.
- **Per-section colorOverrides:** If a section needs to break from the global palette, use the
  8-key `colorOverrides` block (`primary, secondary, accent, background, surface, text, heading,
  border`) — see `references/editor-parity.md` §"Per-section colorOverrides".

#### 2e. Choose Typography

See `references/typography.md` for 15+ pairings. Consider:
- **Heading personality:** Serif = traditional/luxury. Geometric sans = modern/tech. Humanist sans = friendly.
- **Weight contrast:** Bold headings + light body = dramatic. Medium headings + regular body = balanced.
- **Letter spacing:** Tight = dense/editorial. Wide = airy/luxury. Tracked uppercase = authoritative.

#### 2f. Plan Editor-Visible Surfaces (REQUIRED)

These show up in the editor's tabs and MUST be populated for a complete operator experience —
see `references/editor-parity.md` for the canonical shapes:

- **`navigationConfig`** — links[], cta, cta2, showCart (LayoutTab + ColoursTab Nav)
- **`footerConfig`** — tagline, sections[], socialLinks[], disclaimer, address, email (LayoutTab + ColoursTab Footer)
- **`logoPlacement`** — navPosition, navSize, showBusinessName, heroShowLogo, heroX/Y, heroSize, heroStyle, footerShowLogo (BrandTab)
- **`pageContent`** — home (7 hero fields), about (4 fields), contact (5 fields), support (mirror of contact email/phone)
- **`settings.sectionPadding`** — triple value `"2rem/3rem/3.5rem"` for mobile/sm/md (DesignTab)
- **Premium tokens** — `glassEffect`, `animationType`, `dividerStyle`, `buttonHoverEffect` (DesignTab)

### Phase 3: Generate Files

#### File 1: layout.json

This is the creative backbone — which sections appear and how they're configured.

```json
{
  "version": "1.0.0",
  "navigation": "NavDark",
  "sections": [
    {
      "type": "HeroSplit",
      "id": "hero",
      "config": {
        "textAlign": "left",
        "ctaText": "Book Consultation",
        "secondaryCtaText": "View Products",
        "secondaryCtaHref": "/products"
      }
    }
  ],
  "footer": "FooterBrand",
  "settings": {
    "wrapperClass": "template-your-slug",
    "googleFontsUrl": "https://fonts.googleapis.com/css2?family=..."
  }
}
```

**Available section types and their key configs — see `references/component-catalog.md` for full details:**

**Universal Premium Controls (Can be added to ANY section's config):**
- `"animation"`: "fade-up" | "fade-left" | "fade-right" | "zoom-in" | "flip-up"
- `"dividerTop"` & `"dividerBottom"`: "wave" | "tilt" | "triangle" | "curve" | "clouds"
- `"dividerColor"` & `"dividerHeight"` (e.g., "100px")

**Heroes** (pick ONE — 13 available):
- `HeroFullScreen` — immersive, full-viewport, gradient/image bg. Config: textAlign, heroType, ctaText, secondaryCtaText, heroHeight, overlayStyle
- `HeroSplit` — two-column text+image. Config: title, subtitle, ctaText, secondaryCtaText, contentPosition ("left" | "right")
- `HeroSplitImages` — split with 2-3 image grid. Config: title, ctaText, layout ("left"|"right"), imageUrl, imageUrl2, imageUrl3, badgeText
- `HeroCollage` — multi-image collage hero (3 tiles). Config: title, ctaText, imageUrl, imageUrl2, imageUrl3
- `HeroFramed` — bordered/framed hero with prominent image. Config: title, ctaText, imageUrl, frameStyle
- `HeroVideo` — video background with watermark overlay. Config: videoUrl, watermarkUrl, textAlign, overlayOpacity, ctaText
- `HeroMinimal` — clean gradient, no image. Config: title, subtitle, ctaText
- `HeroAurora` — animated aurora/sunset CSS gradient. Config: title, ctaText, auroraIntensity ("subtle"|"medium"|"vivid")
- `HeroMeshGradient` — dark cinematic mesh shader, luxury feel. Config: title, ctaText, textAlign, shaderSpeed, wireframe
- `HeroShaderGlass` — glassmorphic with pulsing border glow. Config: title, ctaText, shaderSpeed, glowColor ("primary"|"accent"|"white")
- `HeroDesignali` — clean modern with gradient text + showcase image. Config: title, ctaText, imageUrl, badgeText, glowIntensity
- `HeroWarpShader` — animated warp pattern (WebGL). Config: title, ctaText, shaderShape ("checks"|"grid"|"stripes"), shaderSpeed, shaderSwirl
- `HeroFuturistic` — dark cyberpunk with animated grid lines. Config: title, ctaText, gridDensity, glowColor, scanLine

**Content** (pick 2-8 — 24 available):
- `About` — two-column text+image with stat counters. Config: heading, content, imageUrl, stats
- `ValueProps` — card grid (3 or 4 items). Config: heading, subtitle, items[]
- `Features` — icon+text horizontal cards (3-6 items). Config: heading, subtitle, items[]
- `FeaturesShowcase` — premium features showcase with rich imagery. Config: heading, subtitle, features[] (title, description, imageUrl)
- `ProductShowcase` — product category cards. Config: heading, subtitle, categories[]
- `Testimonials` — star-rating review cards. Config: heading, subtitle, items[]
- `SocialProof` — compact avatar stack + rating + count. Config: heading, avatars, count, label, rating, testimonial
- `Gallery` — masonry image grid. Config: heading, subtitle, items[]
- `VideoGallery` — video+image grid with lightbox modal. Config: heading, subtitle, items[] (type, src, thumbnail, title, span)
- `Stats` — animated number counters on gradient bg. Config: heading, items[]
- `StatsCounter` — upgraded Stats with spring physics + icons. Config: heading, items[] (value, suffix, label, icon)
- `FAQ` — accordion. Config: heading, subtitle, items[]
- `BlogFeed` — latest posts. Config: heading, subtitle
- `ImageShowcase` — full-width bg image with overlay card. Config: heading, content, imageUrl, overlayStyle, ctaText
- `Parallax` — full-width parallax scroll image. Config: heading, description, imageUrl, ctaText, overlayOpacity
- `LogoMarquee` — infinite scrolling logo carousel. Config: heading, logos[] (src, alt), speed, reverse
- `TextMarquee` — infinite scrolling text strip (statements/values). Config: items[], speed, reverse, separator
- `BentoGrid` — asymmetric card grid with mixed sizes. Config: heading, subtitle, cards[] (icon, title, description, span, imageUrl)
- `Pricing` — 2-3 tier pricing cards. Config: heading, subtitle, tiers[] (name, price, description, features[], cta, highlighted)
- `TeamGrid` — team member cards with avatars. Config: heading, subtitle, members[] (name, role, avatar, bio)
- `Timeline` — vertical timeline with year labels. Config: heading, subtitle, entries[] (year, title, description, imageUrl)
- `ComparisonTable` — feature comparison matrix. Config: heading, subtitle, tiers[], features[] (name, values[])
- `ProcessSteps` — numbered steps with connecting lines. Config: heading, subtitle, orientation, steps[] (title, description, icon)
- `TabsShowcase` — tabbed content with icons + images. Config: heading, subtitle, tabs[] (label, icon, title, description, imageUrl)

**CTAs** (pick 0-2 — 4 available):
- `CTABanner` — gradient banner. Config: heading, subtitle, ctaText
- `CTAWithImage` — image bg with overlay. Config: heading, subtitle, ctaText, imageUrl
- `CTASplit` — split text+steps+image. Config: heading, subtitle, ctaText, imageUrl
- `Newsletter` — email signup form. Config: heading, subtitle, placeholder, buttonText

**Section IDs:** Give each section a unique, semantic ID (e.g., "hero", "about", "values", "showcase", "reviews", "cta"). These are used for CSS scoping.

#### File 2: defaults.json

The complete design system + default content. This is what makes each template feel different.

```json
{
  "template": "your-slug",
  "slug": "your-slug",
  "logoPath": null,
  "heroImagePath": null,
  "heroVideoPath": null,
  "primaryColor": "H S% L%",
  "fontFamily": "full font stack",
  "designSystem": {
    "colors": {
      "primary-scale": { "50": "...", ... "900": "..." },
      "primary": "H S% L%",
      "secondary": "H S% L%",
      "accent": "H S% L%",
      "background": "H S% L%",
      "surface": "H S% L%",
      "text": "H S% L%",
      "heading": "H S% L%",
      "border": "H S% L%",
      "success": "142 76% 36%",
      "warning": "38 92% 50%",
      "error": "0 72% 51%",
      "info": "199 89% 48%"
    },
    "typography": { ... },
    "shadows": { ... },
    "gradients": { ... },
    "spacing": { "section": "5rem", "container": "1.5rem", "card": "2rem" },
    "borderRadius": { "sm": "0.375rem", "md": "0.75rem", "lg": "1rem", "xl": "1.5rem", "2xl": "2rem", "full": "9999px" }
  },
  "valueProps": [ ... ],
  "pageContent": {
    "homeHeroTitle": "...",
    "homeHeroSubtitle": "...",
    "homeHeroDescription": "...",
    "aboutMission": "...",
    "educationHotspots": [
      {
        "id": "spot1",
        "targetSectionId": "hero",
        "x": 25,
        "y": 50,
        "title": "Premium Quality",
        "description": "Information about this hotspot."
      }
    ]
  },
  "navigation": {
    "links": [ { "label": "...", "href": "/..." } ],
    "cta": { "label": "...", "href": "/consultation" },
    "cta2": { "label": "...", "href": "/login" },
    "showCart": true
  },
  "footer": {
    "tagline": "...",
    "disclaimer": "...",
    "sections": [ { "title": "...", "links": [...] } ]
  }
}
```

**CRITICAL COLOR RULES:**
- ALL colors MUST be raw HSL: `"178 48% 21%"`
- NEVER hex: `"#2A3D3A"`
- NEVER hsl() wrapper: `"hsl(178, 48%, 21%)"`
- Use `references/color-theory.md` for scale generation

**Navigation links** — always use relative paths starting with `/`:
The platform prefixes these with the tenant base path automatically.

**Available Pages (all routes handled by the platform):**

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Storefront homepage |
| Products | `/products` | Product catalog |
| Product Detail | `/products/[id]` | Single product |
| Conditions | `/conditions` | Medical conditions |
| Condition Detail | `/conditions/[id]` | Single condition |
| The Wire | `/the-wire` | Blog/news |
| Blog Post | `/the-wire/[slug]` | Single post |
| About | `/about` | Company info |
| Contact | `/contact` | Contact form |
| Consultation | `/consultation` | Book consultation |
| FAQ | `/faq` | FAQ page |
| How It Works | `/how-it-works` | Process explainer |
| Cart | `/cart` | Shopping cart |
| Checkout | `/checkout` | Checkout flow |
| Login | `/login` | Patient login |
| Register | `/register` | Registration |
| Dashboard | `/dashboard` | Patient dashboard |
| Settings | `/settings` | Account settings |
| Privacy | `/privacy` | Privacy policy |
| Terms | `/terms` | Terms of service |
| Regulatory | `/regulatory` | Compliance info |

**Default Top Navigation:**
```json
{
  "links": [
    { "label": "About Us", "href": "/about" },
    { "label": "Research", "href": "/conditions" },
    { "label": "The Wire", "href": "/the-wire" },
    { "label": "Eligibility", "href": "/consultation" },
    { "label": "Strains", "href": "/products" }
  ],
  "cta": { "label": "Check Eligibility", "href": "/consultation" },
  "cta2": { "label": "Patient Login", "href": "/login" },
  "showCart": true
}
```

**Default Footer Sections:**
```json
{
  "sections": [
    {
      "title": "Company",
      "links": [
        { "label": "About Us", "href": "/about" },
        { "label": "Our Products", "href": "/products" },
        { "label": "The Wire", "href": "/the-wire" },
        { "label": "Contact", "href": "/contact" }
      ]
    },
    {
      "title": "Resources",
      "links": [
        { "label": "Patient Access", "href": "/consultation" },
        { "label": "Conditions Treated", "href": "/conditions" },
        { "label": "FAQ", "href": "/faq" }
      ]
    },
    {
      "title": "Legal",
      "links": [
        { "label": "Privacy Policy", "href": "/privacy" },
        { "label": "Terms of Service", "href": "/terms" },
        { "label": "Regulatory", "href": "/regulatory" }
      ]
    }
  ]
}
```

#### File 3: styles.css

This is where templates truly differentiate. Don't just swap colors — create a unique CSS treatment.

```css
@import url('https://fonts.googleapis.com/css2?family=...');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ===== Template Styles ===== */
:root {
  --tenant-color-primary: H S% L%;
  --tenant-color-secondary: H S% L%;
  --tenant-color-accent: H S% L%;
  --tenant-color-background: H S% L%;
  --tenant-color-surface: H S% L%;
  --tenant-color-text: H S% L%;
  --tenant-color-heading: H S% L%;
  --tenant-color-border: H S% L%;
  --tenant-font-base: 'Font Name', fallbacks;
  --tenant-font-heading: 'Font Name', fallbacks;
}
```

**Creative CSS techniques to differentiate templates:**

1. **Dark section scoping** — Override CSS vars per section ID:
```css
.template-slug #values {
  --tenant-color-surface: 210 20% 15%;
  --tenant-color-heading: 0 0% 100%;
  --tenant-color-text: 0 0% 90%;
}
```

2. **Footer dark treatment** — Always override for dark-bg footers:
```css
.template-slug footer {
  --tenant-color-surface: H S% L%;
  --tenant-color-background: H S% L%;
  --tenant-color-heading: 0 0% 100%;
}
```

3. **Custom shadows** — Brand-tinted shadows:
```css
.template-slug {
  --shadow-card: 0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(R,G,B,0.05);
  --shadow-elegant: 0 8px 24px -4px rgba(R,G,B,0.08);
}
```

4. **Glassmorphism** (for premium feels): Built into the template engine!
Use `overlayStyle: "glass"` in Hero configs, or apply `.glass-panel` class.
Override the blur tokens in your root block if desired:
```css
:root {
  --tenant-blur-sm: 8px;
  --tenant-blur-md: 16px;
  --tenant-blur-lg: 24px;
}
.template-slug .btn-glass {
  backdrop-filter: blur(var(--tenant-blur-md));
  background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
  border: 1px solid rgba(255,255,255,0.4);
}
```

5. **Hover animations** — Vary by personality:
```css
.template-slug .hover-lift:hover { transform: translateY(-2px); }  /* subtle */
.template-slug .hover-lift:hover { transform: translateY(-4px) scale(1.01); }  /* energetic */
```

6. **Custom keyframe animations** for unique motion feel

7. **Section padding overrides** in layout.json settings:
```json
"sectionPadding": "2rem/3rem/3.5rem"  // mobile/sm/md
```

#### File 4: template.config.json

```json
{
  "id": "template-slug",
  "slug": "template-slug",
  "name": "Display Name",
  "description": "One-liner describing the visual identity and target audience",
  "category": "medical|wellness|modern|luxury|street|editorial",
  "tags": ["relevant", "descriptive", "keywords"],
  "features": ["Key visual feature 1", "Key visual feature 2", "Key visual feature 3"],
  "author": "BudStacks Platform",
  "version": "1.0.0"
}
```

### Phase 4: CSS Scoping for Dark/Light Sections

Any section on a dark background needs its CSS variables overridden. The platform uses
`--tenant-color-heading` and `--tenant-color-text` which default to dark values for light backgrounds.

**Pattern:** Target the section by its `id` from layout.json:
```css
/* Dark section: override to white text */
.template-slug #stats {
  --tenant-color-heading: 0 0% 100%;
  --tenant-color-text: 0 0% 90%;
}

/* Cards inside dark section: restore dark text on white card bg */
.template-slug #values .rounded-2xl {
  --tenant-color-heading: 210 40% 20%;
  --tenant-color-text: 0 0% 17%;
}
```

**Sections that commonly need dark treatment:**
- `Stats` (has gradient primary→secondary background)
- `ValueProps` (when given a dark surface override)
- `CTABanner` (has gradient primary→secondary background)
- `ImageShowcase` (when using dark overlay)
- Footer (always dark)

### Phase 5: Assets & Images

**CRITICAL: Templates without images look like blank garbage.** Gradient placeholders are NOT acceptable
for a finished template. Every template MUST ship with images.

**How assets work:**
- Create an `assets/` directory inside the template
- Reference image paths as relative: `"assets/hero.jpg"`, `"assets/lab-scene.jpg"`
- `heroImagePath` in defaults.json: `"assets/hero.jpg"` (NOT null)
- Section configs: `"imageUrl": "assets/about-photo.jpg"`
- When uploaded to S3, the entire `assets/` directory is uploaded recursively
- The platform signs these relative paths at render time

**If the user has artwork/screenshots:**
- Copy them directly into `assets/` with descriptive names
- Reference them in the appropriate configs

**If NO images are available yet (MANDATORY NANO BANANA WORKFLOW):**
- If you have access to the **Nano Banana MCP server**, you MUST use it to generate placeholder images.
- Create the `assets/` directory.
- Use Nano Banana to generate high-quality images matching the brand's aesthetic (e.g., "A modern, well-lit cannabis dispensary interior, architectural photography, 16:9 ratio").
- Save these images directly into the `template-name/assets/` folder (e.g., `hero.png`, `about.png`).
- Make sure `layout.json` and `defaults.json` reference these newly generated assets.
- If Nano Banana is unavailable, create an `assets/.gitkeep`, set placeholder paths, and explicitly tell the user which images they need to provide.

**Asset naming convention:**
```
assets/
  hero.jpg          — HeroSplit/HeroFullScreen right panel or background
  lab-scene.jpg     — ImageShowcase background
  about.jpg         — About section image
  consultation.jpg  — CTASplit/CTAWithImage image
  gallery-1.jpg     — Gallery items
  gallery-2.jpg
```

### Phase 6: Validate

**Visual / asset checklist:**
- [ ] All colors are raw HSL (no hex, no hsl() wrapper) — see `references/design-tokens.md`
- [ ] `wrapperClass` in layout.json matches CSS class prefix
- [ ] Google Fonts URL in BOTH layout.json settings AND styles.css @import
- [ ] Footer has dark CSS scoping (heading: white)
- [ ] Stats/CTABanner have dark CSS scoping if used
- [ ] Navigation links use relative paths (/products, not https://...)
- [ ] `heroImagePath` references an asset (NOT null unless no hero image)
- [ ] Section imageUrl paths reference files in assets/ — see `references/assets-pipeline.md`
- [ ] `assets/` directory exists with actual images or .gitkeep
- [ ] Section IDs are unique and semantic
- [ ] template.config.json slug matches defaults.json slug
- [ ] No React code anywhere — pure data files only

**Round-trip checklist (editor will silently drop unknown keys):**
- [ ] Every section `type` exists in `references/component-catalog.md` (50 valid types)
- [ ] Every section `config` field exists in that section's schema (no invented keys)
- [ ] Per-section `colorOverrides` keys ⊆ `{primary, secondary, accent, background, surface, text, heading, border}`
- [ ] `navigationConfig` populated (links[], cta, cta2, showCart) — see editor-parity.md §5
- [ ] `footerConfig` populated (tagline, sections[], socialLinks[], disclaimer) — see editor-parity.md §6
- [ ] `pageContent.{home, about, contact}` populated — see `references/page-content.md`
- [ ] `pageContent.support.{contactEmail, contactPhone}` mirrors `pageContent.contact.{email, phone}`
- [ ] `pageContent.logoPlacement` complete with all 9 keys, numerics within editor ranges
- [ ] `settings.sectionPadding` is triple-value `"mobile/sm/md"` if set
- [ ] Asset URLs are path-only (no `?` query strings) and use the seven `SECTION_ASSET_KEYS`

**Compliance + accessibility checklist:**
- [ ] Footer disclaimer matches target market (PT/UK/DE/multi) — see `references/copy-style-cannabis.md`
- [ ] No forbidden copy ("cure", "100% safe", recreational framing)
- [ ] Contrast pairs meet WCAG 2.2 AA (4.5:1 body, 3:1 large) — see `references/accessibility-checklist.md`
- [ ] Focus indicator: `*:focus-visible { outline: 2px solid hsl(var(--tenant-color-accent)); outline-offset: 2px; }`
- [ ] `prefers-reduced-motion` honoured in styles.css

**Run the structural validator before delivery:**
```bash
node scripts/validate-layout.ts <path-to>/layout.json <path-to>/defaults.json
```
Exits 0 on PASS, 1 on FAIL. Fix every error before shipping; warnings are advisory.

### Phase 7: Uniqueness Check

**MANDATORY: Before outputting, compare against existing templates.**

Read the layout.json of the 2-3 most recent templates in `/Users/gkavanagh/Development/HealingBuds/templates/`
and verify your new template is STRUCTURALLY DIFFERENT:

- Different hero type from the last template?
- Different nav component?
- Different footer component?
- At least 2 sections that the last template doesn't use?
- Different visual rhythm (light/dark pattern)?

If your template is too similar, go back and redesign. The whole point is variety.

### Phase 8: Output & Next Steps

Output to the current working directory or a `templates/` directory if one exists nearby.
If unsure, ask the user where to output.

**Mandatory pre-ship gate:**
```bash
node scripts/validate-layout.ts ./template-name/layout.json ./template-name/defaults.json
```
Must exit 0. If it fails, fix and re-run before any of the steps below.

Then guide the user:
1. Initialize git repo: `cd template-name && git init && git add . && git commit -m "Initial template"`
2. Push to GitHub (create repo)
3. Upload via BudStacks super admin → Templates → Upload from GitHub
4. Preview at `/store/preview/{slug}`
5. Open the editor at `/tenant-admin/branding/` and confirm round-trip:
   - LayoutTab: every section listed, drag-reorder works
   - ContentTab: every field renders an input, edits round-trip
   - ColoursTab: per-section override panel shows all 8 keys
   - BrandTab: LogoPlacement controls reflect emitted values
   - DesignTab: glass / animation / divider tokens toggle visibly
   - Re-save → re-export → diff against original layout.json (functional equivalence)

## Creative Constraints

**DO:**
- Vary layouts dramatically between templates
- Use different hero types for different moods
- Create unique color stories (not just "blue version" and "green version")
- Think about visual rhythm and pacing
- Match typography to brand personality
- Use CSS scoping creatively for section-level treatments
- Write content that matches the brand voice
- Include actual images in assets/ — templates without images look broken
- Use ImageShowcase, Gallery, CTASplit, CTAWithImage — the visual-heavy components most templates ignore

**DON'T:**
- Copy the same section order every time
- Use the same nav+footer combo repeatedly
- Write generic "Lorem ipsum" content
- Add React components or .tsx files
- Reference absolute URLs for images
- Use hex colors anywhere in the data files
- Include pages beyond the home page
- Over-engineer — keep sections to 3-8 per template
- Set heroImagePath to null — always reference an asset
- Default to HeroFullScreen every time — use HeroSplit, HeroVideo, HeroMinimal
- Ignore the new components — use LogoMarquee, BentoGrid, ProcessSteps, TabsShowcase, Parallax, etc.
- Skip image export — always use Figma Images API to pull real assets into assets/

---

## Figma Import: Complete Workflow Reference

This is the end-to-end pipeline for converting any Figma design into a BudStacks template.

### Quick Reference: Figma API Endpoints

```bash
# 1. Get full file (structure, text, colors, fonts)
curl -s -H "X-Figma-Token: {KEY}" "https://api.figma.com/v1/files/{FILE_KEY}"

# 2. Export images from specific nodes (scale=2 for retina)
curl -s -H "X-Figma-Token: {KEY}" "https://api.figma.com/v1/images/{FILE_KEY}?ids={NODE_IDS}&format=png&scale=2"

# 3. Get file styles (published styles only)
curl -s -H "X-Figma-Token: {KEY}" "https://api.figma.com/v1/files/{FILE_KEY}/styles"
```

### Image Export Strategy

**CRITICAL: Two types of image export exist — know the difference:**

#### Type 1: Node Render (NO imageRef) — Full-size composed image
When you call `download_figma_images` with a nodeId but **WITHOUT** an `imageRef`, the Figma API
RENDERS the node with all its children at the requested scale. This produces a full-size, web-ready
image exactly as it appears in the design.

**Use this for:**
- Full-page design reference screenshots (export the root frame)
- Section screenshots for visual comparison
- Composed visuals (hero with overlays, cards with text, etc.)
- ANY image where you want the final composed result

#### Type 2: Fill Image (WITH imageRef) — Raw source fill
When you include an `imageRef`, it downloads the raw image fill from that specific node. This can
be a tiny thumbnail, a cropped portion, or a low-res placeholder — **you have no control over the
source resolution.**

**Use this ONLY for:**
- Raw background photos you'll use as CSS backgrounds
- Source images you know are high-res from the Figma data

#### Correct Export Workflow

1. **Export the full page as a reference** (Node Render, no imageRef):
   ```
   {nodeId: "ROOT_FRAME", fileName: "design-reference.png"}
   ```

2. **Export each section GROUP as a composed screenshot** (Node Render, no imageRef):
   ```
   {nodeId: "HERO_GROUP", fileName: "hero-composed.png"}
   {nodeId: "PARTNERS_GROUP", fileName: "partners-composed.png"}
   ```

3. **Export individual images at full size** (Node Render on the IMAGE rectangle, no imageRef):
   ```
   {nodeId: "PARTNER_PHOTO_RECT", fileName: "partner-erik.png"}
   ```
   This renders the rectangle at its Figma dimensions × pngScale. A 458×497px rectangle at
   scale=2 produces a 916×994px image — perfect for web.

4. **Only use imageRef as a last resort** when you specifically need the raw source image
   and you've verified it's high-res.

#### Quality Checklist
- **Minimum file size for photos:** >50KB (if a "photo" is 9KB, something is wrong)
- **Always use pngScale: 2** for retina-ready images
- **Verify sizes after download** — `ls -lh assets/` and flag anything suspiciously small

#### Rate Limit Awareness (Figma API: ~30 requests/minute)
- **Batch all image downloads into ONE call** — pass all nodes in a single array
- **Never retry 429 errors immediately** — wait at least 60 seconds, or ask the user to export manually
- **Minimize total API calls:** 1 for `get_figma_data` + 1 for `download_figma_images` = 2 total
- **If rate-limited:** Ask the user to manually export from Figma (Select node → Export → PNG 2x)

#### Semantic naming:
- Hero image → `hero.png`
- About section image → `about.png`
- Team/partner photos → `partner-{name}.png`
- Brand images → `brand-{name}.png`
- Gallery images → `gallery-{n}.png`
- Section backgrounds → `bg-{section}.png`

### Section Mapping Intelligence

When interpreting a Figma design, think in terms of **what the section does**, not just what it looks like:

- A row of logos → `LogoMarquee` (not "skip it")
- A large mixed-size card grid → `BentoGrid` (not just "ValueProps")
- Numbered steps → `ProcessSteps` (not `CTASplit`)
- A tabbed interface → `TabsShowcase` (not `Features`)
- A full-width photo break → `Parallax` (not `ImageShowcase`)
- An email signup form → `Newsletter` (not `CTABanner`)
- A comparison matrix → `ComparisonTable` (not "skip it")
- Staff/team photos → `TeamGrid` (not `About`)
- Brand history / milestones → `Timeline` (not `About`)

### Confidence Scoring

When mapping Figma sections to BudStacks components, rate your confidence:
- **High (90%+):** Clear visual match (e.g., accordion = FAQ, star ratings = Testimonials)
- **Medium (60-89%):** Reasonable interpretation (e.g., large card grid could be BentoGrid or ProductShowcase)
- **Low (<60%):** No clear match — flag to user and suggest closest option or skip

Present low-confidence mappings to the user for decision before generating files.
