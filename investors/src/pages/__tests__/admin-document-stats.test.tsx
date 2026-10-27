import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { BEN_ID, documentStats, reader, videoStats } from "@/admin/__tests__/document-stats-fixtures";
import type { DocumentStats } from "@/admin/document-stats-api";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { ADMIN_ME, adminDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

const admin = strings.admin;
const copy = admin.stats;
const DECK_ID = "00000000-0000-4000-8000-0000000000d1";
const STATS_PATH = `/admin/documents/${DECK_ID}/stats`;
const API_STATS = `/api/investors${STATS_PATH}`;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

type Answer = (search: string) => Response;

/** Answers /me as an admin, the tracker's session, the documents list, and the stats from `answer` (given the ?query). */
function serve(answer: Answer) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input), "https://automatos.test");
    const path = url.pathname.replace("/api/investors", "");
    if (path === "/me") return json(200, ADMIN_ME);
    if (path === "/sessions") return json(201, { sessionId: "00000000-0000-4000-8000-00000000005e" });
    if (path === "/admin/documents") return json(200, { documents: [adminDocument({ version: 2, pageCount: 5 })] });
    if (path === STATS_PATH) return answer(url.search);
    return json(404, { error: "not_found" });
  });
}

/** The current version without ?version, else the one asked for. */
const byVersion = (answers: Readonly<Record<string, DocumentStats>>) => (search: string) => {
  const stats = answers[search];
  return stats ? json(200, stats) : json(404, { error: "not_found" });
};

const statsCalls = () =>
  fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.startsWith(API_STATS));

function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
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

const renderAt = (path: string) =>
  renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth: ADA },
  );

const current = documentStats();
const older = documentStats({
  version: 1,
  uniqueReaders: 1,
  opens: 1,
  downloads: 0,
  avgTimeMs: 10_000,
  readers: [reader({ investorId: BEN_ID, name: "Ben Sample", firm: null, furthestPage: 5, downloaded: false })],
});

describe("the document stats screen", () => {
  it("opens from the documents table's Stats action, under Documents in the admin nav", async () => {
    serve(byVersion({ "": current }));
    renderAt("/admin/documents");
    const stats = await screen.findByRole("link", { name: admin.documents.actionLabel(admin.documents.actions.stats, "Example deck") });
    expect(stats).toHaveAttribute("href", STATS_PATH);
    fireEvent.click(stats);
    expect(await screen.findByRole("heading", { level: 1, name: "Example deck" })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(STATS_PATH);
    const nav = screen.getByRole("navigation", { name: admin.navLabel });
    expect(within(nav).getByRole("link", { name: admin.nav.documents })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: copy.back })).toHaveAttribute("href", "/admin/documents");
  });

  it("shows the current version's numbers, both charts in words and the readers", async () => {
    serve(byVersion({ "": current }));
    renderAt(STATS_PATH);
    const cards = await screen.findByRole("list", { name: copy.kpis.label });
    expect(within(cards).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      `${copy.kpis.readers}4${copy.kpis.readersDetail}`,
      `${copy.kpis.opens}6${copy.kpis.opensDetail}`,
      `${copy.kpis.downloads}2${copy.kpis.downloadsDetail}`,
      `${copy.kpis.avgTime}3 min 20 s${copy.kpis.avgTimeDetail}`,
    ]);
    expect(screen.getByText("PDF · 5 pages")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: copy.dwell.title })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: copy.dwell.summary(5, { page: 2, time: "40 s" }) })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: copy.reach.title })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /The largest drop is after page 2, from 75% to 50%/ })).toBeInTheDocument();
    expect(screen.queryByText(copy.version.older)).not.toBeInTheDocument();
  });

  it("lists the readers in the server's order, each linking to the investor", async () => {
    serve(byVersion({ "": current }));
    renderAt(STATS_PATH);
    const table = await screen.findByRole("table", { name: copy.readers.tableLabel });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual([
      "Ada ExampleExample Ventures",
      "Ben Sample",
      "Cy PlaceholderPlaceholder Fund",
      copy.readers.unnamed,
    ]);
    expect(within(table).getByRole("link", { name: "Ben Sample" })).toHaveAttribute("href", `/admin/investors/${BEN_ID}`);
    const [ada, , , dee] = rows;
    if (!ada || !dee) throw new Error("expected four reader rows");
    expect(within(ada).getAllByRole("cell").map((cell) => cell.textContent).slice(1, 4)).toEqual(["3/5", "1 min 5 s", "Yes"]);
    expect(within(dee).getAllByRole("cell").map((cell) => cell.textContent).slice(1)).toEqual(["0/5", "0 s", "Yes", "—"]);
  });

  it("switches version from the picker, keeping it in the address", async () => {
    serve(byVersion({ "": current, "?version=1": older }));
    renderAt(STATS_PATH);
    const picker = await screen.findByLabelText(copy.version.label);
    expect(within(picker).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Version 2 (current)",
      "Version 1",
    ]);
    fireEvent.change(picker, { target: { value: "1" } });
    expect(await screen.findByText(copy.version.older)).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(`${STATS_PATH}?version=1`);
    expect(screen.getByLabelText(copy.version.label)).toHaveValue("1");
    const cards = screen.getByRole("list", { name: copy.kpis.label });
    expect(within(cards).getAllByRole("listitem")[0]).toHaveTextContent(`${copy.kpis.readers}1`);
    fireEvent.change(screen.getByLabelText(copy.version.label), { target: { value: "2" } });
    await waitFor(() => expect(screen.queryByText(copy.version.older)).not.toBeInTheDocument());
    expect(screen.getByTestId("where").textContent).toBe(STATS_PATH);
    expect(statsCalls()).toContain(`${API_STATS}?version=1`);
  });

  it("asks for the version the address names", async () => {
    serve(byVersion({ "?version=1": older }));
    renderAt(`${STATS_PATH}?version=1`);
    expect(await screen.findByText(copy.version.older)).toBeInTheDocument();
    expect(statsCalls()).toEqual([`${API_STATS}?version=1`]);
  });

  it("explains the missing charts for a document that is not a PDF, and still lists its readers", async () => {
    serve(byVersion({ "": videoStats() }));
    renderAt(STATS_PATH);
    expect(await screen.findByText(copy.pages.notPdf)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: copy.dwell.title })).not.toBeInTheDocument();
    expect(screen.getByText("Video")).toBeInTheDocument();
    const cards = screen.getByRole("list", { name: copy.kpis.label });
    expect(within(cards).getAllByRole("listitem")[3]).toHaveTextContent(`${copy.kpis.avgTime}—${copy.kpis.notPagedDetail}`);
    const table = screen.getByRole("table", { name: copy.readers.tableLabel });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
  });

  it("says so when nobody has read the version yet", async () => {
    serve(byVersion({ "": documentStats({ uniqueReaders: 0, opens: 0, downloads: 0, avgTimeMs: 0, versions: [], readers: [] }) }));
    renderAt(STATS_PATH);
    expect(await screen.findByText(copy.pages.noReaders)).toBeInTheDocument();
    expect(screen.getByText(copy.readers.empty)).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: copy.readers.tableLabel })).not.toBeInTheDocument();
  });

  it("says the document is gone when the server does not know it", async () => {
    serve(() => json(404, { error: "not_found" }));
    renderAt(STATS_PATH);
    expect(await screen.findByRole("heading", { level: 1, name: copy.missing.title })).toBeInTheDocument();
  });

  it("shows a plain message when the stats cannot be read, and tries again", async () => {
    let served = 0;
    serve(() => {
      served += 1;
      return served === 1 ? json(500, { error: "internal_error" }) : json(200, current);
    });
    renderAt(STATS_PATH);
    expect(await screen.findByRole("alert")).toHaveTextContent(strings.status.error.body);
    fireEvent.click(screen.getByRole("button", { name: strings.status.error.retry }));
    expect(await screen.findByRole("list", { name: copy.kpis.label })).toBeInTheDocument();
    expect(statsCalls()).toHaveLength(2);
  });
});
