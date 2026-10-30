import { parseCardRows } from "@/company/card-rows";
import { bookingHref } from "@/company/company-data";
import type { ContactRow } from "@/company/contact-rows";
import type { InvestorDocument } from "@/documents/documents-api";
import { pickFeaturedPitch } from "@/documents/library-model";
import { DOCUMENTS_PATH, documentPath } from "@/lib/paths";
import { CONTACT_PATH, SECTION_PATHS } from "@/sections/paths";
import type { Section } from "@/sections/sections-api";
import { findSection, FOUNDER_CARD_SECTION, publishedPages } from "@/sections/sections-model";
import { strings } from "@/strings";
import { presentPath } from "@/viewer/present-route";

/*
 * The signed-in Home's lead (PRD-003 §3.2, US-306), its pure parts: which
 * quick-access tiles show, where each goes, and the founder card's
 * signed-in-only rows. Everything is read from what Home already has (its
 * document list and the one cached sections answer), so none of it makes a
 * request or asks for a document link (KP20).
 */

const copy = strings.company.quickAccess;

/** The six tiles, in §3.2's order. */
export type QuickAccessKey = "deck" | "demo" | "documents" | "team" | "faq" | "bookCall";

export interface QuickAccessTile {
  readonly key: QuickAccessKey;
  readonly label: string;
  /** The small line under the label: what the tile opens. */
  readonly hint: string;
  /** An app route (relative to the basename, as lib/paths.ts has them), or the booking page's https address. */
  readonly href: string;
  /** True only for the booking page, which opens in a new tab. */
  readonly external: boolean;
}

export interface QuickAccessData {
  /** Home's document list; null while it loads or when it cannot be read (storage down). */
  readonly documents: readonly InvestorDocument[] | null;
  /** The published sections; null while they load or when they cannot be read. */
  readonly sections: readonly Section[] | null;
  /** The booking page's address as company-data.ts sets it (FOUNDER.bookingUrl); null until it is known. */
  readonly bookingUrl: string | null;
}

/** The tiles that open a page of the portal itself. */
type RouteTileKey = Exclude<QuickAccessKey, "bookCall">;

const NO_TILES: readonly QuickAccessTile[] = Object.freeze([]);
const NO_ROWS: readonly ContactRow[] = Object.freeze([]);

/** The section pages that get a tile (Contact's is Book a call's fallback, not a tile of its own). */
const PAGE_TILES = ["team", "faq"] as const satisfies readonly RouteTileKey[];

/** A frozen copy: neither a tile nor the list it is in can change. */
const frozenTile = (tile: QuickAccessTile): QuickAccessTile => Object.freeze({ ...tile });

function routeTile(key: RouteTileKey, href: string): QuickAccessTile {
  const { label, hint } = copy[key];
  return frozenTile({ key, label, hint, href, external: false });
}

/**
 * View the deck and Play the demo when the pitch block has them (the same
 * pick: pickFeaturedPitch), then Documents when the list holds anything.
 * None while the list loads or when storage is down.
 */
function documentTiles(documents: readonly InvestorDocument[] | null): readonly QuickAccessTile[] {
  if (documents === null) return NO_TILES;
  const { deck, video } = pickFeaturedPitch(documents);
  return [
    ...(deck === null ? [] : [routeTile("deck", presentPath(deck.id))]),
    ...(video === null ? [] : [routeTile("demo", documentPath(video.id))]),
    ...(documents.length === 0 ? [] : [routeTile("documents", DOCUMENTS_PATH)]),
  ];
}

/** Team and FAQ once published, as the sidebar links them (publishedPages), in that order. */
function pageTiles(sections: readonly Section[] | null): readonly QuickAccessTile[] {
  if (sections === null) return NO_TILES;
  const published: readonly string[] = publishedPages(sections);
  return PAGE_TILES.filter((slug) => published.includes(slug)).map((slug) => routeTile(slug, SECTION_PATHS[slug]));
}

/**
 * Home's one Book a call (PRD-003 §12, Q7): the booking page with the
 * portal's ref tag, in a new tab, once its address is set (D8); until then
 * the Contact page, where the booking link lives, while Contact is
 * published; otherwise none.
 */
function bookCallTiles(bookingUrl: string | null, sections: readonly Section[] | null): readonly QuickAccessTile[] {
  const { label, hint, contactHint } = copy.bookCall;
  if (bookingUrl !== null) {
    return [frozenTile({ key: "bookCall", label, hint, href: bookingHref(bookingUrl), external: true })];
  }
  if (sections === null || findSection(sections, "contact") === null) return NO_TILES;
  return [frozenTile({ key: "bookCall", label, hint: contactHint, href: CONTACT_PATH, external: false })];
}

/**
 * Home's quick-access tiles (PRD-003 §3.2 item 3), each only when its
 * content exists, in the order: the deck, the demo, Documents, Team, FAQ,
 * Book a call. A new frozen list each time.
 */
export function quickAccessTiles({ documents, sections, bookingUrl }: QuickAccessData): readonly QuickAccessTile[] {
  return Object.freeze([...documentTiles(documents), ...pageTiles(sections), ...bookCallTiles(bookingUrl, sections)]);
}

/**
 * The founder card's signed-in-only rows (PRD-003 D5): the published
 * founder_card section's, parsed by card-rows.ts. None while the sections
 * load or cannot be read (null), or while the section is unpublished (it
 * ships so), as the overview behaves.
 */
export function founderCardRows(sections: readonly Section[] | null): readonly ContactRow[] {
  if (sections === null) return NO_ROWS;
  const section = findSection(sections, FOUNDER_CARD_SECTION);
  return section === null ? NO_ROWS : parseCardRows(section.bodyMd).rows;
}
