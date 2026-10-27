import { describe, expect, it } from "vitest";

import { strings } from "@/strings";
import { adminDocument } from "@/test/fixtures";

import { documentStatsSchema } from "../document-stats-api";
import {
  chartEmptyText,
  chartState,
  documentMeta,
  dwellSummary,
  dwellText,
  isOlderVersion,
  largestDrop,
  reachSummary,
  reachText,
  readerFacts,
  statsCards,
  toPageRows,
  versionOptions,
} from "../document-stats-model";
import { BEN_ID, DEE_ID, FIVE_PAGES, documentStats, reader, videoStats } from "./document-stats-fixtures";

const copy = strings.admin.stats;

describe("the stats-to-chart mapping", () => {
  it("gives one row per page, in page order, with the page as the axis label", () => {
    const rows = toPageRows(FIVE_PAGES);
    expect(rows.map((row) => row.page)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map((row) => row.label)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("charts average dwell in seconds to one decimal, and the reach as sent", () => {
    expect(toPageRows(FIVE_PAGES)).toEqual([
      { page: 1, label: "1", dwellSeconds: 12.3, pctReached: 75, readersReached: 3 },
      { page: 2, label: "2", dwellSeconds: 40, pctReached: 75, readersReached: 3 },
      { page: 3, label: "3", dwellSeconds: 8, pctReached: 50, readersReached: 2 },
      { page: 4, label: "4", dwellSeconds: 0, pctReached: 25, readersReached: 1 },
      { page: 5, label: "5", dwellSeconds: 5, pctReached: 25, readersReached: 1 },
    ]);
  });

  it("rounds to the nearest tenth of a second", () => {
    const rows = toPageRows([
      { page: 1, avgDwellMs: 49, readersReached: 1, pctReached: 100 },
      { page: 2, avgDwellMs: 50, readersReached: 1, pctReached: 100 },
      { page: 3, avgDwellMs: 61_949, readersReached: 1, pctReached: 33.3 },
    ]);
    expect(rows.map((row) => row.dwellSeconds)).toEqual([0, 0.1, 61.9]);
    expect(rows.map((row) => row.pctReached)).toEqual([100, 100, 33.3]);
  });

  it("does not change the server's pages", () => {
    const pages = Object.freeze(FIVE_PAGES.map((page) => Object.freeze({ ...page })));
    expect(() => toPageRows(pages)).not.toThrow();
    expect(pages).toEqual(FIVE_PAGES);
  });

  it("has no rows without pages", () => {
    expect(toPageRows([])).toEqual([]);
  });

  it("words the tooltips: a bar's time, a point's share and readers", () => {
    expect(dwellText(12.3)).toBe("12 s");
    expect(dwellText(65)).toBe("1 min 5 s");
    expect(reachText(75, { page: 1, readersReached: 3 })).toBe("75% (3 readers)");
    expect(reachText(25, { readersReached: 1 })).toBe("25% (1 reader)");
    expect(reachText(50, undefined)).toBe("50%");
    expect(reachText(50, { readersReached: "3" })).toBe("50%");
  });
});

describe("where readers drop off", () => {
  it("finds the largest fall from one page to the next", () => {
    expect(largestDrop(FIVE_PAGES)).toEqual({ after: 2, from: 75, to: 50 });
  });

  it("takes the first of two equal falls", () => {
    const pages = [100, 50, 50, 0].map((pctReached, index) => ({ page: index + 1, avgDwellMs: 0, readersReached: 0, pctReached }));
    expect(largestDrop(pages)).toEqual({ after: 1, from: 100, to: 50 });
  });

  it("is null when no page loses readers, or there is one page", () => {
    const flat = [80, 80, 80].map((pctReached, index) => ({ page: index + 1, avgDwellMs: 0, readersReached: 4, pctReached }));
    expect(largestDrop(flat)).toBeNull();
    expect(largestDrop(FIVE_PAGES.slice(0, 1))).toBeNull();
    expect(largestDrop([])).toBeNull();
  });

  it("says both charts in words for screen readers", () => {
    expect(dwellSummary(FIVE_PAGES)).toBe(copy.dwell.summary(5, { page: 2, time: "40 s" }));
    expect(reachSummary(FIVE_PAGES)).toBe(copy.reach.summary(75, 25, 5, { after: 2, from: 75, to: 50 }));
    expect(reachSummary(FIVE_PAGES)).toBe(
      "75% of readers reached page 1 and 25% reached page 5. The largest drop is after page 2, from 75% to 50%.",
    );
  });

  it("says when no time was recorded on any page, and nothing without pages", () => {
    const idle = FIVE_PAGES.map((page) => ({ ...page, avgDwellMs: 0 }));
    expect(dwellSummary(idle)).toBe(copy.dwell.summary(5, null));
    expect(reachSummary([])).toBe("");
  });
});

describe("the empty state", () => {
  it("is drawn in words for a document that is not a PDF", () => {
    const stats = videoStats();
    expect(chartState(stats)).toBe("not_pdf");
    expect(chartEmptyText(chartState(stats))).toBe(copy.pages.notPdf);
  });

  it("covers every kind that is not a PDF", () => {
    const kinds = ["video", "spreadsheet", "slides", "doc", "other"] as const;
    for (const kind of kinds) {
      expect(chartState(documentStats({ document: adminDocument({ kind, pageCount: null }), pages: [] }))).toBe("not_pdf");
    }
  });

  it("says so for a PDF whose page count is not known", () => {
    const stats = documentStats({ document: adminDocument({ pageCount: null, version: 2 }), pages: [] });
    expect(chartState(stats)).toBe("no_page_count");
    expect(chartEmptyText("no_page_count")).toBe(copy.pages.noPageCount);
  });

  it("says so when nobody read this version, and charts once someone did", () => {
    const unread = documentStats({ uniqueReaders: 0, opens: 0, downloads: 0, avgTimeMs: 0, readers: [] });
    expect(chartState(unread)).toBe("no_readers");
    expect(chartEmptyText("no_readers")).toBe(copy.pages.noReaders);
    expect(chartState(documentStats())).toBe("charted");
    expect(chartEmptyText("charted")).toBeNull();
  });

  it("shows no time for a document whose pages are not recorded", () => {
    const avgTime = statsCards(videoStats()).find((card) => card.key === "avgTime");
    expect(avgTime).toEqual({ key: "avgTime", label: copy.kpis.avgTime, value: copy.kpis.none, detail: copy.kpis.notPagedDetail });
  });
});

describe("the KPI cards", () => {
  it("are the readers, opens, downloads and the average time, in that order", () => {
    expect(statsCards(documentStats())).toEqual([
      { key: "readers", label: copy.kpis.readers, value: 4, detail: copy.kpis.readersDetail },
      { key: "opens", label: copy.kpis.opens, value: 6, detail: copy.kpis.opensDetail },
      { key: "downloads", label: copy.kpis.downloads, value: 2, detail: copy.kpis.downloadsDetail },
      { key: "avgTime", label: copy.kpis.avgTime, value: "3 min 20 s", detail: copy.kpis.avgTimeDetail },
    ]);
  });
});

describe("the version picker", () => {
  it("offers every version with events, newest first, the current one marked", () => {
    expect(versionOptions(documentStats())).toEqual([
      { version: 2, label: "Version 2 (current)" },
      { version: 1, label: "Version 1" },
    ]);
  });

  it("adds the current version before anyone has read it", () => {
    const stats = documentStats({ document: adminDocument({ version: 3 }), version: 3, versions: [2, 1] });
    expect(versionOptions(stats).map((option) => option.version)).toEqual([3, 2, 1]);
  });

  it("adds the version shown and the one picked, once each", () => {
    const stats = documentStats({ version: 7 });
    expect(versionOptions(stats).map((option) => option.version)).toEqual([7, 2, 1]);
    expect(versionOptions(documentStats(), 1).map((option) => option.version)).toEqual([2, 1]);
    expect(versionOptions(documentStats(), 4).map((option) => option.version)).toEqual([4, 2, 1]);
  });

  it("knows an older version from the current one", () => {
    expect(isOlderVersion(documentStats())).toBe(false);
    expect(isOlderVersion(documentStats({ version: 1 }))).toBe(true);
  });
});

describe("the readers table", () => {
  it("words a reader of the current version against its page count", () => {
    expect(readerFacts(reader(), documentStats())).toEqual({
      investorId: reader().investorId,
      name: "Ada Example",
      firm: "Example Ventures",
      furthestPage: "3/5",
      time: "1 min 5 s",
      downloaded: copy.readers.yes,
      lastOpened: expect.stringMatching(/^27 Oct, \d\d:\d\d$/),
    });
  });

  it("names nobody it does not know and shows no open for a download only", () => {
    const facts = readerFacts(reader({ investorId: DEE_ID, name: null, firm: null, furthestPage: 0, timeMs: 0, lastOpenAt: null }), documentStats());
    expect(facts).toMatchObject({ name: copy.readers.unnamed, firm: null, furthestPage: "0/5", time: "0 s", lastOpened: copy.readers.none });
  });

  it("shows an older version's furthest page as recorded, without the current page count", () => {
    const older = documentStats({ version: 1 });
    expect(readerFacts(reader({ investorId: BEN_ID, furthestPage: 7, downloaded: false }), older)).toMatchObject({
      furthestPage: "7",
      downloaded: copy.readers.no,
    });
  });

  it("shows no page or time for a document whose pages are not recorded", () => {
    expect(readerFacts(reader(), videoStats())).toMatchObject({ furthestPage: copy.readers.none, time: copy.readers.none });
  });
});

describe("the title's line and the answer's shape", () => {
  it("names the kind and the page count", () => {
    expect(documentMeta(adminDocument({ kind: "pdf", pageCount: 5 }))).toBe("PDF · 5 pages");
    expect(documentMeta(adminDocument({ kind: "pdf", pageCount: 1 }))).toBe("PDF · 1 page");
    expect(documentMeta(adminDocument({ kind: "video", pageCount: null }))).toBe("Video");
  });

  it("parses the fixtures as the server sends them, and refuses a share over 100", () => {
    expect(documentStatsSchema.parse(documentStats())).toEqual(documentStats());
    expect(documentStatsSchema.parse(videoStats())).toEqual(videoStats());
    const page = { page: 1, avgDwellMs: 0, readersReached: 1, pctReached: 100.1 };
    expect(documentStatsSchema.safeParse(documentStats({ pages: [page] })).success).toBe(false);
  });
});
