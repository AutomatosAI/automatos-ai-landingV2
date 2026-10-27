import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { saveJson } from "@/admin/save-json";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import {
  ADMIN_ME,
  adminInvestor,
  documentSummary,
  investorList,
  investorRow,
  timelineAnswer,
  timelineEvent,
} from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

// jsdom cannot save files; the page's export hands its file to this.
vi.mock("@/admin/save-json", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/admin/save-json")>()),
  saveJson: vi.fn(),
}));

const admin = strings.admin;
const copy = admin.investor;
const ID = "00000000-0000-4000-8000-0000000000b2";
const BASE = `/admin/investors/${ID}`;
const BEN = adminInvestor({ id: ID, clerkUserId: "user_ben", name: "Ben Example", email: "ben@example.com" });
const NOTES = documentSummary({
  documentId: "00000000-0000-4000-8000-0000000000d2",
  title: "Example notes",
  kind: "doc",
  pageCount: null,
  opens: 0,
  furthestPage: 0,
  timeMs: 0,
  downloaded: true,
});

type Handler = (search: string, body: unknown) => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

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

const EVENTS = [
  timelineEvent({ id: 3 }),
  timelineEvent({ id: 2, type: "document_open", page: null, durationMs: null, createdAt: "2026-10-27T11:59:00.000Z" }),
  timelineEvent({
    id: 1,
    type: "signed_in",
    sessionId: null,
    documentId: null,
    documentTitle: null,
    documentVersion: null,
    page: null,
    durationMs: null,
    createdAt: "2026-10-27T11:58:00.000Z",
  }),
];

/** Ben's page: his row, two documents, three events; anything else is a 404. */
function benRoutes(extra: Readonly<Record<string, Handler>> = {}): Record<string, Handler> {
  return {
    [`GET ${BASE}`]: () => json(200, { investor: BEN, documents: [documentSummary(), NOTES] }),
    [`GET ${BASE}/events`]: () => json(200, timelineAnswer(EVENTS)),
    ...extra,
  };
}

const requests = (method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? "GET") === method && String(input).split("?")[0] === `/api/investors${path}`)
    .map(([input]) => String(input));

function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

const where = () => screen.getByTestId("where").textContent;

function renderAt(path = BASE) {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth: ADA },
  );
}

const heading = () => screen.findByRole("heading", { level: 1, name: "Ben Example" });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_admin");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.mocked(saveJson).mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("an investor's admin page", () => {
  it("shows the profile, marketing choice and dates, under the Investors nav link", async () => {
    serve(benRoutes());
    renderAt();
    await heading();
    const nav = screen.getByRole("navigation", { name: admin.navLabel });
    expect(within(nav).getByRole("link", { name: admin.nav.investors })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: copy.back })).toHaveAttribute("href", "/admin/investors");
    const profile = screen.getByRole("heading", { name: copy.profile.title }).closest("div")?.parentElement;
    if (!profile) throw new Error("expected the profile card");
    const terms = within(profile).getAllByRole("term").map((term) => term.textContent);
    const values = within(profile).getAllByRole("definition").map((value) => value.textContent);
    const fact = (label: string) => values[terms.indexOf(label)];
    expect(fact(copy.profile.email)).toBe("ben@example.com");
    expect(fact(copy.profile.investorType)).toBe("Venture capital");
    expect(fact(copy.profile.marketing)).toBe(copy.profile.marketingYes("20 Oct 2026"));
    expect(fact(copy.profile.signedUp)).toBe("20 Oct 2026");
    expect(fact(copy.profile.lastSeen)).toMatch(/^27 Oct, \d\d:\d\d$/);
    expect(within(profile).getByRole("link", { name: "https://www.linkedin.com/in/ada-example" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("sums up each document: opens, furthest page, time and download", async () => {
    serve(benRoutes());
    renderAt();
    const summary = await screen.findByRole("table", { name: copy.documents.tableLabel });
    const [, deck, notes] = within(summary).getAllByRole("row");
    if (!deck || !notes) throw new Error("expected two document rows");
    expect(within(deck).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Example deckPDF",
      "2",
      "9/12",
      "3 min 20 s",
      copy.documents.yes,
    ]);
    expect(within(notes).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Example notesDocument",
      "0",
      "0",
      "0 s",
      copy.documents.yes,
    ]);
  });

  it("lists the timeline newest first, each event opening to its details", async () => {
    serve(benRoutes());
    renderAt();
    const timeline = await screen.findByRole("list", { name: copy.timeline.label });
    const rows = within(timeline).getAllByRole("listitem");
    expect(rows.map((row) => within(row).getByRole("button").textContent?.replace(/\d\d:\d\d$/, ""))).toEqual([
      "Read page 4 of Example deck27 Oct, ",
      "Opened Example deck27 Oct, ",
      "Signed in27 Oct, ",
    ]);
    const first = within(timeline).getByRole("button", { name: copy.timeline.showDetails("Read page 4 of Example deck") });
    expect(first).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    const details = document.getElementById(first.getAttribute("aria-controls") ?? "");
    expect(details).toHaveTextContent(`${copy.timeline.fields.duration}20 s`);
    expect(details).toHaveTextContent(`${copy.timeline.fields.page}4`);
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: admin.pager.label })).not.toBeInTheDocument();
  });

  it("pages the timeline, keeping the page in the URL", async () => {
    serve(
      benRoutes({
        [`GET ${BASE}/events`]: (search) => {
          const page = search === "?page=2" ? 2 : 1;
          const events = page === 1 ? EVENTS : [timelineEvent({ id: 9, type: "document_download", page: null })];
          return json(200, timelineAnswer(events, { total: 51, page }));
        },
      }),
    );
    renderAt();
    await screen.findByRole("list", { name: copy.timeline.label });
    fireEvent.click(screen.getByRole("button", { name: admin.pager.next }));
    await waitFor(() => expect(where()).toBe(`${BASE}?page=2`));
    expect(await screen.findByRole("button", { name: copy.timeline.showDetails("Downloaded Example deck") })).toBeInTheDocument();
    expect(requests("GET", `${BASE}/events`)).toEqual([
      `/api/investors${BASE}/events?page=1`,
      `/api/investors${BASE}/events?page=2`,
    ]);
    expect(requests("GET", BASE)).toHaveLength(1);
  });

  it("exports the investor's data as a JSON file", async () => {
    const answer = { exportedAt: "2026-10-27T12:00:00.000Z", investor: BEN, sessions: [], events: [{ id: 1, extra: "kept" }] };
    serve(benRoutes({ [`GET ${BASE}/export`]: () => json(200, answer) }));
    renderAt();
    await heading();
    fireEvent.click(screen.getByRole("button", { name: copy.export.button }));
    await waitFor(() => expect(saveJson).toHaveBeenCalledWith(`investor-${ID}.json`, answer));
  });

  it("says so when the export fails", async () => {
    serve(benRoutes({ [`GET ${BASE}/export`]: () => json(500, { error: "internal_error" }) }));
    renderAt();
    await heading();
    fireEvent.click(screen.getByRole("button", { name: copy.export.button }));
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.export.failed);
    expect(saveJson).not.toHaveBeenCalled();
  });

  it("deletes only after the email is typed, explaining the Clerk account stays, then returns to the list", async () => {
    let deleted = false;
    serve(
      benRoutes({
        [`DELETE ${BASE}`]: () => {
          deleted = true;
          return new Response(null, { status: 204 });
        },
        "GET /admin/investors": () => json(200, investorList(deleted ? [] : [investorRow({ id: ID })])),
      }),
    );
    renderAt();
    await heading();
    fireEvent.click(screen.getByRole("button", { name: copy.delete.button }));
    const dialog = await screen.findByRole("alertdialog", { name: copy.delete.title });
    expect(dialog).toHaveTextContent(copy.delete.clerk);
    const confirm = within(dialog).getByRole("button", { name: copy.delete.confirm });
    const email = within(dialog).getByLabelText(copy.delete.confirmLabel("ben@example.com"));
    expect(confirm).toBeDisabled();
    fireEvent.change(email, { target: { value: "ben@example" } });
    expect(confirm).toBeDisabled();
    fireEvent.change(email, { target: { value: " Ben@Example.com " } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(where()).toBe("/admin/investors"));
    expect(requests("DELETE", BASE)).toHaveLength(1);
    expect(await screen.findByText(admin.investors.empty)).toBeInTheDocument();
    // The deleted investor's page is not asked for again on the way out.
    expect(requests("GET", BASE)).toHaveLength(1);
  });

  it("keeps the dialog open with a message when the delete fails", async () => {
    serve(benRoutes({ [`DELETE ${BASE}`]: () => json(500, { error: "internal_error" }) }));
    renderAt();
    await heading();
    fireEvent.click(screen.getByRole("button", { name: copy.delete.button }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "ben@example.com" } });
    fireEvent.click(within(dialog).getByRole("button", { name: copy.delete.confirm }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(copy.delete.failed);
    expect(where()).toBe(BASE);
  });

  it("blocks from the page after confirming, and shows the tag", async () => {
    let blocked = false;
    serve(
      benRoutes({
        [`GET ${BASE}`]: () => json(200, { investor: { ...BEN, blocked }, documents: [] }),
        [`PATCH ${BASE}`]: () => {
          blocked = true;
          return json(200, { investor: { ...BEN, blocked: true } });
        },
      }),
    );
    renderAt();
    await heading();
    expect(screen.getByText(copy.documents.empty)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: admin.investors.block }));
    const dialog = await screen.findByRole("alertdialog", { name: admin.block.blockTitle("Ben Example") });
    fireEvent.click(within(dialog).getByRole("button", { name: admin.block.block }));
    expect(await screen.findByRole("button", { name: admin.investors.unblock })).toBeInTheDocument();
    expect(screen.getByText(copy.blocked)).toBeInTheDocument();
  });

  it("says the investor is not found for an unknown id", async () => {
    serve({});
    renderAt();
    expect(await screen.findByRole("heading", { level: 1, name: copy.missing.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.back })).toBeInTheDocument();
  });

  it("says so when there are no events yet", async () => {
    serve(benRoutes({ [`GET ${BASE}/events`]: () => json(200, timelineAnswer([])) }));
    renderAt();
    expect(await screen.findByText(copy.timeline.empty)).toBeInTheDocument();
  });
});
