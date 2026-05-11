# Accessibility Checklist — WCAG 2.2 AA

> **Purpose.** Templates must meet WCAG 2.2 Level AA. This is the minimum bar for medical-context sites in PT, UK, and DE — and it's the right thing to do for the patients who use these sites under stress, fatigue, or with chronic conditions that affect cognition and motor control. This checklist is what generators must produce; the reviewer/QA loop must verify.

---

## 1. Colour Contrast

### Required ratios

| Content type | Minimum ratio | Notes |
|---|---|---|
| Body text vs background | **4.5:1** | All text under 18px regular or 14px bold |
| Large text vs background | **3:1** | 18px regular or 14px bold and above |
| UI components vs adjacent colour | **3:1** | Buttons, form borders, focus indicators |
| Icon-only buttons vs background | **3:1** | If the icon carries meaning |
| Decorative imagery | No requirement | But avoid making decorative imagery look interactive |

### How to verify during generation

For each colour pair the template uses, run contrast through any of:

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) — fastest manual check
- [APCA](https://www.myndex.com/APCA/) — newer perceptual algorithm; not yet WCAG 2.2 normative but more accurate
- Programmatic: convert hex → relative luminance → ratio

**Rule of thumb tied to the design-tokens.md scales:**

| Foreground | Background | Typical ratio |
|---|---|---|
| `--tenant-color-primary-700` | `--tenant-color-primary-50` | 8–12:1 ✓ |
| `--tenant-color-primary-500` | white | 3.5–7:1 (verify per colour) |
| `--tenant-color-primary-500` | `--tenant-color-primary-50` | usually 4.5:1 ✓ |
| `--tenant-color-primary-400` | white | often FAILS — verify |

When in doubt, **darker on lighter** with at least 3 lightness steps between (e.g., 700 on 100, 800 on 50). Two steps (600 on 400) usually fails AA.

### Compliance for the 8-key palette

Every section's `colorOverrides` should produce passing pairs:

- `text` on `background`: 4.5:1
- `text` on `surface`: 4.5:1
- `heading` on `background`: 4.5:1 (often more, since headings are typically darker)
- White text on `primary`: depends — verify, especially for amber/gold primaries
- White text on `accent`: depends — CTA buttons MUST pass

---

## 2. Semantic HTML Per Section

Generators emit React components; component authors are responsible for the underlying semantics. But the template's section ordering must be semantically coherent:

### Page-level structure

```html
<header>                       <!-- nav -->
  <nav aria-label="Main">...</nav>
</header>

<main>                         <!-- all sections -->
  <section aria-label="Hero">...</section>
  <section aria-label="Value propositions">...</section>
  <section aria-label="Featured products">...</section>
  ...
</main>

<footer>                       <!-- footer -->
  <nav aria-label="Footer">...</nav>
</footer>
```

**Rules:**
- Exactly **one `<main>`** per page
- Exactly **one `<h1>`** per page (typically inside the hero section)
- `<section>` for each layout section, with an `aria-label` describing its purpose
- `<nav>` for nav AND footer link groups (with distinct `aria-label`s)
- Hero `<h1>` text matches the visible page title; if the section is purely decorative, don't render an `<h1>` — render the next-most-important section's heading as `<h1>` instead

### Heading hierarchy

```
h1 — Hero title (1 per page)
  h2 — Section titles
    h3 — Subsection titles within a section
      h4 — Card titles, FAQ questions
        h5/h6 — rare, only in deeply-nested educational content
```

**Never skip levels** (no `h1` → `h3` jump). The renderer's `h1`/`h2`/`h3` styles are sized via `--tenant-hero-scale` and `--tenant-section-heading-scale`; visual size doesn't change semantic level.

---

## 3. ARIA Labels Per Section Type

| Section type | Required ARIA |
|---|---|
| **Hero (any)** | `<section aria-label="Hero">` or skip if `<h1>` is sufficient |
| **ValueProps / FeatureGrid** | `<section aria-labelledby="value-props-heading">` with `<h2 id="value-props-heading">` |
| **ProductGrid / FeaturedProducts** | `<section aria-label="Featured products">` |
| **Testimonials / SocialProof** | `<section aria-label="Patient testimonials">` |
| **FAQ** | `<section aria-labelledby="faq-heading">`, each Q/A wrapped in `<details>` with `<summary>` |
| **Pricing** | `<section aria-labelledby="pricing-heading">` |
| **Newsletter / Form** | `<form aria-label="Newsletter signup">`, every input has `<label>` |
| **Gallery / ImageShowcase** | `<section aria-label="...">` , each image has `alt=` |
| **Video** | `<video>` with `<track kind="captions">` for any human speech |
| **Stats / Counter** | `<section aria-label="Key stats">`, each stat has visible label, no aria needed if labels are present |
| **CTA section** | `<section aria-label="Get started">` |
| **Nav (any)** | `<nav aria-label="Main">` for primary, `<nav aria-label="Footer">` for footer |
| **Footer** | `<footer>` (no aria needed; the element is semantic) |

---

## 4. Image Alternative Text

| Image type | `alt` rule | Example |
|---|---|---|
| Decorative (no information conveyed) | `alt=""` (empty string, not missing) | Background pattern, decorative floral element |
| Logo | Brand name + role | `alt="Greenwood Apothecary logo"` |
| Hero image | Descriptive of the scene + relevance | `alt="Pharmacist consulting with a patient at a clinic counter"` (NOT `alt="Hero image"`) |
| Product photo | Product name | `alt="OG Kush dried flower 5g jar"` |
| Avatar / testimonial portrait | Person's name | `alt="Maria, patient since 2022"` (NOT `alt="Avatar"`) |
| Icon (functional, no text) | Action or state | `alt="Verified prescription"` |
| Icon (decorative beside text) | `alt=""` | Icon next to "Doctor-led consultations" — text already conveys meaning |
| Infographic / chart | Description of the data | `alt="Bar chart showing 65% of patients report improved sleep within 30 days"` |

**Forbidden:**
- `alt="image"`, `alt="photo"`, `alt="picture"` (uninformative)
- `alt="A beautiful young woman smiling in a medical setting"` (over-described, often ableist/lookist)
- Missing `alt` attribute entirely (worse than `alt=""`)

---

## 5. Keyboard Navigation

Every interactive element must be reachable and operable via keyboard alone:

- **Tab** moves focus forward through interactive elements in DOM order
- **Shift+Tab** moves focus backward
- **Enter** / **Space** activates buttons and links
- **Escape** closes modals, dropdowns, drawers
- **Arrow keys** navigate within composite widgets (tabs, select, slider)

### Focus order rules

- DOM order matches visual order — never reorder visually with CSS in a way that creates illogical tab sequences
- Skip-link as the first focusable element on every page: `<a href="#main">Skip to main content</a>` (visually hidden until focused)
- Modal/dialog open → focus moves to dialog → focus is trapped within → Escape closes → focus returns to the trigger
- Mobile menu open → focus traps within the menu → Escape or X closes

### Focus indicator

- Every interactive element has a visible focus indicator
- Minimum 2px outline, 3:1 contrast against adjacent colour
- CSS contract:

```css
.tenant-theme-container *:focus-visible {
  outline: 2px solid hsl(var(--tenant-color-accent));
  outline-offset: 2px;
}
```

This is part of the template's `styles.css`. Never `outline: none` without a replacement focus style — that breaks keyboard users immediately.

---

## 6. Forms and Inputs

Every input must:

- Have a visible `<label>` (or `aria-label` when label is impractical, like a search bar with adjacent magnifier-icon button)
- Have `id` matching `<label for="...">`
- Indicate required fields with both `*` in the label AND `required` attribute AND `aria-required="true"`
- Show errors with `aria-invalid="true"` and `aria-describedby` pointing to the error message
- Group related inputs with `<fieldset>` + `<legend>` (e.g., shipping address, prescription details)
- Submit on Enter when the form has a single primary action

Example: contact form

```html
<form aria-label="Contact us">
  <label for="email">Email address *</label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-invalid="false"
    aria-describedby="email-error"
  />
  <span id="email-error" role="alert"></span>

  <button type="submit">Send message</button>
</form>
```

---

## 7. Motion and Animation

`animationType` and `dividerStyle` controls in DesignTab can produce motion. For accessibility:

### Respect `prefers-reduced-motion`

Every template's `styles.css` MUST include:

```css
@media (prefers-reduced-motion: reduce) {
  .tenant-theme-container * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This applies to all animation-tokens (`fade-up`, `slide-right`, `zoom-in`) and all hover effects (`lift`, `glow`, `scale`, `pulse`).

### No flashing > 3Hz

Templates must not contain content that flashes more than 3 times per second — that triggers seizure risk. None of the supplied animation primitives do this; if a generator adds a custom keyframe, verify.

### Auto-playing video

Hero video sections (`HeroVideo`) auto-play muted by default. Always:
- `muted`, `playsinline`, `loop` attributes
- A pause/play control accessible via keyboard
- Respects `prefers-reduced-motion` (don't auto-play if user prefers reduced motion)

---

## 8. Language Attributes

Every page MUST set `<html lang="...">`:

- Portuguese pages: `<html lang="pt">`
- English pages: `<html lang="en">`
- German pages: `<html lang="de">`
- Bilingual pages: set `lang` to the primary language; mark sections in other languages with `<div lang="en">` etc.

This is not a template responsibility — Next.js layout sets it — but the generator must ensure the brand brief's target market is correctly captured so the platform can set `lang` per tenant.

---

## 9. Dynamic Content / Live Regions

When content changes without a page reload (form submission feedback, cart updates, search results), announce to assistive tech:

```html
<!-- Polite — speaks when the user is idle -->
<div aria-live="polite" id="form-status"></div>

<!-- Assertive — interrupts the user, only for errors/important -->
<div aria-live="assertive" role="alert" id="form-error"></div>
```

Forms in templates (newsletter, contact) need this on the result message.

---

## 10. Compliance With Cannabis Markets

Beyond WCAG, accessibility intersects with cannabis-market regulation:

- **Age gates** must be operable via keyboard — Enter on the "I am 18+" button must work
- **Prescription-only labels** that gate product browsing must remain visible when a screen reader navigates the page (don't hide them behind hover-only)
- **Compliance disclaimers in the footer** — must be reachable via keyboard, not buried in a collapsed accordion-only section
- **Multilingual templates** (DE/EN) — every translated string must have its `lang` attribute set so screen readers pronounce correctly

---

## 11. Audit Checklist

Final pass before shipping:

- [ ] Every text/background pair meets 4.5:1 (or 3:1 for large text)
- [ ] Every CTA button colour pair meets 4.5:1
- [ ] Every focus state meets 3:1 against adjacent colour
- [ ] Single `<h1>` per page, semantic heading hierarchy preserved
- [ ] Every section has `aria-label` or `aria-labelledby`
- [ ] Every image has `alt=` (informative or empty for decorative)
- [ ] Every interactive element reachable by Tab in logical order
- [ ] Skip-to-main-content link is the first focusable element
- [ ] Visible focus indicator on every interactive element
- [ ] Forms: labels match inputs by `id`/`for`, required indicated 3 ways, errors announced
- [ ] `prefers-reduced-motion` honoured in `styles.css`
- [ ] No flashing content above 3Hz
- [ ] Auto-play video muted, paused on `prefers-reduced-motion`, has keyboard-accessible controls
- [ ] `<html lang>` matches the template's target market
- [ ] Live regions present for any dynamic feedback (forms, cart, search)
- [ ] Age gate (if present) is keyboard-operable and screen-reader-announced

A failing audit is a failing template — never ship below AA.
