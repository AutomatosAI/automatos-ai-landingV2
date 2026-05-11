# BudStacks Template Creator

An AI-powered skill for [Claude Code](https://claude.ai/claude-code) that designs and generates production-ready storefront templates for the BudStacks cannabis SaaS platform.

Provide an optional Figma URL, or just describe your brand. The AI either intelligently interprets your design or interviews you, creates a unique template, and generates everything you need — ready to upload and go live.

## How It Works

**Templates are pure data.** No React code. No custom components. Just 4 files that tell the BudStacks rendering engine what to display and how to style it. The platform has 22 pre-built section components — your template simply composes and configures them.

```
Figma URL (Optional)  OR  Your Brand Description
        |                         |
        |                         v
        |                   AI Brand Interview
        |---------<-------- (if no Figma URL)
        v
  Design Brief
  (archetype, sections, typography, color system)
        |
        v
  4 Generated Files + Assets
        |
        v
  Upload to BudStacks → Live Store
```

## Quick Start

### Prerequisites

- [Claude Code CLI](https://claude.ai/claude-code) installed
- A BudStacks platform account (for uploading and previewing)

### Install

```bash
git clone https://github.com/Gerard161-Site/budstack-template-skill.git
cd budstack-template-skill
chmod +x install.sh
./install.sh
```

### Create Your First Template

Open Claude Code in any project directory and type:

```
/create-budstacks-template
```

The AI will walk you through everything.

---

## Sample Prompts

The skill responds to natural language. Here are some ways to kick off a template:

### Figma Import (Skips Interview)
```
/create-budstacks-template https://www.figma.com/design/HqvNJqJy8Xvu3KWYu8QLUV/My-Dispensary
```

### Minimal Context (AI will ask follow-up questions)
```
/create-budstacks-template GreenLeaf
```

### Full Brief (AI can skip straight to design)
```
/create-budstacks-template

Brand: Kush Kingdom
Vibe: Luxury dispensary, dark and premium, think high-end whiskey bar meets cannabis
Audience: 30-50 year old professionals, high income, quality over quantity
Colors: Deep burgundy and gold
Sections: I want it rich — 7-8 sections, video hero, product showcase, testimonials
```

### Style-Driven
```
/create-budstacks-template

Name: Bloom Wellness
Think: Organic, calm, like walking into a day spa
Light earthy tones — sage greens, warm creams
Minimal sections, lots of whitespace
Serif headings for that editorial magazine feel
```

### Youth / Street Culture
```
/create-budstacks-template

Dr Haze — mad scientist meets South African cannabis genetics
18-35 year olds, bold, fun but medically credible
Neon green on dark backgrounds
I have character artwork to use as hero images
```

### Conversion-Focused
```
/create-budstacks-template

MedCanna Clinic
Medical authority — we need patients to book consultations
Professional but not sterile, trustworthy
Split hero with doctor imagery
Show the 3-step consultation process prominently
Include FAQ for eligibility questions
```

---

## The Template System Explained

### Why Data-Driven?

Traditional website themes ship entire codebases. When the platform updates a component, every theme breaks. BudStacks solves this differently:

- **The platform owns the components** — 22 battle-tested React sections maintained centrally
- **Templates own the composition** — which sections appear, in what order, with what config
- **Templates own the styling** — CSS variables, scoped overrides, animations
- **Templates own the content** — default text, navigation links, footer structure

When we improve a component (better animations, accessibility fixes, new features), **every template benefits automatically** without any changes to the template files.

### The 4 Files

```
your-brand/
├── layout.json            What sections, in what order, with what configuration
├── defaults.json          The complete design system + default content
├── styles.css             Scoped CSS that makes this template visually unique
├── template.config.json   Marketplace metadata (name, description, tags)
└── assets/                Images that ship with the template
    ├── hero.jpg
    ├── about.jpg
    └── ...
```

#### layout.json — The Blueprint

Defines the page structure: which components render, in what order, with what settings.

```json
{
  "navigation": "NavDark",
  "sections": [
    { "type": "HeroSplit", "id": "hero", "config": { "textAlign": "left", "ctaText": "Get Started" } },
    { "type": "ImageShowcase", "id": "lab", "config": { "imageUrl": "assets/lab.jpg", "overlayStyle": "gradient-left" } },
    { "type": "ValueProps", "id": "values", "config": { "items": [...] } },
    { "type": "CTASplit", "id": "consult", "config": { "heading": "3 Easy Steps" } }
  ],
  "footer": "FooterBrand"
}
```

#### defaults.json — The Design System

Every color, font, spacing value, and default text lives here. This is what tenants override when they customize via their branding admin.

```json
{
  "primaryColor": "155 70% 35%",
  "designSystem": {
    "colors": {
      "primary": "155 70% 35%",
      "accent": "135 100% 55%",
      "background": "170 40% 4%",
      "...": "..."
    },
    "typography": {
      "headingFont": "'Space Grotesk', sans-serif",
      "bodyFont": "'DM Sans', sans-serif"
    }
  },
  "pageContent": {
    "homeHeroTitle": "The Science of Perfect Cannabis",
    "homeHeroSubtitle": "South Africa's Purest Strains"
  }
}
```

**All colors are raw HSL** — `"155 70% 35%"`, never hex, never `hsl()` wrapped. The platform wraps them at render time.

#### styles.css — The Visual Identity

This is where templates truly differentiate. Same components can look completely different through CSS:

```css
/* Dark theme with neon glow */
.template-dr-haze #values .rounded-2xl:hover {
  border-color: hsl(135 100% 55% / 0.3);
  box-shadow: 0 0 20px rgba(26, 255, 83, 0.06);
}

/* Warm organic feel */
.template-bloom #hero {
  --tenant-color-heading: 32 45% 25%;
  --tenant-color-text: 32 20% 35%;
}
```

Techniques the AI uses: section-scoped CSS variable overrides, neon glows, glassmorphism, dot grid patterns, custom scrollbars, selection colors, heading underline accents, hover animations.

---

## Available Components

The AI picks from these 22 registered section components:

### Heroes (pick one — sets the first impression)

| Component | Best For | Visual |
|-----------|----------|--------|
| **HeroFullScreen** | Bold, immersive brands | Full-viewport with gradient/image bg, ambient glow |
| **HeroSplit** | Professional, medical | Two-column: text left, image right |
| **HeroVideo** | Premium brands with video | Looping video background with cinematic overlay |
| **HeroMinimal** | Editorial, text-first | Clean gradient, purely typographic |

### Content Sections (pick 2-6 — tell the brand story)

| Component | Best For | Visual |
|-----------|----------|--------|
| **ValueProps** | Trust building, differentiators | 3-4 icon cards in a grid |
| **Features** | Detailed capabilities | Horizontal icon+text cards, 3-column |
| **About** | Brand story, credibility | Two-column text + image with stat counters |
| **ProductShowcase** | E-commerce, category browsing | 4-card product category grid |
| **Testimonials** | Social proof | Star-rating review cards |
| **Gallery** | Visual brands, lifestyle | Masonry image grid with hover zoom |
| **Stats** | Authority, impressive metrics | Animated counters on gradient background |
| **FAQ** | Reducing support, compliance | Accordion with expand/collapse |
| **BlogFeed** | Content marketing | Latest 3 blog post cards |
| **ImageShowcase** | Visual breaks, facility tours | Full-width bg image with floating card overlay |

### CTAs (pick 0-2 — drive conversion)

| Component | Best For | Visual |
|-----------|----------|--------|
| **CTABanner** | Simple conversion | Gradient banner with centered CTA |
| **CTAWithImage** | Visual CTAs | Image background with colored overlay |
| **CTASplit** | Process explanation | Split layout: 3-step process + image |

### Navigation

| Component | Personality |
|-----------|-------------|
| **NavDark** | Premium, luxury — dark glassmorphic floating bar with dual CTAs |
| **NavTransparent** | Airy, lifestyle — invisible until scroll |
| **NavFull** | Professional, e-commerce — solid bar with cart |
| **NavMinimal** | Clean, editorial — just links, no clutter |

### Footers

| Component | Personality |
|-----------|-------------|
| **FooterBrand** | Premium — contact icons, leaf headers, branded |
| **FooterFull** | Comprehensive — multi-column link sections |
| **FooterSimple** | Minimal — just copyright and essentials |

---

## 12 Layout Archetypes

The AI knows these page composition patterns and mixes them for variety. No two templates should follow the same structure.

| # | Archetype | Mood | Key Sections |
|---|-----------|------|-------------|
| 1 | **The Authority** | Trustworthy, clinical | HeroSplit + About + Features + CTASplit + FAQ |
| 2 | **The Cinematic** | Aspirational, immersive | HeroVideo + ImageShowcase + ValueProps + BlogFeed |
| 3 | **The Minimalist** | Sophisticated restraint | HeroMinimal + ValueProps + CTABanner |
| 4 | **The Storyteller** | Narrative, emotional | HeroFullScreen + About + Testimonials + CTAWithImage |
| 5 | **The Marketplace** | Browse, discover, buy | HeroFullScreen + ProductShowcase + Stats + Testimonials |
| 6 | **The Rebel** | Edgy, high-energy | HeroFullScreen + Stats + Features + Gallery |
| 7 | **The Wellness Retreat** | Calm, holistic | HeroFullScreen + ValueProps + About + FAQ |
| 8 | **The Tech Forward** | Innovation, data-driven | HeroSplit + Features + Stats + BlogFeed |
| 9 | **The Gallery First** | Let visuals speak | HeroFullScreen + Gallery + About |
| 10 | **The Converter** | Clear path to action | HeroFullScreen + CTASplit + ValueProps + FAQ |
| 11 | **The Magazine** | Content-rich, editorial | HeroMinimal + BlogFeed + Features |
| 12 | **The Showcase** | Show, don't tell | HeroVideo + ImageShowcase + Stats + ProductShowcase |

---

## Tips for Creative Templates

### Think in Moods, Not Features

Don't say "I want ValueProps and Stats." Say "I want it to feel like a high-end whiskey brand" or "think Apple Store meets cannabis." The AI translates mood into component choices.

### Bring Images (or let AI generate them)

Templates without images look like empty wireframes. If you have the **Nano Banana MCP** server enabled, the AI will automatically generate high-quality, brand-aligned placeholder images for your template!

Otherwise, the AI will set up asset references and you just need to drop your images into the `assets/` directory:

- Hero image or character art (for HeroSplit / HeroFullScreen)
- Facility or lifestyle photo (for ImageShowcase / About)
- Product photography (for Gallery)
- Team or consultation imagery (for CTASplit / CTAWithImage)

### Dark Themes Hit Different

Dark backgrounds with bright accents (neon green, electric blue, gold) create instant visual impact. The AI handles the CSS scoping automatically — overriding heading/text colors per section so everything stays readable.

### Mix Archetypes

The best templates aren't pure archetypes — they're hybrids. "Authority + Storyteller" or "Rebel + Marketplace." Tell the AI what you want to combine.

### Content Density Matters

- **3-4 sections:** Minimal, fast, high-impact (great for brands with strong imagery)
- **5-6 sections:** Standard, balanced (most versatile)
- **7-8 sections:** Rich, comprehensive (good for brands that need to explain a lot)

More isn't always better. A focused 4-section template with killer images beats an 8-section wall of text.

### Supercharge with MCP Tools

This skill is designed to intelligently leverage other Claude Code MCP servers if you have them installed:
- **Figma MCP**: Provide a Figma URL and the AI will automatically extract the layout, colors, typography, and text directly from your design file.
- **Nano Banana MCP**: The AI will automatically generate and save high-quality, brand-matched placeholder images directly into the template's `assets/` folder.
- **Stitch / 21st.dev MCPs**: The AI can use these tools to prototype UI visually, then perfectly translate those designs into the BudStacks pure data format.

---

## After Generating

1. **Review the files** — check the design brief the AI presents before generating
2. **Add your images** — drop brand imagery into the `assets/` directory
3. **Init and push:**
   ```bash
   cd your-brand-template
   git init && git add . && git commit -m "Initial template"
   # Create GitHub repo, then:
   git remote add origin https://github.com/yourorg/your-brand-template.git
   git push -u origin main
   ```
4. **Upload to BudStacks** — Super Admin → Templates → Upload from GitHub
5. **Preview** — Visit `/store/preview/{slug}` to see it rendered
6. **Tenants clone it** — appears in the marketplace for tenants to browse and activate

---

## Repo Structure

```
budstack-template-skill/
├── README.md                         You're reading this
├── SKILL.md                          The AI's complete creative workflow
├── install.sh                        One-command installer
├── references/
│   ├── component-catalog.md          22 section components with config tables
│   ├── layout-archetypes.md          12 page composition patterns
│   ├── typography.md                 20 Google Font pairings across 8 moods
│   └── color-theory.md              HSL color system, mood palettes, scale generation
└── scripts/
    └── helpers.ts                    HEX/HSL/RGB conversion utilities
```

---

## Requirements

- [Claude Code CLI](https://claude.ai/claude-code) (any version with skill support)
- Git (for pushing templates to GitHub)
- BudStacks platform access (for uploading and previewing)

---

## License

Proprietary — for use by BudStacks platform developers and authorized partners.
