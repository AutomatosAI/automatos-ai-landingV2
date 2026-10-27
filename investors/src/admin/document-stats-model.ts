import { formatDateTime } from "@/lib/format";
import { strings } from "@/strings";

import type { AdminDocument } from "./documents-api";
import type { DocumentStats, PageStats, Reader } from "./document-stats-api";
import { formatDuration, pagesLabel } from "./investors-model";

/**
 * What the document analytics screen shows, worked out from GET
 * /admin/documents/:id/stats: the KPI cards, the version picker's choices,
 * the two charts' rows and their words, and each reader's row. Pure
 * functions, so the components stay thin (KP15).
 */

const copy = strings.admin.stats;

const MS_PER_SECOND = 1000;

/** Page time is recorded by the PDF viewer only (W1-13); other kinds have none to show. */
export function recordsPages(document: Pick<AdminDocument, "kind">): boolean {
  return document.kind === "pdf";
}

export type StatsKey = "readers" | "opens" | "downloads" | "avgTime";

export interface StatsCard {
  readonly key: StatsKey;
  readonly label: string;
  readonly value: number | string;
  readonly detail: string;
}

export function statsCards(stats: DocumentStats): readonly StatsCard[] {
  const kpis = copy.kpis;
  const paged = recordsPages(stats.document);
  return [
    { key: "readers", label: kpis.readers, value: stats.uniqueReaders, detail: kpis.readersDetail },
    { key: "opens", label: kpis.opens, value: stats.opens, detail: kpis.opensDetail },
    { key: "downloads", label: kpis.downloads, value: stats.downloads, detail: kpis.downloadsDetail },
    {
      key: "avgTime",
      label: kpis.avgTime,
      value: paged ? formatDuration(stats.avgTimeMs) : kpis.none,
      detail: paged ? kpis.avgTimeDetail : kpis.notPagedDetail,
    },
  ];
}

export interface VersionOption {
  readonly version: number;
  readonly label: string;
}

/**
 * The picker's choices, newest first: every version with events, the
 * current one (missing from versions until someone reads it), the one shown
 * and the one picked (an address may name a version with no events, and the
 * picked one is still loading while the last answer stays on screen).
 */
export function versionOptions(stats: DocumentStats, selected: number = stats.version): readonly VersionOption[] {
  const current = stats.document.version;
  const versions = [...new Set([...stats.versions, current, stats.version, selected])].sort((a, b) => b - a);
  return versions.map((version) => ({ version, label: copy.version.option(version, version === current) }));
}

/** Under the title: "PDF · 12 pages", the kind alone when the page count is not known. */
export function documentMeta(document: Pick<AdminDocument, "kind" | "pageCount">): string {
  const words = strings.admin.documents;
  const kind = words.kinds[document.kind];
  return document.pageCount === null ? kind : `${kind} · ${words.pages(document.pageCount)}`;
}

export function isOlderVersion(stats: DocumentStats): boolean {
  return stats.version !== stats.document.version;
}

/** Why the pages are not charted, or "charted". */
export type ChartState = "charted" | "not_pdf" | "no_page_count" | "no_readers";

export function chartState(stats: DocumentStats): ChartState {
  if (stats.pages.length === 0) return recordsPages(stats.document) ? "no_page_count" : "not_pdf";
  if (stats.uniqueReaders === 0) return "no_readers";
  return "charted";
}

/** The words in place of the charts; null when they are drawn. */
export function chartEmptyText(state: ChartState): string | null {
  switch (state) {
    case "charted":
      return null;
    case "not_pdf":
      return copy.pages.notPdf;
    case "no_page_count":
      return copy.pages.noPageCount;
    case "no_readers":
      return copy.pages.noReaders;
  }
}

/** One page on both charts; label is the x-axis tick. */
export interface PageRow {
  readonly page: number;
  readonly label: string;
  /** The bar: average dwell in seconds, one decimal. */
  readonly dwellSeconds: number;
  /** The line: 0..100. */
  readonly pctReached: number;
  readonly readersReached: number;
}

const toSeconds = (ms: number) => Math.round(ms / (MS_PER_SECOND / 10)) / 10;

/** The server's pages (1..pageCount, zero-filled) as chart rows, one per page, in page order. */
export function toPageRows(pages: readonly PageStats[]): readonly PageRow[] {
  return pages.map((stats) => ({
    page: stats.page,
    label: String(stats.page),
    dwellSeconds: toSeconds(stats.avgDwellMs),
    pctReached: stats.pctReached,
    readersReached: stats.readersReached,
  }));
}

/** A bar's value in the tooltip: "1 min 5 s". */
export function dwellText(seconds: number): string {
  return formatDuration(Math.round(seconds * MS_PER_SECOND));
}

/** A point's value in the line's tooltip: "60% (3 readers)"; row is the point's PageRow as recharts hands it over. */
export function reachText(percent: number, row: unknown): string {
  const readers =
    typeof row === "object" && row !== null && "readersReached" in row && typeof row.readersReached === "number"
      ? row.readersReached
      : null;
  return readers === null ? copy.reach.tick(percent) : copy.reach.value(percent, readers);
}

/** The bar chart in words, for screen readers. */
export function dwellSummary(pages: readonly PageStats[]): string {
  const longest = pages.reduce<PageStats | null>(
    (most, page) => (page.avgDwellMs > (most?.avgDwellMs ?? 0) ? page : most),
    null,
  );
  const words = longest === null ? null : { page: longest.page, time: formatDuration(longest.avgDwellMs) };
  return copy.dwell.summary(pages.length, words);
}

export interface Drop {
  /** Readers fall away between this page and the next. */
  readonly after: number;
  readonly from: number;
  readonly to: number;
}

/** Where the most readers stop: the largest fall in % reached from one page to the next; null when none falls. */
export function largestDrop(pages: readonly PageStats[]): Drop | null {
  return pages.slice(1).reduce<Drop | null>((largest, page, index) => {
    const before = pages[index];
    if (!before) return largest;
    const fall = before.pctReached - page.pctReached;
    const largestFall = largest === null ? 0 : largest.from - largest.to;
    return fall > largestFall ? { after: before.page, from: before.pctReached, to: page.pctReached } : largest;
  }, null);
}

/** The line chart in words, for screen readers; "" without pages. */
export function reachSummary(pages: readonly PageStats[]): string {
  const first = pages[0];
  const last = pages[pages.length - 1];
  if (!first || !last) return "";
  return copy.reach.summary(first.pctReached, last.pctReached, last.page, largestDrop(pages));
}

/** A reader's row in the table, in words. */
export interface ReaderFacts {
  readonly investorId: string;
  readonly name: string;
  readonly firm: string | null;
  readonly furthestPage: string;
  readonly time: string;
  readonly downloaded: string;
  readonly lastOpened: string;
}

/**
 * Pages and time for PDFs only. An older version's furthest page is as
 * recorded (it may pass the current page count), so it shows without one.
 */
export function readerFacts(reader: Reader, stats: DocumentStats): ReaderFacts {
  const words = copy.readers;
  const paged = recordsPages(stats.document);
  const pageCount = isOlderVersion(stats) ? null : stats.document.pageCount;
  return {
    investorId: reader.investorId,
    name: reader.name ?? words.unnamed,
    firm: reader.firm,
    furthestPage: paged ? pagesLabel(reader.furthestPage, pageCount) : words.none,
    time: paged ? formatDuration(reader.timeMs) : words.none,
    downloaded: reader.downloaded ? words.yes : words.no,
    lastOpened: reader.lastOpenAt === null ? words.none : formatDateTime(reader.lastOpenAt),
  };
}
