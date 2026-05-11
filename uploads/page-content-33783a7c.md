# Page Content Schema

> **Purpose.** `pageContent` lives inside `defaults.json` and provides the editable copy for the three core pages (`home`, `about`, `contact`) plus interactive education hotspots and the logo placement. The Editor's BrandTab reads and writes this exact shape; templates that omit it render the on-page hard-coded fallbacks. Always emit `pageContent` so operators can edit copy without touching code.
>
> **Source of truth.** `nextjs_space/app/tenant-admin/branding/branding-form.tsx` (the `pageContent: { ... }` save block) and `nextjs_space/lib/types.ts` (`pageContent` type). This doc mirrors them.

---

## 1. Top-Level Shape

```typescript
interface PageContent {
  home?: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroCtaText?: string;
    heroAlignment?: "left" | "center" | "right";
    heroHeight?: "medium" | "large" | "full";
    heroOverlayStyle?: "dark" | "gradient-primary" | "gradient-dark" | "none";
    heroOverlayOpacity?: number;        // 0–100
  };

  about?: {
    heroTitle?: string;
    heroSubtitle?: string;
    missionTitle?: string;
    missionParagraphs?: string[];       // array of paragraph strings (split on blank lines in editor)
  };

  contact?: {
    title?: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
  };

  // Mirror of contact email/phone for the /contact route which reads support.*
  support?: {
    contactEmail?: string;
    contactPhone?: string;
  };

  educationHotspots?: Array<{
    id: string;                         // unique within array
    targetSectionId?: string;           // section.id from layout.json, or "all"
    x: number;                          // 0–100 percentage
    y: number;                          // 0–100 percentage
    title: string;
    description: string;
  }>;

  logoPlacement?: LogoPlacement;        // see editor-parity.md §4
}
```

**Critical:** the editor saves `support.contactEmail` / `support.contactPhone` as a mirror of `contact.email` / `contact.phone`. Always emit BOTH so the `/contact` route (reads `support.*`) and the about page (reads `contact.*`) both work.

---

## 2. Home Page

### Hero block

The hero on `/` is rendered by the section component placed first in `layout.json.sections[]`. `pageContent.home.*` provides editable copy that the hero component reads when its config is empty (some heroes prefer per-section config over `pageContent`; both are wired in).

| Field | Editor input | Used by |
|---|---|---|
| `heroTitle` | Text | Hero H1 |
| `heroSubtitle` | Textarea | Hero subhead |
| `heroCtaText` | Text | Primary CTA button label |
| `heroAlignment` | Select (`left`/`center`/`right`) | Hero text/CTA horizontal alignment |
| `heroHeight` | Select (`medium`/`large`/`full`) | Hero viewport height — see table below |
| `heroOverlayStyle` | Select (4 options) | Background image overlay style |
| `heroOverlayOpacity` | Slider (0–100) | Overlay opacity |

**Hero height map** (component-side):

| Value | CSS height | Use case |
|---|---|---|
| `medium` | `min-h-[60vh]` | Subpages, secondary heroes |
| `large` | `min-h-[80vh]` | Default home hero |
| `full` | `min-h-screen` | Premium / landing-page feel |

**Overlay style map:**

| Value | CSS gradient |
|---|---|
| `none` | No overlay |
| `dark` | `rgba(0,0,0, opacity/100)` |
| `gradient-primary` | `linear-gradient(180deg, transparent, hsl(var(--primary)/opacity))` |
| `gradient-dark` | `linear-gradient(180deg, transparent, rgba(0,0,0, opacity/100))` |

### Generation defaults

```json
{
  "home": {
    "heroTitle": "Premium Medical Cannabis, Prescribed With Care",
    "heroSubtitle": "Doctor-led consultations and pharmacy-grade products, delivered to your door.",
    "heroCtaText": "Book Consultation",
    "heroAlignment": "left",
    "heroHeight": "large",
    "heroOverlayStyle": "gradient-dark",
    "heroOverlayOpacity": 50
  }
}
```

---

## 3. About Page

`/about` is rendered by `app/store/[slug]/about/page.tsx` reading `pageContent.about`.

### Fields

| Field | Editor input | Notes |
|---|---|---|
| `heroTitle` | Text | About-page H1; default `"About {businessName}"` |
| `heroSubtitle` | Textarea | About-page subhead |
| `missionTitle` | Text | Mission section H2; default `"Our Mission"` |
| `missionParagraphs` | Textarea (split on blank lines) | Stored as `string[]`; one paragraph per array element |

### Storage shape

The editor accepts a single textarea but **stores `missionParagraphs` as an array of paragraph strings** — split on `\n{2,}` (blank line). When generating, emit the array directly:

```json
{
  "about": {
    "heroTitle": "About Greenwood Apothecary",
    "heroSubtitle": "Setting new standards in medical cannabis excellence since 2019.",
    "missionTitle": "Our Mission",
    "missionParagraphs": [
      "We exist to make medical cannabis accessible — to the patients who need it, and to the doctors who prescribe it.",
      "Every product we carry is doctor-reviewed, lab-tested, and traceable from grower to patient. We don't compromise on provenance.",
      "Our team includes pharmacists, cultivation specialists, and patient-care coordinators — all working towards the same goal: better outcomes through better cannabis."
    ]
  }
}
```

Three paragraphs is the recommended default. One feels thin; five feels like a wall of text.

---

## 4. Contact Page

`/contact` is rendered by the contact route which **reads `pageContent.support.contactEmail` and `pageContent.support.contactPhone`**, NOT `contact.email` / `contact.phone`. The editor saves both, so generators must too.

### Fields

| Field | Editor input | Used by |
|---|---|---|
| `contact.title` | Text | Contact page H1; default `"Get in Touch"` |
| `contact.description` | Textarea | Contact page subhead |
| `contact.email` | Email input | About-page contact card AND mirrored to `support.contactEmail` |
| `contact.phone` | Tel input | Mirrored to `support.contactPhone` |
| `contact.address` | Textarea | Footer + contact page address block |

### Storage shape — both objects required

```json
{
  "contact": {
    "title": "Get in Touch",
    "description": "Have questions about products, prescriptions, or your account? We're here to help.",
    "email": "info@greenwood-apothecary.com",
    "phone": "+351 939 455 949",
    "address": "Rua das Flores 42\n1200-194 Lisboa\nPortugal"
  },
  "support": {
    "contactEmail": "info@greenwood-apothecary.com",
    "contactPhone": "+351 939 455 949"
  }
}
```

`address` is a multi-line string with `\n` separators; the renderer converts to `<br>` at render time.

---

## 5. Education Hotspots

Optional. Hotspots are interactive markers placed over hero or showcase imagery; clicking opens a tooltip with title + description. Used for "explain this strain", "what's in this oil", or any context-rich on-image education.

```typescript
interface EducationHotspot {
  id: string;             // unique within array (the editor uses Date.now().toString())
  targetSectionId?: string;  // "all" or a specific section.id from layout.json
  x: number;              // 0–100 % horizontal
  y: number;              // 0–100 % vertical
  title: string;
  description: string;
}
```

When generating, emit an empty array unless the brand brief specifically calls for hotspots — they're an enrichment, not a requirement.

```json
{
  "educationHotspots": []
}
```

Or with content:

```json
{
  "educationHotspots": [
    {
      "id": "hs-trichomes",
      "targetSectionId": "image-showcase-1",
      "x": 35,
      "y": 60,
      "title": "Trichomes",
      "description": "The crystalline structures where cannabinoids and terpenes are produced. Higher trichome density typically signals higher potency."
    }
  ]
}
```

---

## 6. Logo Placement

See `references/editor-parity.md` §4 for the full spec. Always emit a complete `logoPlacement` object inside `pageContent`:

```json
{
  "logoPlacement": {
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
}
```

---

## 7. Complete `pageContent` Generation Template

Copy-paste starting point for `defaults.json.pageContent`:

```json
{
  "pageContent": {
    "home": {
      "heroTitle": "{{HERO_TITLE}}",
      "heroSubtitle": "{{HERO_SUBTITLE}}",
      "heroCtaText": "{{HERO_CTA_LABEL}}",
      "heroAlignment": "left",
      "heroHeight": "large",
      "heroOverlayStyle": "gradient-dark",
      "heroOverlayOpacity": 50
    },
    "about": {
      "heroTitle": "About {{BUSINESS_NAME}}",
      "heroSubtitle": "{{ABOUT_HERO_SUBTITLE}}",
      "missionTitle": "Our Mission",
      "missionParagraphs": [
        "{{MISSION_PARAGRAPH_1}}",
        "{{MISSION_PARAGRAPH_2}}",
        "{{MISSION_PARAGRAPH_3}}"
      ]
    },
    "contact": {
      "title": "Get in Touch",
      "description": "{{CONTACT_DESCRIPTION}}",
      "email": "{{CONTACT_EMAIL}}",
      "phone": "{{CONTACT_PHONE}}",
      "address": "{{CONTACT_ADDRESS}}"
    },
    "support": {
      "contactEmail": "{{CONTACT_EMAIL}}",
      "contactPhone": "{{CONTACT_PHONE}}"
    },
    "educationHotspots": [],
    "logoPlacement": {
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
  }
}
```

Replace `{{...}}` placeholders during generation; never ship a template with placeholders in `pageContent` — `scripts/helpers.ts::findPlaceholders` should be invoked as a final sanity check.

---

## 8. Round-Trip Checklist

Before shipping, verify:

- [ ] `pageContent.home` populated with all 7 hero fields
- [ ] `pageContent.about` populated; `missionParagraphs` is `string[]` not a single string
- [ ] `pageContent.contact` populated with title, description, email, phone, address
- [ ] `pageContent.support.contactEmail` mirrors `pageContent.contact.email`
- [ ] `pageContent.support.contactPhone` mirrors `pageContent.contact.phone`
- [ ] `pageContent.educationHotspots` is an array (may be empty)
- [ ] `pageContent.logoPlacement` includes all 9 keys with values within ranges
- [ ] No `{{...}}` placeholders remain in any `pageContent` field
