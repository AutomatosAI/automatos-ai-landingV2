import { formatDay } from "@/lib/format";
import { strings } from "@/strings";

import type { LatestEvent, Overview, SeriesDay } from "./overview-api";

/**
 * What the overview screen shows, worked out from GET /admin/overview: the
 * chart's rows and lines, the KPI cards and each latest event's words. Pure
 * functions, so the components stay thin (KP15).
 */

const copy = strings.admin.overview;

/** One point per day on the chart; label is the x-axis tick ("27 Oct"). */
export interface ChartRow {
  readonly date: string;
  readonly label: string;
  readonly signups: number;
  readonly activeInvestors: number;
}

export type ChartKey = "signups" | "activeInvestors";

export interface ChartLine {
  readonly key: ChartKey;
  readonly label: string;
  /** A site token (KP13), so the line follows the mood. */
  readonly color: string;
  /** Dashed lines tell the series apart without colour. */
  readonly dash?: string;
}

export const CHART_LINES: readonly ChartLine[] = Object.freeze([
  { key: "activeInvestors", label: copy.chart.activeInvestors, color: "var(--accent)" },
  { key: "signups", label: copy.chart.signups, color: "var(--fg-2)", dash: "4 3" },
]);

/** The server's series (oldest first, zero-filled) as chart rows, in the same order. */
export function toChartRows(series: readonly SeriesDay[]): readonly ChartRow[] {
  return series.map((day) => ({
    date: day.date,
    label: formatDay(day.date),
    signups: day.signups,
    activeInvestors: day.activeInvestors,
  }));
}

export function hasActivity(series: readonly SeriesDay[]): boolean {
  return series.some((day) => day.signups > 0 || day.activeInvestors > 0);
}

/** The chart in words, for screen readers. */
export function chartSummary(series: readonly SeriesDay[]): string {
  const signups = series.reduce((sum, day) => sum + day.signups, 0);
  const peak = series.reduce((most, day) => Math.max(most, day.activeInvestors), 0);
  return copy.chart.summary(signups, peak);
}

export type KpiKey = "investors" | "active" | "deckOpens" | "downloads";

export interface KpiCard {
  readonly key: KpiKey;
  readonly label: string;
  readonly value: number;
  readonly detail: string;
}

export function kpiCards(overview: Overview): readonly KpiCard[] {
  const kpis = copy.kpis;
  return [
    {
      key: "investors",
      label: kpis.investors,
      value: overview.investorsTotal,
      detail: kpis.newInLastWeek(overview.investorsNew7d),
    },
    { key: "active", label: kpis.active, value: overview.activeInvestors7d, detail: kpis.lastWeek },
    { key: "deckOpens", label: kpis.deckOpens, value: overview.deckOpens7d, detail: kpis.deckOpensHint },
    { key: "downloads", label: kpis.downloads, value: overview.downloads7d, detail: kpis.lastWeek },
  ];
}

/** Who did it: the name, else the email (a Clerk account may have no name). */
export function investorLabel(event: LatestEvent): string {
  return event.investorName ?? event.investorEmail;
}

function dataNumber(data: LatestEvent["data"], key: string): number | null {
  const value = data?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dataText(data: LatestEvent["data"], key: string): string | null {
  const value = data?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

/** What happened, in words: "Read page 4 of Example deck". */
export function eventText(event: LatestEvent): string {
  const words = copy.latest.events;
  const title = event.documentTitle ?? copy.latest.deletedDocument;
  switch (event.type) {
    case "signed_in":
      return words.signed_in();
    case "profile_completed":
      return words.profile_completed();
    case "document_open":
      return words.document_open(title);
    case "document_download":
      return words.document_download(title);
    case "page_view":
      return words.page_view(title, event.page);
    case "section_view":
      return words.section_view(dataText(event.data, "section"));
    case "video_progress":
      return words.video_progress(title, dataNumber(event.data, "percent"));
  }
}
