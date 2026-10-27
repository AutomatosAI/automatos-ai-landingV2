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
