# Layout Archetypes

12 distinct page compositions. Pick one as a starting point, then customize.
NEVER repeat the same archetype for consecutive templates.

## 1. The Authority (Medical/Professional)
**Mood:** Trustworthy, established, clinical precision
**Nav:** NavFull | **Footer:** FooterFull

```
HeroSplit (left-aligned text, image right)
  → About (company story + stats: patients served, years experience)
  → Features (6 items: certifications, compliance, expertise)
  → CTASplit (3-step consultation process)
  → FAQ (medical/legal questions)
  → FooterFull
```
**Visual rhythm:** Light → Light → Light → Light → Light (clean, professional, no dark drama)
**Typography:** Serif headings (authority) + clean sans body

## 2. The Cinematic (Premium/Luxury)
**Mood:** Aspirational, rich, immersive
**Nav:** NavDark | **Footer:** FooterBrand

```
HeroVideo (left-aligned, watermark overlay, low overlay opacity)
  → About (story + premium stats)
  → ValueProps (3 items, centered)
  → ImageShowcase (gradient-left overlay, facility/product imagery)
  → BlogFeed (curated content)
  → FooterBrand
```
**Visual rhythm:** Dark hero → Light → Dark surface → Full-bleed image → Light → Dark footer
**Typography:** Condensed sans headings (cinematic) + elegant body

## 3. The Minimalist (Clean/Editorial)
**Mood:** Less is more, sophisticated restraint
**Nav:** NavMinimal | **Footer:** FooterSimple

```
HeroMinimal (typographic, no image)
  → ValueProps (3 items, generous whitespace)
  → CTABanner (simple conversion point)
  → FooterSimple
```
**Visual rhythm:** Light → Light → Gradient → Light (barely there)
**Section padding:** Large (4rem/5rem/6rem) for breathing room
**Typography:** Elegant serif or geometric sans, generous letter-spacing

## 4. The Storyteller (Brand-Forward)
**Mood:** Narrative, emotional, journey-like
**Nav:** NavTransparent | **Footer:** FooterBrand

```
HeroFullScreen (full-bleed image, centered text)
  → About (origin story + founder stats)
  → ImageShowcase (gradient-center, cultivation/process)
  → Testimonials (patient stories)
  → ValueProps (4 items — what makes us different)
  → CTAWithImage (emotional close)
  → FooterBrand
```
**Visual rhythm:** Dark hero → Light → Full-bleed → Light → Light → Image → Dark footer
**Typography:** Humanist sans headings (warm) + readable body

## 5. The Marketplace (E-Commerce Focus)
**Mood:** Browse, discover, buy
**Nav:** NavFull (cart prominent) | **Footer:** FooterFull

```
HeroFullScreen (textAlign: left, product-category image)
  → ProductShowcase (4 categories)
  → ValueProps (4 items — shipping, quality, selection, support)
  → Stats (orders, products, reviews, satisfaction)
  → Testimonials (buyer reviews)
  → CTABanner (quick CTA)
  → FooterFull
```
**Visual rhythm:** Dark hero → Light → Light → Dark gradient → Light → Gradient → Dark footer
**Typography:** Modern sans throughout, bold weights for prices/stats

## 6. The Rebel (Street Culture/Bold)
**Mood:** Edgy, high-energy, unapologetic
**Nav:** NavDark | **Footer:** FooterFull

```
HeroFullScreen (full-bleed, high-contrast, bold text)
  → Stats (big impressive numbers, gradient bg)
  → Features (6 bold differentiators)
  → Gallery (product/lifestyle imagery)
  → CTABanner (direct, urgent)
  → FooterFull
```
**Visual rhythm:** Dark → Dark gradient → Light → Light → Gradient → Dark
**Typography:** Display/impact headings (Bebas Neue, Space Grotesk) + clean body
**Colors:** High saturation, dark backgrounds, neon accents

## 7. The Wellness Retreat (Organic/Natural)
**Mood:** Calm, nurturing, holistic
**Nav:** NavTransparent | **Footer:** FooterBrand

```
HeroFullScreen (gradient-image, earthy tones, centered)
  → ValueProps (3 items — natural, holistic, guided)
  → About (wellness philosophy + image)
  → Testimonials (patient wellness journeys)
  → FAQ (wellness questions)
  → CTAWithImage (serene imagery)
  → FooterBrand
```
**Visual rhythm:** Warm hero → Light → Light → Light → Light → Image → Dark
**Typography:** Serif headings (Lora, Playfair) + soft sans body
**Colors:** Muted greens, warm neutrals, low saturation

## 8. The Tech Forward (Modern/Digital)
**Mood:** Innovation, data-driven, cutting edge
**Nav:** NavFull | **Footer:** FooterFull

```
HeroSplit (sharp, geometric, gradient bg)
  → Features (6 items — tech capabilities)
  → Stats (data-driven metrics)
  → About (research/innovation story)
  → BlogFeed (research updates)
  → CTABanner
  → FooterFull
```
**Visual rhythm:** Light split → Light → Dark gradient → Light → Surface → Gradient → Dark
**Typography:** Geometric sans (Sora, Space Grotesk) throughout
**Colors:** Cool blues/purples, crisp whites, subtle gradients

## 9. The Gallery First (Visual/Lifestyle)
**Mood:** Let the visuals do the talking
**Nav:** NavTransparent | **Footer:** FooterSimple

```
HeroFullScreen (full-bleed lifestyle image)
  → Gallery (6-8 images, mixed spans)
  → About (brief story + image)
  → CTABanner (clean CTA)
  → FooterSimple
```
**Visual rhythm:** Dark hero → Light → Light → Gradient → Light
**Typography:** Minimal, clean sans, small sizes
**Note:** Image-heavy templates need the Gallery component to shine. Images uploaded via S3.

## 10. The Converter (Consultation/Funnel)
**Mood:** Clear path to action, medical authority
**Nav:** NavDark (dual CTAs: eligibility + login) | **Footer:** FooterFull

```
HeroFullScreen (left-aligned, strong CTA, eligibility focus)
  → CTASplit (3-step consultation process — most important section)
  → ValueProps (4 trust signals)
  → Testimonials (patient success stories)
  → FAQ (eligibility + process questions)
  → CTABanner (final conversion push)
  → FooterFull
```
**Visual rhythm:** Dark hero → Light → Light → Light → Light → Gradient → Dark
**Typography:** Clear, professional, highly readable
**Note:** CTA-heavy — the whole page funnels toward consultation booking.

## 11. The Magazine (Content-Rich)
**Mood:** Informative, editorial, content hub
**Nav:** NavMinimal | **Footer:** FooterFull

```
HeroMinimal (editorial headline, no image)
  → BlogFeed (featured articles)
  → About (editorial mission)
  → Features (content categories or topics)
  → FAQ (reader questions)
  → FooterFull
```
**Visual rhythm:** Light → Surface → Light → Light → Light → Dark
**Typography:** Serif headings for editorial feel + highly readable body
**Note:** Blog/content forward — works well for cannabis education brands.

## 12. The Showcase (Product/Facility Highlight)
**Mood:** Show, don't tell
**Nav:** NavFull | **Footer:** FooterBrand

```
HeroVideo (facility/product video, centered text)
  → ImageShowcase (gradient-left, production facility)
  → Stats (production metrics)
  → ValueProps (3 quality standards)
  → ProductShowcase (product lines)
  → CTABanner
  → FooterBrand
```
**Visual rhythm:** Dark video → Full-bleed → Dark gradient → Light → Light → Gradient → Dark
**Typography:** Condensed headings (Archivo Narrow) for impact
**Note:** Heavy visual template — needs good imagery/video assets.

---

## Mixing Archetypes

Don't feel locked into one. A brand might be "Authority + Storyteller" or "Rebel + Marketplace".
Take sections from different archetypes and recombine them. The key rules:

1. **Start with a hero** (always)
2. **Build trust early** (About, ValueProps, or Features within first 3 sections)
3. **Show social proof** (Testimonials or Stats in the middle)
4. **Convert at the end** (CTA before footer)
5. **Vary backgrounds** (don't stack 5 white sections in a row)
6. **Don't exceed 8 sections** (diminishing returns — 4-6 is the sweet spot)
