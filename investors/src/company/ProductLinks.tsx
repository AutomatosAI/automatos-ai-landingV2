import { ArrowUpRight } from "lucide-react";
import { Fragment, useId } from "react";

import { FOCUS_RING } from "@/documents/PitchCard";
import { cn } from "@/lib/utils";
import { linkAttributes } from "@/sections/markdown-links";
import { strings } from "@/strings";

import { PRODUCT_LINKS, type ProductLink, type ProductLinks as ProductLinkGroups } from "./company-data";
import { addressSegments, displayAddress } from "./link-address";
import { ProductIcon } from "./ProductIcon";
import { ShipTile } from "./ShipMark";
import { StatusChip } from "./StatusChip";

const copy = strings.company;

/** The full card (See it working) and the smaller one (Also from Automatos), as the mock draws them. */
const CARD_SIZES = {
  full: {
    card: "flex-row gap-3.5 p-3.5 md:flex-col md:p-[18px]",
    tile: "product",
    name: "text-[17px]",
    line: "mt-1.5 text-sm",
    address: "pt-2 text-xs md:pt-3",
  },
  small: {
    card: "flex-row gap-3 px-3.5 py-3",
    tile: "productSmall",
    name: "text-[15px]",
    line: "mt-0.5 text-[13px]",
    address: "pt-1 text-[11.5px]",
  },
} as const;

type CardSize = keyof typeof CARD_SIZES;

/*
 * In cn(), a font size drops any line height before it (tailwind-merge reads
 * text-sm as setting both), so each line height below comes after the size.
 */
const GROUP_HEADING = "font-mono text-[11px] uppercase leading-tight tracking-[0.18em] text-muted-foreground";

/**
 * The address without its scheme. A line breaks only after a "/" (a <wbr>
 * after each slash, every segment unbreakable), and the last segment keeps
 * the external-link arrow on its line.
 */
function ProductAddress({ href, className }: { readonly href: string; readonly className: string }) {
  const { head, last } = addressSegments(displayAddress(href));
  return (
    <span className={cn("mt-auto block font-mono text-muted-foreground", className, "leading-[1.45]")}>
      {head.map((segment, index) => (
        <Fragment key={index}>
          <span className="whitespace-nowrap">{segment}</span>
          <wbr />
        </Fragment>
      ))}
      <span className="whitespace-nowrap">
        {last}
        <ArrowUpRight aria-hidden="true" className="ml-1 inline-block size-3 align-[-1px]" />
      </span>
    </span>
  );
}

/** One product: the whole card is the link, opened as markdown links are (new tab, rel noopener noreferrer). */
function ProductCard({ link, size }: { readonly link: ProductLink; readonly size: CardSize }) {
  const sizes = CARD_SIZES[size];
  return (
    <a
      href={link.href}
      {...linkAttributes(link.href, window.location.origin)}
      className={cn(
        "group flex h-full min-h-11 items-start rounded-md border border-border bg-background text-foreground transition-colors hover:border-foreground/30",
        FOCUS_RING,
        sizes.card,
      )}
    >
      <ShipTile size={sizes.tile}>
        <ProductIcon icon={link.icon} />
      </ShipTile>
      <span className="flex min-w-0 flex-1 flex-col self-stretch">
        <span className="flex min-h-[22px] flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className={cn("mr-auto font-medium", sizes.name, "leading-snug")}>{link.name}</span>
          {link.chip === null ? null : <StatusChip status={link.chip} />}
        </span>
        <span className={cn("block text-[color:var(--fg-2)]", sizes.line, "leading-[1.45]")}>{link.line}</span>
        <ProductAddress href={link.href} className={sizes.address} />
      </span>
    </a>
  );
}

interface GroupProps {
  readonly heading: string;
  readonly links: readonly ProductLink[];
  readonly size: CardSize;
}

function ProductGroup({ heading, links, size }: GroupProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={cn(GROUP_HEADING, size === "full" ? "mb-4" : "mb-3")}>
        {heading}
      </h2>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {links.map((link) => (
          <li key={link.href}>
            <ProductCard link={link} size={size} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ProductLinksProps {
  /** The two groups; the public set in company-data.ts unless a test passes its own. */
  readonly links?: ProductLinkGroups;
  readonly className?: string;
}

/**
 * The product links (PRD-003 §5.2), the same on the signed-out page and on
 * Home: "See it working" in full cards, then "Also from Automatos" in
 * smaller ones; three a row from md, one a row below it. Each card is an
 * orange icon square (the brand colour, under a white glyph), the name, the
 * register's chip where there is one, the line and the address.
 */
export function ProductLinks({ links = PRODUCT_LINKS, className }: ProductLinksProps) {
  return (
    <div className={cn("grid gap-8", className)}>
      <ProductGroup heading={copy.seeItWorking} links={links.seeItWorking} size="full" />
      <ProductGroup heading={copy.alsoFromAutomatos} links={links.alsoFromAutomatos} size="small" />
    </div>
  );
}
