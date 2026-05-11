# Typography Guide

## Font Pairing Principles

**Contrast is king.** The best pairings create tension between heading and body:
- Serif heading + sans body = classic authority
- Geometric sans heading + humanist sans body = modern warmth
- Display heading + clean body = bold personality
- Same family different weights = cohesive subtlety

## 20 Curated Pairings

### Professional / Corporate
1. **Inter + Inter** — Swiss-knife clean. All weights. Moods: professional, clean, modern, corporate
   - `'Inter', sans-serif` / `'Inter', sans-serif`
   - Import: `Inter:wght@400;500;600;700;800`

2. **DM Sans + Inter** — Slightly softer professional.
   - `'DM Sans', sans-serif` / `'Inter', sans-serif`
   - Import: `DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700`

### Luxury / Premium
3. **Cormorant Garamond + Lato** — Refined serif authority. Moods: luxury, elegant, premium, upscale
   - `'Cormorant Garamond', serif` / `'Lato', sans-serif`
   - Import: `Cormorant+Garamond:wght@400;500;600;700&family=Lato:wght@400;700`

4. **Playfair Display + Source Sans 3** — High-contrast editorial luxury.
   - `'Playfair Display', serif` / `'Source Sans 3', sans-serif`
   - Import: `Playfair+Display:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600;700`

5. **DM Serif Display + DM Sans** — Warm, approachable luxury.
   - `'DM Serif Display', serif` / `'DM Sans', sans-serif`
   - Import: `DM+Serif+Display&family=DM+Sans:wght@400;500;600;700`

### Organic / Wellness
6. **Lora + Source Serif 4** — Warm, bookish, natural. Moods: organic, calm, wellness, holistic
   - `'Lora', serif` / `'Source Serif 4', serif`
   - Import: `Lora:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600`

7. **Libre Baskerville + Nunito** — Traditional meets friendly.
   - `'Libre Baskerville', serif` / `'Nunito', sans-serif`
   - Import: `Libre+Baskerville:wght@400;700&family=Nunito:wght@400;600;700`

8. **Merriweather + Open Sans** — Readable, warm, trustworthy.
   - `'Merriweather', serif` / `'Open Sans', sans-serif`
   - Import: `Merriweather:wght@400;700;900&family=Open+Sans:wght@400;500;600;700`

### Bold / Energetic
9. **Space Grotesk + DM Sans** — Geometric edge. Moods: bold, energetic, startup, tech, edgy
   - `'Space Grotesk', sans-serif` / `'DM Sans', sans-serif`
   - Import: `Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700`

10. **Archivo Black + Inter** — Maximum impact headings.
    - `'Archivo Black', sans-serif` / `'Inter', sans-serif`
    - Import: `Archivo+Black&family=Inter:wght@400;500;600;700`

11. **Oswald + Roboto** — Tall, condensed, powerful.
    - `'Oswald', sans-serif` / `'Roboto', sans-serif`
    - Import: `Oswald:wght@400;500;600;700&family=Roboto:wght@400;500;700`

### Dark / Moody
12. **Bebas Neue + Inter** — All-caps drama. Moods: dark, moody, dramatic, underground, nightlife
    - `'Bebas Neue', sans-serif` / `'Inter', sans-serif`
    - Import: `Bebas+Neue&family=Inter:wght@400;500;600;700`

13. **Archivo Narrow + Plus Jakarta Sans** — Condensed authority.
    - `'Archivo Narrow', sans-serif` / `'Plus Jakarta Sans', sans-serif`
    - Import: `Archivo+Narrow:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800`

### Modern / Geometric
14. **Sora + Inter** — Clean geometry. Moods: modern, geometric, trendy, vibrant
    - `'Sora', sans-serif` / `'Inter', sans-serif`
    - Import: `Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700`

15. **Outfit + Nunito** — Rounded, friendly modern. Moods: playful, colorful, friendly, casual
    - `'Outfit', sans-serif` / `'Nunito', sans-serif`
    - Import: `Outfit:wght@400;500;600;700;800&family=Nunito:wght@400;600;700`

### Playful / Casual
16. **Quicksand + Poppins** — Rounded, approachable, fun.
    - `'Quicksand', sans-serif` / `'Poppins', sans-serif`
    - Import: `Quicksand:wght@400;500;600;700&family=Poppins:wght@400;500;600;700`

17. **Comfortaa + Nunito Sans** — Ultra-rounded, playful.
    - `'Comfortaa', sans-serif` / `'Nunito Sans', sans-serif`
    - Import: `Comfortaa:wght@400;500;600;700&family=Nunito+Sans:wght@400;500;600;700`

### Editorial / Magazine
18. **Fraunces + Work Sans** — Variable optical sizing, editorial flair.
    - `'Fraunces', serif` / `'Work Sans', sans-serif`
    - Import: `Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700`

19. **Crimson Pro + Manrope** — Classic editorial readability.
    - `'Crimson Pro', serif` / `'Manrope', sans-serif`
    - Import: `Crimson+Pro:wght@400;500;600;700&family=Manrope:wght@400;500;600;700`

### Decorative / Statement
20. **Cinzel + Plus Jakarta Sans** — Classical display (for brands that want gravitas).
    - `'Cinzel', serif` / `'Plus Jakarta Sans', sans-serif`
    - Import: `Cinzel:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800`

## Google Fonts URL Format

```
https://fonts.googleapis.com/css2?family=HEADING_FONT:wght@WEIGHTS&family=BODY_FONT:wght@WEIGHTS&display=swap
```

This URL goes in TWO places:
1. `layout.json` → `settings.googleFontsUrl`
2. `styles.css` → `@import url('...');` at top

## CSS Font Stack Format

Always include fallbacks:
```css
--tenant-font-heading: 'Font Name', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--tenant-font-base: 'Font Name', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

For serif headings:
```css
--tenant-font-heading: 'Playfair Display', Georgia, 'Times New Roman', serif;
```
