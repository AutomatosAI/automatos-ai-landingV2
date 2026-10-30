import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The ship of the site's favicon.svg (the family-set ship): its path only,
 * without the file's metadata block, gradient or rounded square.
 */
const SHIP_PATH =
  "M160.99 204.507L69.0508 205.138L62.0811 188.532L194.972 177.929L160.99 204.507ZM115.631 174.64C95.9516 173.895 84.3043 174.639 61.0293 176.463C74.5047 155.234 103.609 106.893 112.224 83.3545L115.631 174.64ZM127.081 49.7773C154.399 95.7732 187.433 152.461 193.68 165.008C170.069 166.884 155.669 168.286 131.624 171.49L127.081 49.7773Z";

/** Our ship mark in the colour around it. Decorative: the words beside it name the company. */
export function ShipMark({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d={SHIP_PATH} fill="currentColor" />
    </svg>
  );
}

/**
 * The tile's sizes (the mock): the company card on the teaser, Home's header,
 * and the product cards' icon squares, full and small. `glyph` sizes a
 * product's own icon when one replaces the ship.
 */
const TILE_SIZES = {
  company: { box: "size-[76px]", ship: "size-14", glyph: "[&>svg]:size-9" },
  header: { box: "size-14", ship: "size-[41px]", glyph: "[&>svg]:size-7" },
  product: { box: "size-11", ship: "size-8", glyph: "[&>svg]:size-[22px]" },
  productSmall: { box: "size-8", ship: "size-6", glyph: "[&>svg]:size-[17px]" },
} as const;

export type ShipTileSize = keyof typeof TILE_SIZES;

interface ShipTileProps {
  readonly size: ShipTileSize;
  readonly className?: string;
  /** A product's icon (one svg) in place of the ship; the tile sizes it. */
  readonly children?: ReactNode;
}

/**
 * The ship mark, white on the brand orange, in a square with the favicon's
 * corner radius (48/256). Decorative, glyph and all: the text beside the
 * tile carries its meaning.
 */
export function ShipTile({ size, className, children }: ShipTileProps) {
  const sizes = TILE_SIZES[size];
  const ownGlyph = children !== undefined;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-[18.75%] bg-ship text-white",
        sizes.box,
        ownGlyph && sizes.glyph,
        className,
      )}
    >
      {ownGlyph ? children : <ShipMark className={sizes.ship} />}
    </span>
  );
}
