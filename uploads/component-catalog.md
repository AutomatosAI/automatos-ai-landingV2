# BudStacks Component Catalog (Round-Trip Reference)

> **Source of truth:** `nextjs_space/lib/section-schemas.ts` and `nextjs_space/lib/section-registry.ts` in the budstack-saas repo.
> Every field listed here corresponds 1:1 to a field the Store Editor renders. If you emit a field key not in this catalog, the editor will silently ignore it; if you omit a key, the editor falls back to schema defaults.

## Counts

| Category | Count | Components |
|---|---|---|
| Heroes | 13 | HeroFullScreen, HeroSplit, HeroVideo, HeroMinimal, HeroWarpShader, HeroMeshGradient, HeroAurora, HeroShaderGlass, HeroDesignali, HeroSplitImages, HeroFuturistic, HeroCollage, HeroFramed |
| Content | 24 | ValueProps, ProductShowcase, Testimonials, About, Gallery, Stats, FAQ, BlogFeed, Features, ImageShowcase, LogoMarquee, BentoGrid, Pricing, TeamGrid, Timeline, ComparisonTable, Parallax, SocialProof, TabsShowcase, VideoGallery, ProcessSteps, StatsCounter, TextMarquee, FeaturesShowcase |
| CTAs | 4 | Newsletter, CTABanner, CTASplit, CTAWithImage |
| Navigation | 6 | NavMinimal, NavDark, NavTransparent, NavFull, NavHealingBuds, NavPill |
| Footer | 3 | FooterSimple, FooterBrand, FooterFull |
| **Total** | **50** | |

## Field Type Legend

| Type | Editor renders as | Notes |
|---|---|---|
| `text` | single-line input | Use for headlines, labels |
| `textarea` | multi-line input | Use for descriptions, body copy |
| `image` | ImageUploader (S3) | Asset key — gets signed at render time |
| `video` | Video uploader (S3) | Asset key — `videoUrl` |
| `url` | URL input | Validated as URL or relative path |
| `select` | dropdown | `options[]` required |
| `number` | number input | |
| `boolean` | toggle | `default: ''` (empty string = false) |
| `array` | item repeater | `itemFields[]` defines item shape, `itemLabel` for "Add" button |
| `product-picker` | product multi-select | Returns comma-separated product IDs |

## Asset Keys

These field keys are recognized by `SECTION_ASSET_KEYS` in `nextjs_space/lib/types/template-layout.ts` and trigger S3 signing on render + stripping on save:

```
imageUrl, imageUrl2, imageUrl3, videoUrl, watermarkUrl, rightImageUrl, backgroundImageUrl
```

Every asset path you ship in `layout.json` MUST be a relative path inside `assets/` (e.g. `"assets/hero.jpg"`). The platform signs it at render time.

---

# 1 · Heroes (13)

## HeroFullScreen

- **Category:** hero
- **Description:** Full-width hero with background image or gradient
- **Best for:** Strong brand statement, image-driven brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Book Consultation` | |
| `secondaryCtaText` | Secondary CTA Text | text | `''` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` | |
| `imageUrl` | Background Image | image | `''` | **asset key** |
| `textAlign` | Text Alignment | select | `center` | `left`, `center`, `right` |
| `heroType` | Background Style | select | `gradient-image` | `image`, `gradient`, `gradient-image` |
| `heroHeight` | Hero Height | select | `large` | `medium`, `large`, `full` |

### Snippet

```json
{
  "type": "HeroFullScreen",
  "id": "hero",
  "config": {
    "title": "Premium Medical Cannabis",
    "subtitle": "Doctor-prescribed, EU-GMP certified",
    "description": "Discover strains tailored to your prescription.",
    "ctaText": "Book Consultation",
    "secondaryCtaText": "View Strains",
    "secondaryCtaHref": "/products",
    "imageUrl": "assets/hero.jpg",
    "textAlign": "center",
    "heroType": "gradient-image",
    "heroHeight": "large"
  }
}
```

---

## HeroSplit

- **Category:** hero
- **Description:** Two-column hero with text and image side by side
- **Best for:** Clean brand stories, product-led storefronts

### Fields

| Key | Label | Type | Default |
|---|---|---|---|
| `title` | Title | text | `Welcome` |
| `subtitle` | Subtitle | text | `Your tagline here` |
| `description` | Description | textarea | `''` |
| `ctaText` | CTA Button Text | text | `Get Started` |
| `secondaryCtaText` | Secondary CTA Text | text | `''` |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` |
| `imageUrl` | Hero Image | image | `''` (**asset key**) |

### Snippet

```json
{
  "type": "HeroSplit",
  "id": "hero",
  "config": {
    "title": "Wellness, prescribed.",
    "subtitle": "Medical cannabis for chronic conditions",
    "description": "INFARMED-licensed, doctor-led, delivered to your door.",
    "ctaText": "Start Consultation",
    "secondaryCtaText": "Browse Strains",
    "secondaryCtaHref": "/products",
    "imageUrl": "assets/hero-split.jpg"
  }
}
```

---

## HeroVideo

- **Category:** hero
- **Description:** Hero section with background video
- **Best for:** Cinematic, storytelling, immersive brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Watch This` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `ctaText` | CTA Button Text | text | `Learn More` | |
| `videoUrl` | Video | video | `''` | **asset key** (mp4 H.264) |
| `imageUrl` | Fallback Image | image | `''` | **asset key** |
| `watermarkUrl` | Watermark Image | image | `''` | **asset key** (transparent PNG) |
| `textAlign` | Text Alignment | select | `center` | `left`, `center`, `right` |
| `heroType` | Background Style | select | `video` | `video`, `image`, `gradient`, `gradient-image` |
| `overlayOpacity` | Overlay Opacity (%) | number | `50` | 0–100 |
| `heroHeight` | Hero Height | select | `large` | `medium`, `large`, `full` |

### Snippet

```json
{
  "type": "HeroVideo",
  "id": "hero",
  "config": {
    "title": "See the difference",
    "subtitle": "Real patients, real outcomes",
    "ctaText": "Begin your journey",
    "videoUrl": "assets/hero-loop.mp4",
    "imageUrl": "assets/hero-fallback.jpg",
    "textAlign": "left",
    "overlayOpacity": 55,
    "heroHeight": "full"
  }
}
```

---

## HeroMinimal

- **Category:** hero
- **Description:** Clean, text-focused hero with minimal styling
- **Best for:** Editorial brands, content-led sites, B2B

### Fields

| Key | Label | Type | Default |
|---|---|---|---|
| `title` | Title | text | `Clean & Simple` |
| `subtitle` | Subtitle | text | `Minimalist hero block` |
| `description` | Description | textarea | `''` |
| `ctaText` | CTA Button Text | text | `Get Started` |

### Snippet

```json
{
  "type": "HeroMinimal",
  "id": "hero",
  "config": {
    "title": "Clinically led. Patient first.",
    "subtitle": "A modern medical cannabis service",
    "description": "Built around your prescription.",
    "ctaText": "Find your strain"
  }
}
```

---

## HeroWarpShader

- **Category:** hero
- **Description:** Animated fluid warp shader background with configurable pattern
- **Best for:** Tech-forward, futuristic, modern wellness brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Get Started` | |
| `secondaryCtaText` | Secondary CTA Text | text | `''` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` | |
| `shaderShape` | Shader Pattern | select | `checks` | `checks`, `stripes`, `edge` |
| `shaderSpeed` | Animation Speed | select | `0.8` | `0.3`, `0.5`, `0.8`, `1.2`, `2` |
| `shaderSwirl` | Swirl Intensity | select | `0.8` | `0.2`, `0.5`, `0.8`, `1.2`, `2` |
| `primaryColor` | Primary Colour Override | text | `''` | HSL channel: e.g. `280 80% 50%` |
| `accentColor` | Accent Colour Override | text | `''` | HSL channel |

---

## HeroMeshGradient

- **Category:** hero
- **Description:** Dark cinematic hero with layered animated mesh gradients
- **Best for:** Luxury, premium, late-night brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Get Started` | |
| `secondaryCtaText` | Secondary CTA Text | text | `''` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` | |
| `textAlign` | Text Alignment | select | `left` | `left`, `center` |
| `shaderSpeed` | Animation Speed | select | `0.3` | `0.1`, `0.3`, `0.5`, `0.8`, `1` |
| `primaryColor` | Primary Colour Override | text | `''` | HSL channel |
| `accentColor` | Accent Colour Override | text | `''` | HSL channel |

---

## HeroAurora

- **Category:** hero
- **Description:** Animated aurora gradient with per-letter text reveal animation
- **Best for:** Wellness, calming, mood-driven brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Get Started` | |
| `secondaryCtaText` | Secondary CTA Text | text | `''` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` | |
| `auroraIntensity` | Aurora Intensity | select | `medium` | `subtle`, `medium`, `vivid` |
| `primaryColor` | Primary Colour Override | text | `''` | HSL channel |
| `accentColor` | Accent Colour Override | text | `''` | HSL channel |

---

## HeroShaderGlass

- **Category:** hero
- **Description:** Dark glassmorphic hero with mesh gradient and pulsing border glow
- **Best for:** Premium, glassmorphic, designer brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Get Started` | |
| `secondaryCtaText` | Secondary CTA Text | text | `''` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` | |
| `shaderSpeed` | Animation Speed | select | `0.4` | `0.2`, `0.4`, `0.6`, `0.8`, `1.2` |
| `glowColor` | Glow Colour | select | `primary` | `primary`, `accent`, `white` |
| `primaryColor` | Primary Colour Override | text | `''` | HSL channel |
| `accentColor` | Accent Colour Override | text | `''` | HSL channel |

---

## HeroDesignali

- **Category:** hero
- **Description:** Clean modern hero with gradient text, radial glow, and optional showcase image
- **Best for:** Modern SaaS-style, designer brands, product showcases

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Get Started` | |
| `secondaryCtaText` | Secondary CTA Text | text | `''` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` | |
| `badgeText` | Badge Text | text | `''` | |
| `imageUrl` | Showcase Image | image | `''` (**asset key**) | |
| `glowIntensity` | Glow Intensity | select | `medium` | `subtle`, `medium`, `vivid` |
| `primaryColor` | Primary Colour Override | text | `''` | HSL channel |
| `accentColor` | Accent Colour Override | text | `''` | HSL channel |

---

## HeroSplitImages

- **Category:** hero
- **Description:** Two-column hero with text and a 3-image asymmetric grid
- **Best for:** Lifestyle, editorial, image-rich brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Get Started` | |
| `secondaryCtaText` | Secondary CTA Text | text | `Book a Call` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `/contact` | |
| `badgeText` | Badge Text | text | `''` | |
| `imageUrl` | Image 1 (Large) | image | `''` (**asset key**) | |
| `imageUrl2` | Image 2 (Top Right) | image | `''` (**asset key**) | |
| `imageUrl3` | Image 3 (Bottom Right) | image | `''` (**asset key**) | |
| `layout` | Text Side | select | `left` | `left`, `right` |
| `primaryColor` | Primary Colour Override | text | `''` | HSL channel |
| `accentColor` | Accent Colour Override | text | `''` | HSL channel |

---

## HeroFuturistic

- **Category:** hero
- **Description:** Dark cyberpunk hero with animated grid, scanning line, and particle effects
- **Best for:** Tech-forward, modern, futuristic brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Get Started` | |
| `secondaryCtaText` | Secondary CTA Text | text | `''` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` | |
| `glowColor` | Glow Colour | select | `primary` | `primary`, `accent`, `cyan` |
| `gridDensity` | Grid Density | select | `medium` | `sparse`, `medium`, `dense` |
| `scanLine` | Scanning Line | select | `true` | `true`, `false` |
| `primaryColor` | Primary Colour Override | text | `''` | HSL channel |
| `accentColor` | Accent Colour Override | text | `''` | HSL channel |

---

## HeroCollage

- **Category:** hero
- **Description:** Editorial collage with split images, translucent watermark overlay, and bold typography
- **Best for:** Editorial brands, fashion-style storefronts, magazine layouts

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Your Brand` | |
| `subtitle` | Subtitle | text | `''` | |
| `imageUrl` | Left Image | image | `''` (**asset key**) | |
| `rightImageUrl` | Right Image (optional) | image | `''` (**asset key**) | |
| `watermarkUrl` | Center Watermark | image | `''` (**asset key**) | Transparent PNG |
| `splitRatio` | Split Ratio (Left/Right) | select | `40/60` | `30/70`, `40/60`, `50/50`, `60/40`, `70/30` |
| `watermarkOpacity` | Watermark Opacity | select | `0.4` | `0.1`–`0.8` (0.1 step) |
| `textPosition` | Text Position | select | `bottom-right` | `bottom-right`, `bottom-left`, `center-right`, `center`, `vertical-right` |
| `showVerticalText` | Show Vertical Side Text | select | `yes` | `yes`, `no` |
| `borderWidth` | Border/Frame | select | `medium` | `none`, `thin`, `medium`, `thick` |
| `height` | Height | select | `large` | `medium`, `large`, `full` |
| `ctaText` | CTA Button Text | text | `''` | |
| `ctaHref` | CTA Link | url | `/products` | |

### Snippet

```json
{
  "type": "HeroCollage",
  "id": "hero",
  "config": {
    "heading": "Editorial cannabis",
    "subtitle": "Lisbon · 2026 collection",
    "imageUrl": "assets/hero-left.jpg",
    "rightImageUrl": "assets/hero-right.jpg",
    "watermarkUrl": "assets/watermark.png",
    "splitRatio": "40/60",
    "watermarkOpacity": "0.3",
    "textPosition": "bottom-right",
    "borderWidth": "thin",
    "height": "large",
    "ctaText": "Discover",
    "ctaHref": "/products"
  }
}
```

---

## HeroFramed

- **Category:** hero
- **Description:** Full background image with a text frame panel (left or right) for readability
- **Best for:** Image-heavy hero with strong CTA panel, dispensary/clinic brands

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Welcome` | |
| `subtitle` | Subtitle | text | `Your tagline here` | |
| `description` | Description | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `Shop Now` | |
| `ctaHref` | CTA Link | url | `/products` | |
| `secondaryCtaText` | Secondary CTA Text | text | `''` | |
| `secondaryCtaHref` | Secondary CTA Link | url | `''` | |
| `imageUrl` | Background Image | image | `''` (**asset key**) | |
| `framePosition` | Frame Position | select | `left` | `left`, `right` |
| `frameStyle` | Frame Style | select | `solid` | `solid`, `glass`, `gradient` |
| `frameOpacity` | Frame Opacity | select | `0.85` | `0.5`–`1` |
| `overlayOpacity` | Image Overlay Darkness | select | `0.3` | `0`–`0.6` |
| `heroHeight` | Hero Height | select | `large` | `medium`, `large`, `full` |

---

# 2 · CTAs (4)

## Newsletter

- **Category:** cta
- **Description:** Email signup section with heading, input, and subscribe button

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Stay in the Loop` | |
| `subtitle` | Subtitle | text | `Get the latest news and offers delivered to your inbox.` | |
| `placeholder` | Input Placeholder | text | `you@example.com` | |
| `buttonText` | Button Text | text | `Subscribe` | |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

---

## CTABanner

- **Category:** cta
- **Description:** Full-width call-to-action banner

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Ready to Get Started?` | |
| `subtitle` | Subtitle | text | `Let's go` | |
| `ctaText` | Button Text | text | `Start Now` | |
| `ctaHref` | Button Link | url | `''` | Empty → uses consultation URL |
| `showButton` | Show Button | select | `yes` | `yes`, `no` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

---

## CTASplit

- **Category:** cta
- **Description:** Two-column CTA with image

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Contact Us` | |
| `subtitle` | Subtitle | text | `We are here to help` | |
| `ctaText` | Button Text | text | `Get in Touch` | |
| `ctaHref` | Button Link | url | `''` | Empty → uses consultation URL |
| `showButton` | Show Button | select | `yes` | `yes`, `no` |
| `imageUrl` | Image | image | `''` (**asset key**) | |

---

## CTAWithImage

- **Category:** cta
- **Description:** Call-to-action with featured image

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Join Us` | |
| `subtitle` | Subtitle | text | `Don't wait` | |
| `ctaText` | Button Text | text | `Sign Up` | |
| `ctaHref` | Button Link | url | `''` | Empty → uses consultation URL |
| `showButton` | Show Button | select | `yes` | `yes`, `no` |
| `imageUrl` | Image | image | `''` (**asset key**) | |

---

# 3 · Content Sections (24)

## ValueProps

- **Category:** content
- **Description:** Highlight key benefits or selling points

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Why Choose Us` | |
| `subtitle` | Subtitle | text | `''` | |
| `items` | Items | array | — | `itemLabel: "Value Prop"` |

### `items[]` itemFields

| Key | Label | Type | Default | Notes |
|---|---|---|---|---|
| `title` | Title | text | `Benefit` | |
| `description` | Description | textarea | `''` | |
| `icon` | Icon | text | `Star` | Lucide icon name |

### Snippet

```json
{
  "type": "ValueProps",
  "id": "values",
  "config": {
    "heading": "Why patients choose us",
    "subtitle": "Doctor-led, patient-first.",
    "items": [
      { "title": "INFARMED-licensed", "description": "Authorised import and dispensing in Portugal.", "icon": "Shield" },
      { "title": "Doctor-prescribed", "description": "Real consultations, real prescriptions.", "icon": "Stethoscope" },
      { "title": "EU-GMP certified", "description": "Pharmaceutical-grade chain.", "icon": "Award" },
      { "title": "Discreet delivery", "description": "Tamper-evident, signed chain-of-custody.", "icon": "Truck" }
    ]
  }
}
```

---

## ProductShowcase

- **Category:** content
- **Description:** Display real products or manual categories from your store

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Our Products` | |
| `subtitle` | Subtitle | text | `Explore our range` | |
| `dataSource` | Data Source | select | `manual` | `manual`, `products` |
| `productIds` | Select Products | product-picker | `''` | Comma-separated product IDs |
| `categories` | Categories | array | — | Manual mode `itemLabel: "Category"` |
| `ctaText` | Button Text | text | `View All Products` | |
| `ctaHref` | Button Link | url | `''` | Empty → uses products page |
| `showButton` | Show Button | select | `yes` | `yes`, `no` |
| `imageMode` | Image Fit | select | `cover` | `cover`, `contain` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

### `categories[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `title` | Title | text | `Category` |
| `description` | Description | text | `''` |
| `href` | Link | text | `/products` |
| `imageUrl` | Image | image | `''` (**asset key**) |

---

## Testimonials

- **Category:** content
- **Description:** Customer reviews and testimonials

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `What They Say` | |
| `subtitle` | Subtitle | text | `Customer feedback` | |
| `items` | Items | array | — | `itemLabel: "Testimonial"` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

### `items[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `quote` | Quote | textarea | `''` |
| `name` | Name | text | `Customer` |
| `role` | Role / Title | text | `''` |
| `rating` | Rating (1-5) | number | `5` |

---

## About

- **Category:** content
- **Description:** About your business with image and stats

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `About Us` | |
| `content` | Content | textarea | `Our story` | |
| `imageUrl` | Featured Image | image | `''` (**asset key**) | |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.4` | `0`, `0.1`–`0.9` |
| `contentPosition` | Layout | select | `right` | `left`, `right` |
| `ctaText` | Button Text | text | `Learn More About Us` | |
| `stats` | Stats | array | — | `itemLabel: "Stat"` |

### `stats[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `label` | Label | text | `Stat` |
| `value` | Value | text | `100+` |

---

## Gallery

- **Category:** content
- **Description:** Image gallery or portfolio section

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Gallery` | |
| `subtitle` | Subtitle | text | `See our work` | |
| `items` | Items | array | — | `itemLabel: "Image"` |

### `items[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `title` | Title | text | `''` |
| `imageUrl` | Image | image | `''` (**asset key**) |

---

## Stats

- **Category:** content
- **Description:** Key numbers and statistics

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `By The Numbers` | |
| `items` | Items | array | — | `itemLabel: "Stat"` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

### `items[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `label` | Label | text | `Stat` |
| `value` | Value | text | `100+` |

---

## FAQ

- **Category:** content
- **Description:** Frequently asked questions accordion

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Frequently Asked Questions` | |
| `subtitle` | Subtitle | text | `Find answers here` | |
| `items` | Items | array | — | `itemLabel: "Question"` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

### `items[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `question` | Question | text | `Question?` |
| `answer` | Answer | textarea | `''` |

---

## BlogFeed

- **Category:** content
- **Description:** Display recent blog posts

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Latest News` | |
| `subtitle` | Subtitle | text | `Read our blog` | |
| `blogUrl` | Blog URL | url | `''` | |
| `posts` | Posts | array | — | `itemLabel: "Post"` |

### `posts[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `title` | Title | text | `Blog Post` |
| `excerpt` | Excerpt | textarea | `''` |
| `imageUrl` | Image | image | `''` (**asset key**) |
| `url` | Link | text | `''` |

---

## Features

- **Category:** content
- **Description:** Feature list with icons or images

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Features` | |
| `subtitle` | Subtitle | text | `What we offer` | |
| `imageUrl` | Background Image | image | `''` (**asset key**) | |
| `overlayOpacity` | Overlay Opacity | select | `0.7` | `0.3`, `0.5`–`0.9` |
| `items` | Items | array | — | `itemLabel: "Feature"` |

### `items[]` itemFields

| Key | Label | Type | Default | Notes |
|---|---|---|---|---|
| `title` | Title | text | `Feature` | |
| `description` | Description | textarea | `''` | |
| `icon` | Icon | text | `Star` | Lucide icon name |
| `imageUrl` | Card Background Image | image | `''` | (**asset key**) |

---

## ImageShowcase

- **Category:** content
- **Description:** Full-width image with text overlay

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Showcase` | |
| `content` | Content | textarea | `''` | |
| `ctaText` | CTA Button Text | text | `''` | |
| `ctaHref` | CTA Link | url | `''` | |
| `imageUrl` | Image | image | `''` (**asset key**) | |
| `overlayStyle` | Overlay Style | select | `gradient` | `gradient`, `solid`, `none` |

---

## LogoMarquee

- **Category:** content
- **Description:** Infinite scrolling brand logo carousel with edge fade

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Trusted By` | |
| `logos` | Logos | array | — | `itemLabel: "Logo"` |
| `speed` | Speed (1-100) | number | `60` | |
| `reverse` | Reverse Direction | select | `false` | `false`, `true` |

### `logos[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `alt` | Brand Name | text | `Brand` |
| `src` | Logo Image | image | `''` (**asset key**) |

---

## BentoGrid

- **Category:** content
- **Description:** Asymmetric card grid with variable spans for a modern bento layout

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Why We Stand Out` | |
| `subtitle` | Subtitle | text | `''` | |
| `cards` | Cards | array | — | `itemLabel: "Card"` |

### `cards[]` itemFields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `title` | Title | text | `Card Title` | |
| `description` | Description | textarea | `''` | |
| `icon` | Icon | text | `Star` | Lucide icon name |
| `span` | Span | select | `normal` | `normal`, `wide`, `tall` |

---

## Pricing

- **Category:** content
- **Description:** Pricing tier cards with feature lists and highlighted popular tier

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Simple, Transparent Pricing` | |
| `subtitle` | Subtitle | text | `Choose the plan that works for you` | |
| `tiers` | Tiers | array | — | `itemLabel: "Tier"` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

### `tiers[]` itemFields

| Key | Label | Type | Default | Notes |
|---|---|---|---|---|
| `name` | Plan Name | text | `Basic` | |
| `price` | Price | text | `$0` | placeholder: `$29/mo` |
| `description` | Description | text | `''` | |
| `cta` | CTA Text | text | `Get Started` | |

---

## TeamGrid

- **Category:** content
- **Description:** Team member avatars with name, role, and bio

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Meet Our Team` | |
| `subtitle` | Subtitle | text | `The experts behind your wellness journey` | |
| `imageUrl` | Background Image | image | `''` (**asset key**) | |
| `overlayOpacity` | Overlay Opacity | select | `0.6` | `0`, `0.2`, `0.4`, `0.6`, `0.8`, `1` |
| `members` | Members | array | — | `itemLabel: "Member"` |

### `members[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `name` | Name | text | `Team Member` |
| `role` | Role | text | `''` |
| `avatar` | Avatar URL | image | `''` (**asset key**) |
| `bio` | Bio | textarea | `''` |

---

## Timeline

- **Category:** content
- **Description:** Vertical timeline with dot indicators and year labels

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Our Journey` | |
| `subtitle` | Subtitle | text | `''` | |
| `entries` | Entries | array | — | `itemLabel: "Entry"` |

### `entries[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `year` | Year | text | `2024` |
| `title` | Title | text | `Milestone` |
| `description` | Description | textarea | `''` |

---

## ComparisonTable

- **Category:** content
- **Description:** Feature comparison grid with check/x icons across tiers

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Compare Plans` | |
| `subtitle` | Subtitle | text | `Find the right fit for your needs` | |
| `tiers` | Tier Names | array | — | `itemLabel: "Tier"` |
| `features` | Features | array | — | `itemLabel: "Feature"` |

### `tiers[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `name` | Tier Name | text | `Tier` |

### `features[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `name` | Feature Name | text | `Feature` |

---

## Parallax

- **Category:** content
- **Description:** Full-width background image with parallax scroll effect and overlay text

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Experience the Difference` | |
| `description` | Description | textarea | `Premium quality products crafted with care.` | |
| `imageUrl` | Background Image | image | `''` (**asset key**) | |
| `ctaText` | CTA Button Text | text | `''` | |
| `ctaHref` | CTA Link | url | `''` | |
| `overlayOpacity` | Overlay Opacity (%) | number | `50` | 0–100 |

---

## SocialProof

- **Category:** content
- **Description:** Avatar stack badge with trust text and optional testimonial

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `''` | |
| `count` | Customer Count | number | `10000` | |
| `label` | Label | text | `Happy Customers` | |
| `rating` | Rating (1-5) | number | `4.9` | |
| `testimonial` | Testimonial Text | textarea | `''` | |
| `testimonialAuthor` | Testimonial Author | text | `''` | |
| `avatars` | Avatar URLs | array | — | `itemLabel: "Avatar"` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

### `avatars[]` itemFields

| Key | Label | Type | Default |
|---|---|---|---|
| `imageUrl` | Avatar Image | image | `''` (**asset key**) |

---

## TabsShowcase

- **Category:** content
- **Description:** Tabbed content with icon triggers, per-tab image and description

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `What Sets Us Apart` | |
| `subtitle` | Subtitle | text | `''` | |
| `tabs` | Tabs | array | — | `itemLabel: "Tab"` |

### `tabs[]` itemFields

| Key | Label | Type | Default | Notes |
|---|---|---|---|---|
| `label` | Tab Label | text | `Tab` | |
| `icon` | Icon | text | `Star` | Lucide icon name |
| `title` | Content Title | text | `''` | |
| `description` | Content Description | textarea | `''` | |
| `imageUrl` | Image | image | `''` | (**asset key**) |

---

## VideoGallery

- **Category:** content
- **Description:** Video/image grid with click-to-expand modal

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `Gallery` | |
| `subtitle` | Subtitle | text | `''` | |
| `items` | Items | array | — | `itemLabel: "Item"` |

### `items[]` itemFields

| Key | Label | Type | Default | Notes |
|---|---|---|---|---|
| `title` | Title | text | `''` | |
| `thumbnailUrl` | Thumbnail | image | `''` | (**asset key**) |
| `videoUrl` | Video URL | text | `''` | placeholder: `https://youtube.com/...` |

---

## ProcessSteps

- **Category:** content
- **Description:** Numbered steps with connecting lines and icons

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `How It Works` | |
| `subtitle` | Subtitle | text | `Getting started is simple` | |
| `orientation` | Orientation | select | `horizontal` | `horizontal`, `vertical` |
| `steps` | Steps | array | — | `itemLabel: "Step"` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

### `steps[]` itemFields

| Key | Label | Type | Default | Notes |
|---|---|---|---|---|
| `title` | Title | text | `Step` | |
| `description` | Description | textarea | `''` | |
| `icon` | Icon | text | `CheckCircle` | Lucide icon name |

---

## StatsCounter

- **Category:** content
- **Description:** Animated digit roller with spring physics and icons

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `''` | |
| `items` | Items | array | — | `itemLabel: "Counter"` |
| `backgroundImageUrl` | Background Image (optional) | image | `''` (**asset key**) | |
| `overlayOpacity` | Background Overlay Opacity | select | `0.5` | `0`, `0.1`–`0.9` |

### `items[]` itemFields

| Key | Label | Type | Default | Notes |
|---|---|---|---|---|
| `label` | Label | text | `Metric` | |
| `value` | Target Number | number | `100` | |
| `suffix` | Suffix | text | `+` | placeholder: `+, %, k, etc.` |
| `icon` | Icon | text | `TrendingUp` | Lucide icon name |

---

## TextMarquee

- **Category:** content
- **Description:** Scrolling text banner with optional icon separator

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `text` | Marquee Text | text | `Premium wellness products crafted with care` | |
| `icon` | Separator Icon | select | `leaf` | `leaf`, `cannabis`, `droplet`, `sparkle`, `none` |
| `logoUrl` | Custom Separator Image (overrides icon) | image | `''` | (**asset key** — note: `logoUrl` is NOT in standard `SECTION_ASSET_KEYS`; treat as content URL) |
| `speed` | Scroll Speed | number | `40` | |
| `reverse` | Reverse Direction | boolean | `''` | empty = false |
| `fontSize` | Text Size | select | `lg` | `sm`, `md`, `lg`, `xl` |
| `fontStyle` | Font Style | select | `italic-serif` | `serif`, `sans`, `italic-serif`, `italic-sans`, `mono`, `uppercase-sans`, `uppercase-serif`, `light-serif`, `light-sans`, `bold-sans` |
| `showBorder` | Show Top/Bottom Border | boolean | `''` | empty = false |
| `repeat` | Repeat Count | number | `4` | |

### Snippet

```json
{
  "type": "TextMarquee",
  "id": "marquee",
  "config": {
    "text": "INFARMED licensed · EU-GMP · Doctor prescribed",
    "icon": "leaf",
    "speed": 40,
    "fontSize": "lg",
    "fontStyle": "italic-serif",
    "showBorder": "true",
    "repeat": 4
  }
}
```

---

## FeaturesShowcase

- **Category:** content
- **Description:** Split layout with center image and feature cards on each side

### Fields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `heading` | Heading | text | `''` | |
| `subtitle` | Subtitle | text | `''` | |
| `imageUrl` | Center Image | image | `''` (**asset key**) | |
| `imageAlt` | Image Alt Text | text | `Product showcase` | |
| `leftFeatures` | Left Features | array | — | `itemLabel: "Feature"` |
| `rightFeatures` | Right Features | array | — | `itemLabel: "Feature"` |

### `leftFeatures[]` / `rightFeatures[]` itemFields

| Key | Label | Type | Default | Options / Notes |
|---|---|---|---|---|
| `icon` | Icon | select | `leaf` | `leaf`, `cannabis`, `heart`, `shield`, `brain`, `sleep`, `pain`, `anxiety`, `appetite`, `muscle`, `blood-pressure`, `droplet`, `sun`, `flower`, `pill`, `dna` |
| `title` | Title | text | `Feature` | |
| `description` | Description | textarea | `''` | |

### Snippet

```json
{
  "type": "FeaturesShowcase",
  "id": "showcase",
  "config": {
    "heading": "How cannabis can help",
    "subtitle": "Real conditions, evidence-based applications",
    "imageUrl": "assets/strain-jar.jpg",
    "imageAlt": "Premium medical cannabis flower",
    "leftFeatures": [
      { "icon": "sleep", "title": "Sleep", "description": "Indica strains for chronic insomnia." },
      { "icon": "pain", "title": "Chronic pain", "description": "Targeted CBD-dominant blends." },
      { "icon": "anxiety", "title": "Anxiety", "description": "Balanced THC:CBD ratios for calm." }
    ],
    "rightFeatures": [
      { "icon": "appetite", "title": "Appetite", "description": "Stimulant strains for chemotherapy patients." },
      { "icon": "muscle", "title": "Spasticity", "description": "MS-focused formulations." },
      { "icon": "brain", "title": "Neurology", "description": "Epilepsy-research formulations." }
    ]
  }
}
```

---

# 4 · Navigation (6)

Navigation components are configured via the top-level `navigationConfig` block in `layout.json`, NOT via per-section config. See `editor-parity.md` for the full `navigationConfig` shape.

| Type | Label | Description | Best for |
|---|---|---|---|
| `NavMinimal` | Minimal | Clean, flat navigation bar | Editorial, content brands |
| `NavDark` | Dark Glass | Premium floating glassmorphic bar | Luxury, premium brands |
| `NavTransparent` | Transparent | Fades in on scroll, hero-friendly | Image-led, lifestyle |
| `NavFull` | Full | Standard sticky with cart & CTA | E-commerce, dispensaries |
| `NavHealingBuds` | Full Featured | KYC badge, cart & icon nav links | Medical cannabis, full-featured |
| `NavPill` | Pill | Compact centered floating capsule | Modern, minimalist |

### `navigationConfig` shape (applies to ALL nav types)

```json
{
  "navigation": "NavDark",
  "navigationConfig": {
    "links": [
      { "label": "About", "href": "/about" },
      { "label": "Strains", "href": "/products" },
      { "label": "Conditions", "href": "/conditions" },
      { "label": "The Wire", "href": "/the-wire" }
    ],
    "cta": { "label": "Check Eligibility", "href": "/consultation" },
    "cta2": { "label": "Patient Login", "href": "/login" },
    "showCart": true
  }
}
```

---

# 5 · Footer (3)

Footer components are configured via the top-level `footerConfig` block in `layout.json`. See `editor-parity.md` for full shape.

| Type | Label | Description | Best for |
|---|---|---|---|
| `FooterSimple` | Simple | Minimal one-line copyright + links | Lightweight brands |
| `FooterBrand` | Brand | Premium dark with columns & contact | Established brands |
| `FooterFull` | Full | Comprehensive multi-column layout | Information-rich sites |

### `footerConfig` shape (applies to ALL footer types)

```json
{
  "footer": "FooterBrand",
  "footerConfig": {
    "tagline": "Doctor-led medical cannabis · INFARMED licensed · EU-GMP",
    "address": "Lisbon, Portugal",
    "email": "info@yourbrand.io",
    "disclaimer": "For prescription use only. Patients only.",
    "sections": [
      {
        "title": "Company",
        "links": [
          { "label": "About Us", "href": "/about" },
          { "label": "Products", "href": "/products" },
          { "label": "Contact", "href": "/contact" }
        ]
      },
      {
        "title": "Resources",
        "links": [
          { "label": "Conditions", "href": "/conditions" },
          { "label": "FAQ", "href": "/faq" }
        ]
      },
      {
        "title": "Legal",
        "links": [
          { "label": "Privacy", "href": "/privacy" },
          { "label": "Terms", "href": "/terms" }
        ]
      }
    ],
    "socialLinks": [
      { "platform": "instagram", "url": "https://instagram.com/yourbrand" },
      { "platform": "linkedin", "url": "https://linkedin.com/company/yourbrand" }
    ]
  }
}
```

Supported `platform` values: `facebook`, `instagram`, `x`, `tiktok`, `youtube`, `linkedin`, `pinterest`, `snapchat`.

---

# Per-Section Color Overrides (8 keys)

Every section in `layout.json` can carry an optional `colorOverrides` block. The renderer cascades these over the global tenant colors. Each value is a raw HSL channel string.

| Key | Maps to CSS var | Use for |
|---|---|---|
| `primary` | `--tenant-color-primary` | Buttons, links, accents |
| `secondary` | `--tenant-color-secondary` | Secondary buttons, dividers |
| `accent` | `--tenant-color-accent` | Highlights, active states |
| `background` | `--tenant-color-background` | Section background |
| `surface` | `--tenant-color-surface` | Cards inside the section |
| `text` | `--tenant-color-text` | Body copy |
| `heading` | `--tenant-color-heading` | Headlines |
| `border` | `--tenant-color-border` | Card/input borders |

```json
{
  "type": "Stats",
  "id": "stats",
  "config": { "heading": "By the numbers", "items": [] },
  "colorOverrides": {
    "background": "165 30% 12%",
    "surface": "165 30% 15%",
    "heading": "0 0% 100%",
    "text": "0 0% 90%",
    "primary": "150 70% 60%"
  }
}
```

This eight-key whitelist is enforced by the renderer at save time. Unknown keys are silently dropped.

---

# Universal Premium Tokens

Optional per-section config keys interpreted by the template renderer:

- `animation`: `fade-up`, `fade-left`, `fade-right`, `zoom-in`, `flip-up`
- `dividerTop`, `dividerBottom`: `wave`, `tilt`, `triangle`, `curve`, `clouds`
- `dividerColor`: HSL channel
- `dividerHeight`: e.g. `100px`

For per-design tokens (glassEffect, animationType, dividerStyle, buttonHoverEffect, sectionPadding) see `editor-parity.md`.
