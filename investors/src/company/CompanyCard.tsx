import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { COVER_IMAGE } from "./brand-images";
import { FamilyTile } from "./FamilyTile";

const copy = strings.company;

/*
 * The cover sits above the fold on both pages (PRD-003 §10). React 18 knows
 * no fetchPriority prop, so the attribute goes on as the browser spells it.
 */
const COVER_PRIORITY = { fetchpriority: "high" } as const;

/** The cover band's heights and framing (the mock): the full card's, and Home's shorter one. */
const BAND = {
  full: "h-44 sm:h-64 [&>img]:object-[50%_42%]",
  compact: "h-[104px] md:h-[136px] [&>img]:object-[50%_30%]",
} as const;

/** Four thin corner marks over the picture, as on the company site's hero. Decorative. */
function CornerMarks() {
  const corner = "absolute size-3 border-white/55";
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-3 z-[1]">
      <span className={cn(corner, "left-0 top-0 border-l border-t")} />
      <span className={cn(corner, "right-0 top-0 border-r border-t")} />
      <span className={cn(corner, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(corner, "bottom-0 right-0 border-b border-r")} />
    </span>
  );
}

/**
 * The company site's default hero, faded into the page's background over its
 * lower part in both moods, so the mark and the name over its edge stay clear
 * of the picture. Decorative (alt=""): the name under it says whose it is.
 */
function CoverBand({ compact }: { readonly compact: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-secondary", compact ? BAND.compact : BAND.full)}>
      <img
        src={COVER_IMAGE.src}
        width={COVER_IMAGE.width}
        height={COVER_IMAGE.height}
        alt=""
        decoding="async"
        {...COVER_PRIORITY}
        className="block size-full object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-transparent from-[58%] to-background/55 [[data-mood=pitch]_&]:to-background/85"
      />
      <CornerMarks />
    </div>
  );
}

interface CompanyCardProps {
  /** Home's header: a shorter band, a smaller tile and name, the text left-aligned. */
  readonly compact?: boolean;
  /** Beside the company at md and up, under it on phones (Home: the founder card). */
  readonly aside?: ReactNode;
  /** The card's last line, across it (Home: the team). */
  readonly footer?: ReactNode;
  readonly className?: string;
}

/**
 * The company first (PRD-003 D1): the cover band, our ship's tile from the
 * family icon kit overlapping its lower edge, Automatos (h2) and the spine
 * sentence. Centred on the signed-out page; `compact` on Home, where the
 * founder sits beside it and the team runs along its foot.
 */
export function CompanyCard({ compact = false, aside, footer, className }: CompanyCardProps) {
  const hasAside = aside !== undefined && aside !== null;
  const hasFooter = footer !== undefined && footer !== null;
  return (
    <article className={cn("overflow-hidden rounded-md border border-border bg-background", className)}>
      <CoverBand compact={compact} />
      <div className={cn(hasAside && "md:grid md:grid-cols-[minmax(0,1fr)_296px]")}>
        {compact ? (
          <div className="px-[18px] pb-[18px] md:px-6 md:pb-[22px]">
            <FamilyTile mark="ai" size="header" className="relative z-[2] -mt-7 ring-[3px] ring-background" />
            <h2 className="mt-3 font-serif text-[32px] font-normal leading-[1.05] tracking-[-0.01em] md:text-4xl md:leading-[1.05]">
              {copy.name}
            </h2>
            <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.55] text-[color:var(--fg-2)]">{copy.spine}</p>
          </div>
        ) : (
          <div className="px-5 pb-[22px] text-center sm:px-7 sm:pb-[30px]">
            <FamilyTile
              mark="ai"
              size="company"
              className="relative z-[2] mx-auto -mt-8 size-16 ring-4 ring-background sm:-mt-[38px] sm:size-[76px]"
            />
            <h2 className="mt-3 font-serif text-[42px] font-normal leading-[1.02] tracking-[-0.015em] sm:mt-4 sm:text-[52px] sm:leading-[1.02]">
              {copy.name}
            </h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-[17px] leading-[1.55] text-foreground/80 sm:text-lg sm:leading-[1.55]">
              {copy.spine}
            </p>
          </div>
        )}
        {hasAside ? (
          <div className="border-t border-border px-[18px] pb-1 pt-4 md:border-l md:border-t-0 md:px-5 md:pt-5">
            {aside}
          </div>
        ) : null}
      </div>
      {hasFooter ? <div className="border-t border-border bg-secondary px-[18px] py-3 md:px-6">{footer}</div> : null}
    </article>
  );
}
