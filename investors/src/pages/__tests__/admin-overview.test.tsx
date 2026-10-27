import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import type { Overview } from "@/admin/overview-api";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { ADMIN_ME, latestEvent, overviewAnswer } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

const admin = strings.admin;
const copy = admin.overview;
const BEN_ID = "00000000-0000-4000-8000-0000000000b2";

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** Answers /me as an admin, the reading tracker's session, and the overview from `answers` in turn (the last repeats). */
function serve(answers: readonly (() => Response)[]) {
  let served = 0;
  fetchMock.mockImplementation(async (input) => {
    const path = String(input).replace("/api/investors", "");
    if (path === "/me") return json(200, ADMIN_ME);
    if (path === "/sessions") return json(201, { sessionId: "00000000-0000-4000-8000-00000000005e" });
    if (path !== "/admin/overview") return json(404, { error: "not_found" });
    const answer = answers[Math.min(served, answers.length - 1)];
    if (!answer) throw new Error("serve: give at least one overview answer");
    served += 1;
    return answer();
  });
}

const answering = (overview: Overview) => () => json(200, overview);

const overviewCalls = () => fetchMock.mock.calls.filter(([input]) => String(input) === "/api/investors/admin/overview");

/** A busy fortnight: sign-ups on two days, readers on three. */
function busyOverview(): Overview {
  const base = overviewAnswer();
  const series = base.series.map((day, i) =>
    i === 27 ? { ...day, signups: 2, activeInvestors: 3 } : i === 29 ? { ...day, signups: 1, activeInvestors: 2 } : day,
  );
  return overviewAnswer({
    investorsTotal: 14,
    investorsNew7d: 3,
    activeInvestors7d: 5,
    deckOpens7d: 8,
    downloads7d: 2,
    series,
    latestEvents: [
      latestEvent({ id: 3, type: "page_view", page: 4, createdAt: "2026-10-27T12:05:00.000Z" }),
      latestEvent({
        id: 2,
        type: "signed_in",
        documentId: null,
        documentTitle: null,
        investorId: BEN_ID,
        investorName: null,
        investorFirm: null,
        investorEmail: "ben@example.com",
        createdAt: "2026-10-27T11:00:00.000Z",
      }),
    ],
  });
}

/** ResponsiveContainer measures with a ResizeObserver, which jsdom lacks; nothing is resized in these tests. */
class SilentResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", SilentResizeObserver);
  setTokenSource(async () => "tok_admin");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

const renderAt = (path: string) => renderWithProviders(<App />, { path, auth: ADA });

describe("the admin overview", () => {
  it("is the admin area's first page, current in the admin nav", async () => {
    serve([answering(busyOverview())]);
    renderAt("/admin");
    expect(await screen.findByRole("heading", { level: 1, name: copy.title })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: admin.navLabel });
    expect(within(nav).getByRole("link", { name: admin.nav.overview })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: admin.nav.documents })).not.toHaveAttribute("aria-current");
  });

  it("shows the four headline numbers", async () => {
    serve([answering(busyOverview())]);
    renderAt("/admin");
    const cards = await screen.findByRole("list", { name: copy.kpis.label });
    const items = within(cards).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      `${copy.kpis.investors}14${copy.kpis.newInLastWeek(3)}`,
      `${copy.kpis.active}5${copy.kpis.lastWeek}`,
      `${copy.kpis.deckOpens}8${copy.kpis.deckOpensHint}`,
      `${copy.kpis.downloads}2${copy.kpis.lastWeek}`,
    ]);
  });

  it("draws the 30-day chart with its legend and says it in words", async () => {
    serve([answering(busyOverview())]);
    renderAt("/admin");
    expect(await screen.findByRole("img", { name: copy.chart.summary(3, 3) })).toBeInTheDocument();
    const legend = screen.getByRole("list", { name: copy.chart.legend });
    expect(within(legend).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      copy.chart.activeInvestors,
      copy.chart.signups,
    ]);
    expect(screen.queryByText(copy.chart.empty)).not.toBeInTheDocument();
  });

  it("lists the latest events newest first, each linking to its investor", async () => {
    serve([answering(busyOverview())]);
    renderAt("/admin");
    const list = await screen.findByRole("list", { name: copy.latest.title });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const [ada, ben] = rows;
    if (!ada || !ben) throw new Error("expected two event rows");
    expect(ada).toHaveTextContent("Ada Example · Example Ventures");
    expect(ada).toHaveTextContent("Read page 4 of Example deck");
    expect(within(ada).getByRole("link", { name: "Ada Example" })).toHaveAttribute(
      "href",
      `/admin/investors/${ADMIN_ME.investor.id}`,
    );
    expect(within(ben).getByRole("link", { name: "ben@example.com" })).toHaveAttribute("href", `/admin/investors/${BEN_ID}`);
    expect(ben).toHaveTextContent("Signed in");
  });

  it("says so when nothing has happened yet", async () => {
    serve([answering(overviewAnswer())]);
    renderAt("/admin");
    expect(await screen.findByText(copy.chart.empty)).toBeInTheDocument();
    expect(screen.getByText(copy.latest.empty)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Last 30 days/ })).not.toBeInTheDocument();
  });

  it("shows a plain message when the overview cannot be read, and tries again", async () => {
    serve([() => json(500, { error: "internal_error" }), answering(busyOverview())]);
    renderAt("/admin");
    expect(await screen.findByRole("alert")).toHaveTextContent(strings.status.error.body);
    fireEvent.click(screen.getByRole("button", { name: strings.status.error.retry }));
    expect(await screen.findByRole("list", { name: copy.kpis.label })).toBeInTheDocument();
    await waitFor(() => expect(overviewCalls()).toHaveLength(2));
  });
});
