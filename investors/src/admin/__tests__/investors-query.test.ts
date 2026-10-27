import { describe, expect, it } from "vitest";

import {
  apiSearch,
  cleanSearch,
  clearFilters,
  DEFAULT_QUERY,
  hasFilters,
  parseInvestorsQuery,
  parsePage,
  serialiseInvestorsQuery,
  SORT_KEYS,
  sortState,
  toggleSort,
  withFilters,
  withPage,
  type InvestorsQuery,
} from "../investors-query";

const parse = (search: string) => parseInvestorsQuery(new URLSearchParams(search));
const serialise = (query: InvestorsQuery) => serialiseInvestorsQuery(query).toString();

const FULL: InvestorsQuery = Object.freeze({
  q: "ada example",
  type: "angel",
  source: "intro",
  sort: "total_ms",
  dir: "asc",
  page: 3,
});

describe("parseInvestorsQuery", () => {
  it("reads nothing as the server's default view", () => {
    expect(parse("")).toEqual(DEFAULT_QUERY);
    expect(DEFAULT_QUERY).toEqual({ q: "", type: null, source: null, sort: "last_seen_at", dir: "desc", page: 1 });
  });

  it("reads every key the API takes", () => {
    expect(parse("q=ada+example&type=angel&source=intro&sort=total_ms&dir=asc&page=3")).toEqual(FULL);
  });

  it("knows every server sort key", () => {
    for (const key of SORT_KEYS) expect(parse(`sort=${key}`).sort).toBe(key);
  });

  it("reads anything unknown or out of range as the default, as the server would refuse it", () => {
    expect(parse("type=hedge_fund&source=tv&sort=email&dir=up&page=0")).toEqual(DEFAULT_QUERY);
    expect(parse("page=-2").page).toBe(1);
    expect(parse("page=2.5").page).toBe(1);
    expect(parse("page=1e3").page).toBe(1);
    expect(parse("page=1000000").page).toBe(1);
    expect(parse("page=999999").page).toBe(999_999);
    expect(parse("sort=toString&type=__proto__")).toEqual(DEFAULT_QUERY);
  });

  it("trims the search, makes it one line and caps it at 200 characters", () => {
    expect(parse("q=%20%20ada%20%20").q).toBe("ada");
    expect(parse("q=ada%0Aexample").q).toBe("ada example");
    expect(parse(`q=${"a".repeat(250)}`).q).toHaveLength(200);
    expect(parse("q=%20%20%20").q).toBe("");
  });

  it("ignores keys it does not know", () => {
    expect(parse("utm_source=x&page=2")).toEqual({ ...DEFAULT_QUERY, page: 2 });
  });
});

describe("serialiseInvestorsQuery", () => {
  it("writes nothing for the default view", () => {
    expect(serialise(DEFAULT_QUERY)).toBe("");
    expect(apiSearch(DEFAULT_QUERY)).toBe("");
  });

  it("writes only what differs from the default, in a fixed order", () => {
    expect(serialise(FULL)).toBe("q=ada+example&type=angel&source=intro&sort=total_ms&dir=asc&page=3");
    expect(serialise({ ...DEFAULT_QUERY, page: 2, sort: "name" })).toBe("sort=name&page=2");
    expect(serialise({ ...DEFAULT_QUERY, dir: "asc" })).toBe("dir=asc");
  });

  it("round-trips through the URL", () => {
    expect(parse(serialise(FULL))).toEqual(FULL);
    expect(parse(serialise(DEFAULT_QUERY))).toEqual(DEFAULT_QUERY);
    const odd: InvestorsQuery = { ...DEFAULT_QUERY, q: "50% & co_ #1" };
    expect(parse(serialise(odd))).toEqual(odd);
  });

  it("gives the API the same query string, with its question mark", () => {
    expect(apiSearch(FULL)).toBe("?q=ada+example&type=angel&source=intro&sort=total_ms&dir=asc&page=3");
  });

  it("writes equal views to equal strings whatever order the URL had", () => {
    expect(serialise(parse("page=2&sort=firm&q=x"))).toBe(serialise(parse("q=x&sort=firm&page=2")));
  });
});

describe("toggleSort", () => {
  it("flips the direction on the same column", () => {
    expect(toggleSort(DEFAULT_QUERY, "last_seen_at")).toMatchObject({ sort: "last_seen_at", dir: "asc" });
    expect(toggleSort({ ...DEFAULT_QUERY, dir: "asc" }, "last_seen_at")).toMatchObject({ dir: "desc" });
  });

  it("starts text columns A to Z and number and date columns largest first", () => {
    expect(toggleSort(DEFAULT_QUERY, "name")).toMatchObject({ sort: "name", dir: "asc" });
    expect(toggleSort(DEFAULT_QUERY, "firm")).toMatchObject({ sort: "firm", dir: "asc" });
    expect(toggleSort({ ...DEFAULT_QUERY, sort: "name", dir: "asc" }, "total_ms")).toMatchObject({ dir: "desc" });
    expect(toggleSort({ ...DEFAULT_QUERY, sort: "name", dir: "asc" }, "created_at")).toMatchObject({ dir: "desc" });
  });

  it("goes back to page 1 and keeps the search and filters", () => {
    expect(toggleSort(FULL, "downloads")).toEqual({ ...FULL, sort: "downloads", dir: "desc", page: 1 });
  });

  it("returns a new query and leaves the old one as it was", () => {
    const next = toggleSort(FULL, "name");
    expect(next).not.toBe(FULL);
    expect(FULL.sort).toBe("total_ms");
  });
});

describe("withFilters, clearFilters and withPage", () => {
  it("a new search or filter shows its first page and keeps the sort", () => {
    expect(withFilters(FULL, { q: "  ben " })).toEqual({ ...FULL, q: "ben", page: 1 });
    expect(withFilters(FULL, { type: null })).toEqual({ ...FULL, type: null, page: 1 });
    expect(withFilters(FULL, { source: "website" })).toEqual({ ...FULL, source: "website", page: 1 });
  });

  it("clearing drops the search and filters but keeps the sort", () => {
    expect(clearFilters(FULL)).toEqual({ ...DEFAULT_QUERY, sort: "total_ms", dir: "asc" });
    expect(hasFilters(clearFilters(FULL))).toBe(false);
  });

  it("keeps the page between 1 and the server's limit", () => {
    expect(withPage(FULL, 4).page).toBe(4);
    expect(withPage(FULL, 0).page).toBe(1);
    expect(withPage(FULL, 2.7).page).toBe(2);
    expect(withPage(FULL, 5_000_000).page).toBe(999_999);
  });

  it("knows when anything narrows the list", () => {
    expect(hasFilters(DEFAULT_QUERY)).toBe(false);
    expect(hasFilters({ ...DEFAULT_QUERY, q: "a" })).toBe(true);
    expect(hasFilters({ ...DEFAULT_QUERY, type: "vc" })).toBe(true);
    expect(hasFilters({ ...DEFAULT_QUERY, source: "other" })).toBe(true);
    expect(hasFilters({ ...DEFAULT_QUERY, sort: "name", page: 4 })).toBe(false);
  });
});

describe("sortState", () => {
  it("names the sorted column's direction for aria-sort, and none for the others", () => {
    expect(sortState(DEFAULT_QUERY, "last_seen_at")).toBe("descending");
    expect(sortState({ ...DEFAULT_QUERY, dir: "asc" }, "last_seen_at")).toBe("ascending");
    expect(sortState(DEFAULT_QUERY, "name")).toBe("none");
  });
});

describe("cleanSearch and parsePage", () => {
  it("replaces control characters with spaces", () => {
    expect(cleanSearch("ada\texample\u007f")).toBe("ada example");
  });

  it("reads a page number or 1", () => {
    expect(parsePage(null)).toBe(1);
    expect(parsePage("12")).toBe(12);
    expect(parsePage("012")).toBe(1);
    expect(parsePage("")).toBe(1);
  });
});
