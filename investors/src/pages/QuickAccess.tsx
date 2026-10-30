import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CircleHelp,
  FolderOpen,
  Play,
  Presentation,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useId } from "react";
import { Link } from "react-router-dom";

import { FOCUS_RING } from "@/documents/PitchCard";
import { cn } from "@/lib/utils";
import { LINK_REL } from "@/sections/markdown-links";
import { strings } from "@/strings";

import type { QuickAccessKey, QuickAccessTile } from "./home-model";

/** Each tile's glyph (the mock; Documents, Team and FAQ as the sidebar draws them). Decorative. */
const TILE_ICONS: Readonly<Record<QuickAccessKey, LucideIcon>> = {
  deck: Presentation,
  demo: Play,
  documents: FolderOpen,
  team: Users,
  faq: CircleHelp,
  bookCall: Calendar,
};

const GLYPH_STROKE = 1.75;

const EYEBROW = "font-mono text-[11px] uppercase leading-tight tracking-[0.18em] text-muted-foreground";

const TILE =
  "group flex h-full min-h-[108px] flex-col justify-between gap-[18px] rounded-md border border-border bg-background p-4 text-foreground transition-colors hover:border-foreground/30 md:min-h-[120px]";

interface TileBodyProps {
  readonly tile: QuickAccessTile;
  readonly labelId: string;
  readonly hintId: string;
}

/** The glyph in its square and the arrow, then the label and the hint under it. */
function TileBody({ tile, labelId, hintId }: TileBodyProps) {
  const Glyph = TILE_ICONS[tile.key];
  const Arrow = tile.external ? ArrowUpRight : ArrowRight;
  return (
    <>
      <span aria-hidden="true" className="flex items-start justify-between">
        <span className="grid size-9 place-items-center rounded-md border border-border bg-secondary text-foreground transition-colors group-hover:text-brand">
          <Glyph aria-hidden="true" strokeWidth={GLYPH_STROKE} className="size-[18px]" />
        </span>
        <Arrow aria-hidden="true" className="size-4 text-muted-foreground" />
      </span>
      <span>
        <span id={labelId} className="block text-base font-medium leading-snug">
          {tile.label}
        </span>
        <span
          id={hintId}
          className="mt-1 block font-mono text-[10.5px] uppercase leading-[1.2] tracking-[0.14em] text-muted-foreground"
        >
          {tile.hint}
        </span>
      </span>
    </>
  );
}

/**
 * One tile, the whole tile a link. Its name is the label and the hint
 * ("View the deck Slideshow"), so it never takes the exact name of the pitch
 * block's own View the deck link. A portal page opens in place, as today's
 * links do; the booking page opens in a new tab.
 */
function TileLink({ tile }: { readonly tile: QuickAccessTile }) {
  const labelId = useId();
  const hintId = useId();
  const labelledBy = `${labelId} ${hintId}`;
  const className = cn(TILE, FOCUS_RING);
  const body = <TileBody tile={tile} labelId={labelId} hintId={hintId} />;
  if (tile.external) {
    return (
      <a href={tile.href} target="_blank" rel={LINK_REL} aria-labelledby={labelledBy} className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link to={tile.href} aria-labelledby={labelledBy} className={className}>
      {body}
    </Link>
  );
}

/**
 * Quick access on Home (PRD-003 §3.2 item 3): a tile for everything the
 * portal holds, each only when its content exists (home-model.ts decides
 * which), three a row from md and two on phones. Nothing at all when no tile
 * shows. The tiles open the same routes as today's links, so tracking is as
 * before: no click events.
 */
export function QuickAccess({ tiles }: { readonly tiles: readonly QuickAccessTile[] }) {
  const headingId = useId();
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={cn(EYEBROW, "mb-4")}>
        {strings.company.quickAccess.heading}
      </h2>
      <ul aria-labelledby={headingId} className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.key}>
            <TileLink tile={tile} />
          </li>
        ))}
      </ul>
    </section>
  );
}
