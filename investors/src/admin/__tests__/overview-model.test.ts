import { describe, expect, it } from "vitest";

import { strings } from "@/strings";
import { latestEvent, overviewAnswer } from "@/test/fixtures";

import type { EventType, SeriesDay } from "../overview-api";
import {
  CHART_LINES,
  chartSummary,
  eventText,
  hasActivity,
  investorLabel,
  kpiCards,
  toChartRows,
} from "../overview-model";

const copy = strings.admin.overview;

const SERIES: readonly SeriesDay[] = Object.freeze([
  Object.freeze({ date: "2026-10-25", signups: 0, activeInvestors: 0 }),
  Object.freeze({ date: "2026-10-26", signups: 2, activeInvestors: 1 }),
  Object.freeze({ date: "2026-11-02", signups: 1, activeInvestors: 3 }),
]);

describe("toChartRows", () => {
  it("keeps the server's order and counts, and labels each UTC day", () => {
    expect(toChartRows(SERIES)).toEqual([
      { date: "2026-10-25", label: "25 Oct", signups: 0, activeInvestors: 0 },
      { date: "2026-10-26", label: "26 Oct", signups: 2, activeInvestors: 1 },
      { date: "2026-11-02", label: "2 Nov", signups: 1, activeInvestors: 3 },
    ]);
  });

  it("keeps zero-filled days as points, so the line runs through them", () => {
    const zeros = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      signups: 0,
      activeInvestors: 0,
    }));
    const rows = toChartRows(zeros);
    expect(rows).toHaveLength(30);
    expect(rows.every((row) => row.signups === 0 && row.activeInvestors === 0)).toBe(true);
    expect(rows[0]?.label).toBe("1 Oct");
    expect(rows[29]?.label).toBe("30 Oct");
  });

  it("returns new rows and leaves the series as it was", () => {
    const rows = toChartRows(SERIES);
    expect(rows[1]).not.toBe(SERIES[1]);
    expect(SERIES[1]).toEqual({ date: "2026-10-26", signups: 2, activeInvestors: 1 });
  });

  it("answers no rows for no days", () => {
    expect(toChartRows([])).toEqual([]);
  });
});

describe("the chart's lines", () => {
  it("draws one line per series key, coloured with the site's tokens, sign-ups dashed", () => {
    expect(CHART_LINES.map((line) => line.key)).toEqual(["activeInvestors", "signups"]);
    expect(CHART_LINES.every((line) => /^var\(--[a-z0-9-]+\)$/.test(line.color))).toBe(true);
    expect(CHART_LINES.find((line) => line.key === "signups")?.dash).toBeTruthy();
    expect(CHART_LINES.find((line) => line.key === "activeInvestors")?.dash).toBeUndefined();
  });
});

describe("hasActivity and chartSummary", () => {
  it("sees activity on any day with a sign-up or an active investor", () => {
    expect(hasActivity(SERIES)).toBe(true);
    expect(hasActivity([{ date: "2026-10-27", signups: 0, activeInvestors: 0 }])).toBe(false);
    expect(hasActivity([])).toBe(false);
  });

  it("totals the sign-ups and names the busiest day's active investors", () => {
    expect(chartSummary(SERIES)).toBe(copy.chart.summary(3, 3));
    expect(chartSummary([])).toBe(copy.chart.summary(0, 0));
  });
});

describe("kpiCards", () => {
  it("answers the four headline numbers in order, the total with its new investors", () => {
    const cards = kpiCards(
      overviewAnswer({ investorsTotal: 12, investorsNew7d: 4, activeInvestors7d: 7, deckOpens7d: 9, downloads7d: 2 }),
    );
    expect(cards.map((card) => [card.key, card.value])).toEqual([
      ["investors", 12],
      ["active", 7],
      ["deckOpens", 9],
      ["downloads", 2],
    ]);
    expect(cards[0]?.detail).toBe(copy.kpis.newInLastWeek(4));
  });
});

describe("investorLabel", () => {
  it("names the investor, or gives the email when there is no name", () => {
    expect(investorLabel(latestEvent())).toBe("Ada Example");
    expect(investorLabel(latestEvent({ investorName: null }))).toBe("ada@example.com");
  });
});

describe("eventText", () => {
  const cases: readonly [EventType, Parameters<typeof latestEvent>[0], string][] = [
    ["signed_in", { documentId: null, documentTitle: null }, "Signed in"],
    ["profile_completed", { documentId: null, documentTitle: null }, "Completed the profile"],
    ["document_open", {}, "Opened Example deck"],
    ["document_download", {}, "Downloaded Example deck"],
    ["page_view", { page: 4 }, "Read page 4 of Example deck"],
    ["page_view", { page: null }, "Read Example deck"],
    ["section_view", { documentId: null, documentTitle: null, data: { section: "team" } }, "Viewed the team section"],
    ["section_view", { documentId: null, documentTitle: null, data: null }, "Viewed a section"],
    ["video_progress", { data: { percent: 50 } }, "Watched 50% of Example deck"],
    ["video_progress", { data: { percent: "50" } }, "Watched Example deck"],
  ];

  it.each(cases)("words a %s event", (type, overrides, text) => {
    expect(eventText(latestEvent({ ...overrides, type }))).toBe(text);
  });

  it("names a deleted document as such", () => {
    expect(eventText(latestEvent({ type: "document_open", documentId: null, documentTitle: null }))).toBe(
      `Opened ${copy.latest.deletedDocument}`,
    );
  });
});
