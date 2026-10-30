import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { ProductIconKey } from "./company-data";
import { SHIP_PATH } from "./ShipMark";

/**
 * A tile's mark: a product card's (company-data.ts) or the company's own
 * ship ("ai"). Each is that product's folder in the Automatos family icon
 * kit, save GitHub, which has no family icon and keeps its own mark.
 */
export type FamilyMark = "ai" | ProductIconKey;

/**
 * The tile's sizes (the mock): the company card on the teaser, Home's
 * header, and the product cards' icon squares, full and small.
 */
const TILE_SIZES = {
  company: "size-[76px]",
  header: "size-14",
  product: "size-11",
  productSmall: "size-8",
} as const;

export type FamilyTileSize = keyof typeof TILE_SIZES;

/** The wheel's eight spokes, turned as the kit's automatos-go favicon.svg turns them. */
const SPOKE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/** The GitHub mark, as lucide draws its outline glyphs (24 px grid, round caps). */
const GITHUB_PATHS = [
  "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
  "M9 18c-4.51 2-5-2-7-2",
] as const;

/**
 * The GitHub mark on the 256 px tile: lucide's grid scaled to 168, centred,
 * its stroke the kit's compass ring (13 of 256) at that scale.
 */
const GITHUB_SCALE = 7;
const GITHUB_OFFSET = (256 - 24 * GITHUB_SCALE) / 2;
const GITHUB_STROKE = 13 / GITHUB_SCALE;

/**
 * Each mark's white shapes, copied from the favicon.svg in that product's
 * kit folder with the kit's own attribute values. `cutout` fills the shapes
 * the kit fills url(#g) (the compass's centre, the chart room's star) with
 * this tile's gradient, so they read as holes through the white.
 */
const MARKS: Readonly<Record<FamilyMark, (cutout: string) => ReactNode>> = {
  ai: () => <path d={SHIP_PATH} fill="#fff" />,
  os: (cutout) => (
    <>
      <circle cx="128" cy="128" r="62" fill="none" stroke="#fff" strokeWidth="13" />
      <path d="M128 40L147 109L216 128L147 147L128 216L109 147L40 128L109 109Z" fill="#fff" />
      <circle cx="128" cy="128" r="9" fill={cutout} />
    </>
  ),
  go: () => (
    <>
      <circle cx="128" cy="128" r="48" fill="none" stroke="#fff" strokeWidth="19" />
      <circle cx="128" cy="128" r="20" fill="#fff" />
      {SPOKE_ANGLES.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 128 128)`}>
          <rect x="120.5" y="56" width="15" height="72" fill="#fff" />
          <circle cx="128" cy="52" r="12" fill="#fff" />
        </g>
      ))}
    </>
  ),
  academy: (cutout) => (
    <>
      <path d="M58 78L102 62V182L58 198Z" fill="#fff" />
      <path d="M108 62L148 78V198L108 182Z" fill="#fff" />
      <path d="M154 78L198 62V182L154 198Z" fill="#fff" />
      <path d="M128 104L134 124L154 130L134 136L128 156L122 136L102 130L122 124Z" fill={cutout} />
    </>
  ),
  markets: () => (
    <>
      <path d="M210 92L168 64V120Z" fill="#fff" />
      <rect x="86" y="84" width="86" height="16" fill="#fff" />
      <path d="M46 60L102 84V100L46 124L64 92Z" fill="#fff" />
      <rect x="120" y="106" width="16" height="88" fill="#fff" />
      <path d="M96 198H160L150 212H106Z" fill="#fff" />
    </>
  ),
  github: () => (
    <g
      transform={`translate(${GITHUB_OFFSET} ${GITHUB_OFFSET}) scale(${GITHUB_SCALE})`}
      fill="none"
      stroke="#fff"
      strokeWidth={GITHUB_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GITHUB_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  ),
};

interface FamilyTileProps {
  readonly mark: FamilyMark;
  readonly size: FamilyTileSize;
  readonly className?: string;
}

/**
 * A family icon as the kit's favicon.svg draws it: the orange gradient in a
 * 256 px square with the kit's corner radius (48, so 18.75 %), the white
 * mark on top. The kit's files all name their gradient "g"; each tile names
 * its own from useId, so two tiles on a page never share one. Decorative:
 * the text beside the tile carries its meaning.
 */
export function FamilyTile({ mark, size, className }: FamilyTileProps) {
  const gradientId = `family-tile${useId().replace(/[^\w-]/g, "-")}`;
  const gradient = `url(#${gradientId})`;
  return (
    <span
      aria-hidden="true"
      data-mark={mark}
      className={cn("block shrink-0 rounded-[18.75%]", TILE_SIZES[size], className)}
    >
      <svg viewBox="0 0 256 256" className="block size-full">
        <defs>
          <linearGradient
            id={gradientId}
            x1="205.813"
            y1="272.744"
            x2="98.7565"
            y2="-15.4346"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#D53B00" />
            <stop offset="1" stopColor="#FF6A02" />
          </linearGradient>
        </defs>
        <rect width="256" height="256" rx="48" fill={gradient} />
        {MARKS[mark](gradient)}
      </svg>
    </span>
  );
}
