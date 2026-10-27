import { INVESTOR_TYPES, SOURCES, type InvestorType, type Source } from "@/profile/options";

/**
 * The investors table's state, kept in the URL's query string so a view can
 * be bookmarked, shared with another admin and walked with Back. The keys
 * and values are the API's own (GET /admin/investors): the same string asks
 * the server for the page. Parsing never fails: anything unknown or out of
 * range reads as the default, as the server would refuse it (400).
 */

/** The server's sort keys (server/investors/queries/investor-list.js SORT_KEYS). */
export const SORT_KEYS = [
  "name",
  "firm",
  "created_at",
  "last_seen_at",
  "sessions",
  "total_ms",
  "docs_opened",
  "downloads",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

/** routes/admin-investors.js LIST_LIMITS. */
export const SEARCH_MAX_LENGTH = 200;
export const MAX_PAGE = 999_999;

/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;

export interface InvestorsQuery {
  /** Trimmed; "" is no search. */
  readonly q: string;
  readonly type: InvestorType | null;
  readonly source: Source | null;
  readonly sort: SortKey;
  readonly dir: SortDirection;
  /** From 1. */
  readonly page: number;
}

/** The server's default: the most recently seen first. */
export const DEFAULT_QUERY: InvestorsQuery = Object.freeze({
  q: "",
  type: null,
  source: null,
  sort: "last_seen_at",
  dir: "desc",
  page: 1,
});

/** A newly chosen column sorts A to Z for text, and largest or newest first for numbers and dates. */
const FIRST_DIRECTION: Readonly<Record<SortKey, SortDirection>> = {
  name: "asc",
  firm: "asc",
  created_at: "desc",
  last_seen_at: "desc",
  sessions: "desc",
  total_ms: "desc",
  docs_opened: "desc",
  downloads: "desc",
};

function oneOf<T extends string>(values: readonly T[], value: string | null): T | null {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : null;
}

const isControlChar = (char: string) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127;

/** One line of at most 200 characters: the server refuses longer, and control characters (lib/text-checks.ts). */
export function cleanSearch(text: string): string {
  const oneLine = [...text].map((char) => (isControlChar(char) ? " " : char)).join("");
  return oneLine.trim().slice(0, SEARCH_MAX_LENGTH).trim();
}

/** "N" from 1 to MAX_PAGE; anything else is page 1. */
export function parsePage(value: string | null): number {
  if (value === null || !/^[1-9]\d{0,5}$/.test(value)) return 1;
  return Number(value);
}

export function parseInvestorsQuery(params: URLSearchParams): InvestorsQuery {
  const dir = params.get("dir");
  return {
    q: cleanSearch(params.get("q") ?? ""),
    type: oneOf(INVESTOR_TYPES, params.get("type")),
    source: oneOf(SOURCES, params.get("source")),
    sort: oneOf(SORT_KEYS, params.get("sort")) ?? DEFAULT_QUERY.sort,
    dir: dir === "asc" || dir === "desc" ? dir : DEFAULT_QUERY.dir,
    page: parsePage(params.get("page")),
  };
}

/** Only what differs from the default, in a fixed order, so equal views have equal URLs. */
export function serialiseInvestorsQuery(query: InvestorsQuery): URLSearchParams {
  const entries: [string, string][] = [];
  if (query.q !== "") entries.push(["q", query.q]);
  if (query.type !== null) entries.push(["type", query.type]);
  if (query.source !== null) entries.push(["source", query.source]);
  if (query.sort !== DEFAULT_QUERY.sort) entries.push(["sort", query.sort]);
  if (query.dir !== DEFAULT_QUERY.dir) entries.push(["dir", query.dir]);
  if (query.page !== 1) entries.push(["page", String(query.page)]);
  return new URLSearchParams(entries);
}

/** The list request's query string: "" or "?…". */
export function apiSearch(query: InvestorsQuery): string {
  const search = serialiseInvestorsQuery(query).toString();
  return search === "" ? "" : `?${search}`;
}

/** The same column again flips the direction; a new column starts at its natural one. Back to page 1. */
export function toggleSort(query: InvestorsQuery, key: SortKey): InvestorsQuery {
  const dir = query.sort === key ? (query.dir === "asc" ? "desc" : "asc") : FIRST_DIRECTION[key];
  return { ...query, sort: key, dir, page: 1 };
}

/** A new search or filter shows its first page. */
export function withFilters(
  query: InvestorsQuery,
  change: Partial<Pick<InvestorsQuery, "q" | "type" | "source">>,
): InvestorsQuery {
  const q = change.q === undefined ? query.q : cleanSearch(change.q);
  return { ...query, ...change, q, page: 1 };
}

/** No search and no filters, first page; the sort stays. */
export function clearFilters(query: InvestorsQuery): InvestorsQuery {
  return { ...DEFAULT_QUERY, sort: query.sort, dir: query.dir };
}

export function withPage(query: InvestorsQuery, page: number): InvestorsQuery {
  return { ...query, page: Math.min(Math.max(1, Math.trunc(page)), MAX_PAGE) };
}

export function hasFilters(query: InvestorsQuery): boolean {
  return query.q !== "" || query.type !== null || query.source !== null;
}

/** For a column head: its aria-sort value. */
export function sortState(query: InvestorsQuery, key: SortKey): "ascending" | "descending" | "none" {
  if (query.sort !== key) return "none";
  return query.dir === "asc" ? "ascending" : "descending";
}
