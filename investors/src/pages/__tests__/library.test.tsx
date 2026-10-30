import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { FOUNDER } from "@/company/company-data";
import type { InvestorDocument } from "@/documents/documents-api";
import { navigateTo } from "@/documents/navigate";
import { setTokenSource } from "@/auth/token";
import { DOCUMENTS_PATH } from "@/lib/paths";
import { strings } from "@/strings";
import { ADA_ME, investorDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

// jsdom does not navigate: the storage link lands here instead.
vi.mock("@/documents/navigate", () => ({ navigateTo: vi.fn() }));

const copy = strings.library;
const DECK = investorDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck", category: "Pitch" });
const MODEL = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d2",
  title: "Example model",
  description: "Revenue and costs by quarter.",
  category: "Business model",
  kind: "spreadsheet",
  fileName: "example-model.xlsx",
  sizeBytes: 20_480,
});
const ONE_PAGER = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d3",
  title: "One-pager",
  description: null,
  category: "Pitch",
});
const SIGNED = "https://storage.example.com/signed-get";

type Handler = (body: unknown) => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const listOf = (documents: readonly InvestorDocument[]) => () => json(200, { documents });

/** Answers /me with Ada and "METHOD /path" with its handler; anything else is a 404 the test would notice. */
function serve(routes: Readonly<Record<string, Handler>>) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input).replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, ADA_ME);
    const handler = routes[`${method} ${path}`];
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    return handler ? handler(body) : json(404, { error: "not_found" });
  });
}

const calls = (method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? "GET") === method && String(input) === `/api/investors${path}`)
    .map(([, init]) => (typeof init?.body === "string" ? JSON.parse(init.body) : undefined));

const linkPath = (document: InvestorDocument) => `/documents/${document.id}/link`;

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderPage(path = "/") {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth: ADA },
  );
}

const card = (title: string) => {
  const heading = screen.getByRole("heading", { level: 3, name: title });
  const item = heading.closest("li");
  if (!item) throw new Error(`no card for ${title}`);
  return within(item);
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_ada");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.mocked(navigateTo).mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("the home page", () => {
  it("shows the intro, then the documents under their categories in the admin's order", async () => {
    serve({ "GET /documents": listOf([DECK, MODEL, ONE_PAGER]) });
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: strings.home.title })).toBeInTheDocument();
    expect(screen.getByText(strings.home.intro)).toBeInTheDocument();
    await screen.findByRole("heading", { level: 3, name: DECK.title });
    // Under the header, Quick access and the product links (PRD-003 §3.2), the first 'Pitch' PDF heads the
    // library as the deck (W3-03, pitch-feature.test.tsx); the one-pager stays under Pitch.
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      strings.company.name,
      FOUNDER.name,
      strings.company.quickAccess.heading,
      strings.company.seeItWorking,
      strings.company.alsoFromAutomatos,
      strings.home.pitchTitle,
      "Pitch",
      "Business model",
    ]);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Example deck",
      "One-pager",
      "Example model",
    ]);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows each card's description, kind, size and updated date, with Open and Download", async () => {
    serve({ "GET /documents": listOf([DECK, MODEL]) });
    renderPage();
    await screen.findByRole("heading", { level: 3, name: MODEL.title });
    const model = card(MODEL.title);
    expect(model.getByText("Revenue and costs by quarter.")).toBeInTheDocument();
    expect(model.getByText("Spreadsheet · 20 KB · Updated 21 Oct 2026")).toBeInTheDocument();
    expect(model.getByRole("button", { name: copy.actionLabel(copy.open, MODEL.title) })).toBeEnabled();
    expect(model.getByRole("button", { name: copy.actionLabel(copy.download, MODEL.title) })).toBeEnabled();
    expect(card(DECK.title).getByText("PDF · 1.5 MB · Updated 21 Oct 2026")).toBeInTheDocument();
  });

  it("says documents are on their way, with the contact email, when nothing is published", async () => {
    serve({ "GET /documents": listOf([]) });
    renderPage();
    const empty = await screen.findByRole("status");
    expect(empty).toHaveTextContent(copy.empty.title);
    expect(within(empty).getByRole("link", { name: strings.contact.helloEmail })).toHaveAttribute(
      "href",
      `mailto:${strings.contact.helloEmail}`,
    );
  });

  it("holds the cards' shape while the list loads", async () => {
    // /me answers; the list never does.
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith("/me") ? json(200, ADA_ME) : new Promise<Response>(() => {}),
    );
    const { container } = renderPage();
    await screen.findByRole("heading", { level: 1, name: strings.home.title });
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it.each([
    // Storage down keeps the page up (storage-outage.test.tsx); the portal itself down still takes it over.
    [503, { error: "portal_unavailable" }, strings.status.unavailable.title],
    [403, { error: "blocked" }, strings.status.blocked.title],
    [500, { error: "internal_error" }, strings.status.error.title],
  ])("maps a %i from the list to its screen", async (status, body, title) => {
    serve({ "GET /documents": () => json(status, body) });
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });
});

// On the home page a lone 'Pitch' PDF is the pitch block's deck (W3-03, pitch-feature.test.tsx), not a card:
// the deck's card is read on the Documents page, where every document is one.
describe("opening and downloading", () => {
  it("downloads: asks for a download link, then goes to it", async () => {
    serve({
      "GET /documents": listOf([DECK]),
      [`POST ${linkPath(DECK)}`]: () => json(200, { url: SIGNED, expiresIn: 300 }),
    });
    renderPage(DOCUMENTS_PATH);
    fireEvent.click(await screen.findByRole("button", { name: copy.actionLabel(copy.download, DECK.title) }));
    await waitFor(() => expect(navigateTo).toHaveBeenCalledWith(SIGNED));
    expect(calls("POST", linkPath(DECK))).toEqual([{ mode: "download" }]);
  });

  it("opens a PDF in the viewer's page, where only the viewer asks for a link (inline, once)", async () => {
    serve({ "GET /documents": listOf([DECK]) });
    renderPage(DOCUMENTS_PATH);
    const open = await screen.findByRole("link", { name: copy.actionLabel(copy.open, DECK.title) });
    expect(open).toHaveAttribute("href", `/documents/${DECK.id}`);
    expect(calls("POST", linkPath(DECK))).toEqual([]);
    fireEvent.click(open);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`/documents/${DECK.id}`));
    await waitFor(() => expect(calls("POST", linkPath(DECK))).toEqual([{ mode: "inline" }]));
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("downloads any other kind on Open", async () => {
    serve({
      "GET /documents": listOf([MODEL]),
      [`POST ${linkPath(MODEL)}`]: () => json(200, { url: SIGNED, expiresIn: 300 }),
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: copy.actionLabel(copy.open, MODEL.title) }));
    await waitFor(() => expect(navigateTo).toHaveBeenCalledWith(SIGNED));
    expect(calls("POST", linkPath(MODEL))).toEqual([{ mode: "download" }]);
  });

  it("says so under the card when too many links were asked for", async () => {
    serve({
      "GET /documents": listOf([DECK]),
      [`POST ${linkPath(DECK)}`]: () => json(429, { error: "rate_limited" }),
    });
    renderPage(DOCUMENTS_PATH);
    fireEvent.click(await screen.findByRole("button", { name: copy.actionLabel(copy.download, DECK.title) }));
    expect(await card(DECK.title).findByRole("alert")).toHaveTextContent(copy.errors.rateLimited);
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("reads the list again when the document has gone", async () => {
    const unpublished = () => calls("POST", linkPath(MODEL)).length > 0;
    serve({
      "GET /documents": () => json(200, { documents: unpublished() ? [DECK] : [DECK, MODEL] }),
      [`POST ${linkPath(MODEL)}`]: () => json(404, { error: "not_found" }),
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: copy.actionLabel(copy.download, MODEL.title) }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 3, name: MODEL.title })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 3, name: DECK.title })).toBeInTheDocument();
    expect(navigateTo).not.toHaveBeenCalled();
  });
});

describe("the Documents page", () => {
  const search = () => screen.getByRole("searchbox", { name: copy.search.label });
  const titles = () => screen.queryAllByRole("heading", { level: 3 }).map((h) => h.textContent);

  it("lists every document under a search box", async () => {
    serve({ "GET /documents": listOf([DECK, MODEL, ONE_PAGER]) });
    renderPage("/documents");
    expect(await screen.findByRole("heading", { level: 1, name: copy.title })).toBeInTheDocument();
    await screen.findByRole("heading", { level: 3, name: DECK.title });
    expect(search()).toHaveValue("");
    expect(titles()).toEqual(["Example deck", "One-pager", "Example model"]);
  });

  it("filters by title, description and category as the investor types", async () => {
    serve({ "GET /documents": listOf([DECK, MODEL, ONE_PAGER]) });
    renderPage("/documents");
    await screen.findByRole("heading", { level: 3, name: DECK.title });
    fireEvent.change(search(), { target: { value: "quarter" } });
    expect(titles()).toEqual(["Example model"]);
    expect(screen.getByText(copy.search.results(1))).toBeInTheDocument();
    fireEvent.change(search(), { target: { value: "PITCH" } });
    expect(titles()).toEqual(["Example deck", "One-pager"]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Pitch"]);
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/documents"))).toHaveLength(1);
  });

  it("says when nothing matches and clears the search", async () => {
    serve({ "GET /documents": listOf([DECK, MODEL]) });
    renderPage("/documents");
    await screen.findByRole("heading", { level: 3, name: DECK.title });
    fireEvent.change(search(), { target: { value: " roadmap " } });
    expect(screen.getByText(copy.search.noMatch("roadmap"))).toBeInTheDocument();
    expect(titles()).toEqual([]);
    fireEvent.click(screen.getAllByRole("button", { name: copy.search.clear })[0] as HTMLElement);
    expect(search()).toHaveValue("");
    expect(titles()).toEqual(["Example deck", "Example model"]);
  });

  it("shows the empty state, not the search, when nothing is published", async () => {
    serve({ "GET /documents": listOf([]) });
    renderPage("/documents");
    expect(await screen.findByRole("status")).toHaveTextContent(copy.empty.title);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
