import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import type { InvestorList } from "@/admin/investors-api";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { ADMIN_ME, adminInvestor, investorList, investorRow } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

const admin = strings.admin;
const copy = admin.investors;
const columns = copy.columns;

const BEN = investorRow({
  id: "00000000-0000-4000-8000-0000000000b2",
  name: null,
  email: "ben@example.com",
  firm: null,
  investorType: "angel",
  chequeSize: null,
  source: "intro",
  sessions: 0,
  totalMs: 0,
  docsOpened: 0,
  downloads: 0,
  deckProgress: null,
  blocked: true,
});
const ADA_ROW = investorRow();

type Handler = (search: string, body: unknown) => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** Answers /me as an admin, the tracker's session, and "METHOD /path" (query string apart) with its handler. */
function serve(routes: Readonly<Record<string, Handler>>) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), "https://automatos.app");
    const path = url.pathname.replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, ADMIN_ME);
    if (path === "/sessions") return json(201, { sessionId: "00000000-0000-4000-8000-00000000005e" });
    const handler = routes[`${method} ${path}`];
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    return handler ? handler(url.search, body) : json(404, { error: "not_found" });
  });
}

const answering = (list: InvestorList) => () => json(200, list);

/** The query strings of every list request, in order. */
const listSearches = () =>
  fetchMock.mock.calls
    .map(([input]) => new URL(String(input), "https://automatos.app"))
    .filter((url) => url.pathname === "/api/investors/admin/investors")
    .map((url) => url.search);

function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

const where = () => screen.getByTestId("where").textContent;

function renderAt(path = "/admin/investors") {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth: ADA },
  );
}

const table = () => screen.findByRole("table", { name: copy.tableLabel });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_admin");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("the admin investors table", () => {
  it("is in the admin nav, and lists each investor with the W1-15 columns", async () => {
    serve({ "GET /admin/investors": answering(investorList([ADA_ROW, BEN])) });
    renderAt();
    const grid = await table();
    const nav = screen.getByRole("navigation", { name: admin.navLabel });
    expect(within(nav).getByRole("link", { name: admin.nav.investors })).toHaveAttribute("aria-current", "page");
    expect(within(grid).getAllByRole("columnheader").map((head) => head.textContent)).toEqual([
      columns.investor,
      columns.firm,
      columns.type,
      columns.cheque,
      columns.source,
      columns.signedUp,
      columns.lastSeen,
      columns.sessions,
      columns.time,
      columns.docsOpened,
      columns.downloads,
      columns.deck,
      columns.access,
    ]);
    const [, ada, ben] = within(grid).getAllByRole("row");
    if (!ada || !ben) throw new Error("expected two investor rows");
    const cells = within(ada).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells.slice(0, 6)).toEqual([
      "Ada Exampleada@example.com",
      "Example Ventures",
      "Venture capital",
      "250k to 1M",
      "Web Summit",
      "20 Oct 2026",
    ]);
    expect(cells.slice(7, 12)).toEqual(["2", "3 min 20 s", "1", "1", "9/12"]);
    expect(within(ada).getByRole("link", { name: "Ada Example" })).toHaveAttribute("href", `/admin/investors/${ADA_ROW.id}`);
    expect(within(ben).getByRole("link", { name: "ben@example.com" })).toBeInTheDocument();
    expect(ben).toHaveTextContent(copy.blocked);
    expect(within(ben).getByRole("button", { name: copy.actionLabel(copy.unblock, "ben@example.com") })).toBeInTheDocument();
    expect(screen.getByText(copy.results(2))).toBeInTheDocument();
    expect(screen.getByRole("region", { name: copy.notes.label })).toBeInTheDocument();
  });

  it("sorts by a column on a click, flips it on a second, and keeps it in the URL", async () => {
    serve({ "GET /admin/investors": answering(investorList([ADA_ROW])) });
    renderAt();
    const grid = await table();
    const lastSeen = within(grid).getByRole("columnheader", { name: columns.lastSeen });
    expect(lastSeen).toHaveAttribute("aria-sort", "descending");
    fireEvent.click(within(grid).getByRole("button", { name: columns.investor }));
    await waitFor(() => expect(where()).toBe("/admin/investors?sort=name&dir=asc"));
    expect(within(grid).getByRole("columnheader", { name: columns.investor })).toHaveAttribute("aria-sort", "ascending");
    expect(lastSeen).toHaveAttribute("aria-sort", "none");
    fireEvent.click(within(grid).getByRole("button", { name: columns.investor }));
    await waitFor(() => expect(where()).toBe("/admin/investors?sort=name"));
    await waitFor(() => expect(listSearches()).toEqual(["", "?sort=name&dir=asc", "?sort=name"]));
    expect(within(grid).queryByRole("button", { name: columns.deck })).not.toBeInTheDocument();
  });

  it("reads the view from the URL on arrival", async () => {
    serve({ "GET /admin/investors": answering(investorList([BEN], { page: 2, total: 51 })) });
    renderAt("/admin/investors?source=intro&type=angel&page=2&sort=downloads");
    await table();
    expect(listSearches()).toEqual(["?type=angel&source=intro&sort=downloads&page=2"]);
    expect(screen.getByLabelText(copy.filters.type)).toHaveValue("angel");
    expect(screen.getByLabelText(copy.filters.source)).toHaveValue("intro");
  });

  it("searches 300 ms after the typing stops, and starts again from page 1", async () => {
    serve({ "GET /admin/investors": answering(investorList([ADA_ROW])) });
    renderAt("/admin/investors?page=2");
    await table();
    const search = screen.getByRole("searchbox", { name: copy.search.label });
    fireEvent.change(search, { target: { value: "ad" } });
    fireEvent.change(search, { target: { value: "ada 50%" } });
    expect(listSearches()).toEqual(["?page=2"]);
    await waitFor(() => expect(where()).toBe("/admin/investors?q=ada+50%25"));
    await waitFor(() => expect(listSearches()).toEqual(["?page=2", "?q=ada+50%25"]));
    expect(search).toHaveValue("ada 50%");
  });

  it("filters by type and source, and clears both with the search", async () => {
    serve({ "GET /admin/investors": answering(investorList([BEN])) });
    renderAt("/admin/investors?q=ben&sort=firm&dir=asc");
    await table();
    fireEvent.change(screen.getByLabelText(copy.filters.type), { target: { value: "angel" } });
    await waitFor(() => expect(where()).toBe("/admin/investors?q=ben&type=angel&sort=firm&dir=asc"));
    fireEvent.change(screen.getByLabelText(copy.filters.source), { target: { value: "intro" } });
    await waitFor(() => expect(where()).toBe("/admin/investors?q=ben&type=angel&source=intro&sort=firm&dir=asc"));
    fireEvent.click(screen.getByRole("button", { name: copy.filters.clear }));
    await waitFor(() => expect(where()).toBe("/admin/investors?sort=firm&dir=asc"));
    expect(screen.getByRole("searchbox", { name: copy.search.label })).toHaveValue("");
    expect(screen.getByLabelText(copy.filters.type)).toHaveValue("");
  });

  it("pages through the list", async () => {
    const page = (search: string) => {
      const n = new URLSearchParams(search).get("page") === "2" ? 2 : 1;
      return json(200, investorList([n === 1 ? ADA_ROW : BEN], { total: 51, page: n }));
    };
    serve({ "GET /admin/investors": page });
    renderAt();
    await table();
    const pager = screen.getByRole("navigation", { name: admin.pager.label });
    expect(pager).toHaveTextContent(`${admin.pager.pageOf(1, 2)} · ${admin.pager.range(1, 1, 51)}`);
    expect(within(pager).getByRole("button", { name: admin.pager.previous })).toBeDisabled();
    fireEvent.click(within(pager).getByRole("button", { name: admin.pager.next }));
    await waitFor(() => expect(where()).toBe("/admin/investors?page=2"));
    expect(await screen.findByRole("link", { name: "ben@example.com" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: admin.pager.label })).toHaveTextContent(admin.pager.range(51, 51, 51));
  });

  it("blocks an investor after confirming, then reads the list again", async () => {
    let blocked = false;
    const patches: unknown[] = [];
    serve({
      "GET /admin/investors": () => json(200, investorList([investorRow({ blocked })])),
      [`PATCH /admin/investors/${ADA_ROW.id}`]: (_search, body) => {
        patches.push(body);
        blocked = true;
        return json(200, { investor: adminInvestor({ blocked: true }) });
      },
    });
    renderAt();
    await table();
    fireEvent.click(screen.getByRole("button", { name: copy.actionLabel(copy.block, "Ada Example") }));
    const dialog = await screen.findByRole("alertdialog", { name: admin.block.blockTitle("Ada Example") });
    expect(dialog).toHaveTextContent(admin.block.blockBody);
    expect(patches).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: admin.block.block }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(patches).toEqual([{ blocked: true }]);
    expect(await screen.findByRole("button", { name: copy.actionLabel(copy.unblock, "Ada Example") })).toBeInTheDocument();
  });

  it("does nothing when the block is cancelled, and says why the server refused one", async () => {
    serve({
      "GET /admin/investors": answering(investorList([ADA_ROW])),
      [`PATCH /admin/investors/${ADA_ROW.id}`]: () => json(409, { error: "cannot_block_self" }),
    });
    renderAt();
    await table();
    const open = () => fireEvent.click(screen.getByRole("button", { name: copy.actionLabel(copy.block, "Ada Example") }));
    open();
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: admin.block.cancel }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    open();
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: admin.block.block }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(admin.block.self);
    const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
    expect(patches).toHaveLength(1);
  });

  it("says so when there are no investors, or none match", async () => {
    serve({ "GET /admin/investors": answering(investorList([])) });
    const { unmount } = renderAt();
    expect(await screen.findByText(copy.empty)).toBeInTheDocument();
    unmount();
    renderAt("/admin/investors?q=zed");
    expect(await screen.findByText(copy.noMatch)).toBeInTheDocument();
  });

  it("offers the first page when the URL points past the last one", async () => {
    serve({
      "GET /admin/investors": (search) =>
        json(200, investorList(search.includes("page=9") ? [] : [ADA_ROW], { total: 1, page: search.includes("page=9") ? 9 : 1 })),
    });
    renderAt("/admin/investors?page=9");
    fireEvent.click(await screen.findByRole("button", { name: copy.firstPage }));
    await waitFor(() => expect(where()).toBe("/admin/investors"));
    expect(await table()).toBeInTheDocument();
  });

  it("shows a plain message when the list cannot be read, and tries again", async () => {
    let calls = 0;
    serve({
      "GET /admin/investors": () => {
        calls += 1;
        return calls === 1 ? json(500, { error: "internal_error" }) : json(200, investorList([ADA_ROW]));
      },
    });
    renderAt();
    expect(await screen.findByRole("alert")).toHaveTextContent(strings.status.error.body);
    fireEvent.click(screen.getByRole("button", { name: strings.status.error.retry }));
    expect(await table()).toBeInTheDocument();
  });
});
