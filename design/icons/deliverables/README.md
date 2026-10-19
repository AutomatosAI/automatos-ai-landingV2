# Automatos Deliverable Icons v1

7 types × 3 sizes = 21 SVGs.

## Files

```
icons/deliverables/
├── report-hero.svg       report-row.svg       report-badge.svg
├── image-hero.svg        image-row.svg        image-badge.svg
├── document-hero.svg     document-row.svg     document-badge.svg
├── code-hero.svg         code-row.svg         code-badge.svg
├── slide-hero.svg        slide-row.svg        slide-badge.svg
├── spreadsheet-hero.svg  spreadsheet-row.svg  spreadsheet-badge.svg
├── blog_post-hero.svg    blog_post-row.svg    blog_post-badge.svg
└── DeliverableIcon.tsx   ← single React component (uses inline SVG strings)
```

## Accents

| Type        | Hex       | Tailwind          |
|-------------|-----------|-------------------|
| report      | #60a5fa   | text-blue-400     |
| image       | #c084fc   | text-purple-400   |
| document    | #cbd5e1   | text-slate-300    |
| code        | #34d399   | text-emerald-400  |
| slide       | #fb923c   | text-orange-400   |
| spreadsheet | #4ade80   | text-green-400    |
| blog_post   | #22d3ee   | text-cyan-400     |

## Hero (200×200)
Dark canvas (#0a0d14) with radial accent glow. Accent is **baked in** —
import as a static asset:

```tsx
import reportHero from '@/public/icons/deliverables/report-hero.svg';
<Image src={reportHero} alt="" width={200} height={200} />
```

## Row (24×24) and Badge (16×16)
Monochrome, `currentColor`. Color via parent class:

```tsx
<span className="text-blue-400">
  <DeliverableIcon type="report" size="row" />
</span>
```

## Integration

- **Row + Badge** swap into `frontend/components/workspace/gallery-view/deliverable-row.tsx:35-57`
  (replace the `ARTIFACT_ICONS` lucide map).
- **Hero** swaps into `frontend/components/deliverables/deliverable-artwork.tsx`
  (replace the per-type SVG blocks at lines 55-254).
- **Dropdown items** ("All types" menu) — add the row icon next to each
  `<SelectItem>`. One extra line per item.
