import { formatBytes, formatDate } from "@/lib/format";
import { strings } from "@/strings";

import type { InvestorDocument } from "./documents-api";
import type { DocumentKind } from "./kinds";

/**
 * The library's pure parts: grouping by category, the search filter, a
 * card's facts and what Open does. The server sends the documents in the
 * admin's order (sort_order, then created_at); nothing here re-sorts them.
 */

export interface DocumentGroup {
  /** The category as the first document in it spells it. */
  readonly category: string;
  readonly documents: readonly InvestorDocument[];
}

const groupKey = (category: string) => category.trim().toLocaleLowerCase();

/**
 * Groups in the order their first document appears, so the admin's order
 * decides the category order too; documents keep their order inside a group.
 * Categories that differ only in case or spaces are one group.
 */
export function groupByCategory(documents: readonly InvestorDocument[]): readonly DocumentGroup[] {
  const groups = documents.reduce<ReadonlyMap<string, DocumentGroup>>((acc, document) => {
    const key = groupKey(document.category);
    const group = acc.get(key) ?? { category: document.category.trim(), documents: [] };
    return new Map(acc).set(key, { ...group, documents: [...group.documents, document] });
  }, new Map());
  return [...groups.values()];
}

/** The query's words, lower-cased; none for a blank query. */
export function searchTerms(query: string): readonly string[] {
  return query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
}

const haystack = (document: InvestorDocument) =>
  [document.title, document.description ?? "", document.category].join("\n").toLocaleLowerCase();

/** Documents whose title, description or category hold every word of the query, in their order. */
export function filterDocuments(documents: readonly InvestorDocument[], query: string): readonly InvestorDocument[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return documents;
  return documents.filter((document) => {
    const text = haystack(document);
    return terms.every((term) => text.includes(term));
  });
}

/** The card's small print: kind, size (when known) and the updated date. */
export function documentFacts(document: InvestorDocument): readonly string[] {
  const size = document.sizeBytes === null ? "" : formatBytes(document.sizeBytes);
  const date = formatDate(document.updatedAt);
  return [strings.library.kinds[document.kind], size, date && strings.library.updated(date)].filter(Boolean);
}

/** A PDF reads in the portal's PDF viewer (W1-13). */
export function opensInViewer(kind: DocumentKind): boolean {
  return kind === "pdf";
}

/** What shows a document on its page (/documents/:id): the PDF viewer or the video player (W2-04). */
export type DocumentViewer = "pdf" | "video";

/** Open goes to the document's page for a PDF or a video; null: every other kind is downloaded. */
export function viewerFor(kind: DocumentKind): DocumentViewer | null {
  if (opensInViewer(kind)) return "pdf";
  return kind === "video" ? "video" : null;
}

/** The home page's pitch block (W3-03): the deck and the video, each null when there is none. */
export interface FeaturedPitch {
  readonly deck: InvestorDocument | null;
  readonly video: InvestorDocument | null;
}

const PITCH_PREFIX = "pitch";

/** "Pitch", " pitch deck ", "PITCH": the categories the pitch block picks from. */
export function isPitchCategory(category: string): boolean {
  return groupKey(category).startsWith(PITCH_PREFIX);
}

/**
 * Among the pitch documents, the first PDF is the deck and the first video
 * the video, in the admin's order. The investor's list holds only published
 * documents with a file (the server's), so nothing else is filtered here.
 */
export function pickFeaturedPitch(documents: readonly InvestorDocument[]): FeaturedPitch {
  const pitch = documents.filter((document) => isPitchCategory(document.category));
  return {
    deck: pitch.find((document) => viewerFor(document.kind) === "pdf") ?? null,
    video: pitch.find((document) => viewerFor(document.kind) === "video") ?? null,
  };
}

export function hasFeaturedPitch(pitch: FeaturedPitch): boolean {
  return pitch.deck !== null || pitch.video !== null;
}

/**
 * The groups below the pitch block: every category in the admin's order, as
 * groupByCategory has them, without the featured deck and video; a group
 * they leave empty goes. The other pitch documents stay in their group.
 */
export function groupsBelowPitch(documents: readonly InvestorDocument[], pitch: FeaturedPitch): readonly DocumentGroup[] {
  const featured = new Set([pitch.deck?.id, pitch.video?.id]);
  return groupByCategory(documents)
    .map((group) => ({ ...group, documents: group.documents.filter((document) => !featured.has(document.id)) }))
    .filter((group) => group.documents.length > 0);
}
