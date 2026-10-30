import { ChartCandlestick, Compass, GraduationCap, Smartphone, type LucideIcon } from "lucide-react";

import type { ProductIconKey } from "./company-data";

/** The stroke the mock draws the product glyphs with, a touch lighter than lucide's 2. */
const GLYPH_STROKE = 1.85;

/** lucide-react's glyph for each product that has one. */
const LUCIDE_GLYPHS: Readonly<Record<Exclude<ProductIconKey, "github">, LucideIcon>> = {
  compass: Compass,
  smartphone: Smartphone,
  "graduation-cap": GraduationCap,
  "chart-candlestick": ChartCandlestick,
};

/**
 * The GitHub mark, drawn as lucide's outline glyphs are (24 px grid, round
 * caps), since lucide-react has no export for it. Decorative.
 */
function GitHubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={GLYPH_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

/** A product's glyph, for the white-on-orange tile (ShipTile sizes it). Decorative. */
export function ProductIcon({ icon }: { readonly icon: ProductIconKey }) {
  if (icon === "github") return <GitHubMark />;
  const Glyph = LUCIDE_GLYPHS[icon];
  return <Glyph aria-hidden="true" strokeWidth={GLYPH_STROKE} />;
}
