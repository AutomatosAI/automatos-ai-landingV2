import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { setTokenSource } from "@/auth/token";
import { navigateTo } from "@/documents/navigate";
import { documentPath } from "@/lib/paths";
import { section } from "@/sections/__tests__/fixtures";
import { strings } from "@/strings";
import { ADA_ME, investorDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

import { ApiErrorPage } from "../ApiErrorPage";

// jsdom does not navigate: the storage link lands here instead.
vi.mock("@/documents/navigate", () => ({ navigateTo: vi.fn() }));

// pdf.js cannot run in jsdom: the viewer stands in, showing the link it was given.
vi.mock("@/viewer/PdfViewer", () => ({
  PdfViewer: ({ url }: { readonly url: string }) => <p data-testid="viewer-url">{url}</p>,
}));

const NOTE = strings.documents.unavailable;
const OUTAGE_TITLE = strings.status.unavailable.title;
const DECK = investorDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck", category: "Pitch" });
const LINK = `/documents/${DECK.id}/link`;
const SIGNED = "https://storage.example.com/signed-get";

type Handler = () => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const storageDown: Handler = () => json(503, { error: "storage_unavailable" });
const listOf = (...documents: ReturnType<typeof investorDocument>[]): Handler => () => json(200, { documents });

/** Answers each request with the next handler in line, the last one from then on. */
function inOrder(...handlers: readonly Handler[]): Handler {
  let next = 0;
  return () => {
    const handler = handlers[Math.min(next, handlers.length - 1)];
    next += 1;
    if (!handler) throw new Error("no handler");
    return handler();
  };
}

/** /me, the tracker's calls, the overview and "METHOD /path" from the table; anything else is a 404. */
function serve(routes: Readonly<Record<string, Handler>>) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input).replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, ADA_ME);
    if (path === "/sessions") return json(201, { sessionId: "00000000-0000-4000-8000-00000000005e" });
    if (path === "/events") return new Response(null, { status: 204 });
    if (path === "/sections") return json(200, { sections: [section("overview")] });
    const handler = routes[`${method} ${path}`];
    return handler ? handler() : json(404, { error: "not_found" });
  });
}

const calls = (method: string, path: string) =>
  fetchMock.mock.calls.filter(([input, init]) => (init?.method ?? "GET") === method && String(input) === `/api/investors${path}`);

const renderPage = (path: string) => renderWithProviders(<App />, { path, auth: ADA });

/** The inline note: its sentence inside a status region. */
async function findNote() {
  const sentence = await screen.findByText(NOTE);
  const note = sentence.closest('[role="status"]');
  if (!note) throw new Error("the note is not a status region");
  return note;
}

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

describe("the home page while document storage is down", () => {
  it("keeps the title, intro and overview, with a note where the documents would be", async () => {
    serve({ "GET /documents": storageDown });
    renderPage("/");
    expect(await screen.findByRole("heading", { level: 1, name: strings.home.title })).toBeInTheDocument();
    expect(screen.getByText(strings.home.intro)).toBeInTheDocument();
    const overview = await screen.findByRole("region", { name: "Overview" });
    const note = await findNote();
    expect(overview.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("heading", { name: OUTAGE_TITLE })).not.toBeInTheDocument();
    expect(screen.queryByText(strings.status.unavailable.body)).not.toBeInTheDocument();
  });

  it("reads the list again on Retry and shows the documents once storage is back", async () => {
    serve({ "GET /documents": inOrder(storageDown, listOf(DECK)) });
    renderPage("/");
    await findNote();
    expect(calls("GET", "/documents")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: strings.status.error.retry }));
    expect(await screen.findByRole("heading", { level: 3, name: DECK.title })).toBeInTheDocument();
    expect(calls("GET", "/documents")).toHaveLength(2);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it("still shows the full-page screen when the portal itself is unavailable", async () => {
    serve({ "GET /documents": () => json(503, { error: "portal_unavailable" }) });
    renderPage("/");
    expect(await screen.findByRole("heading", { level: 1, name: OUTAGE_TITLE })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: strings.home.title })).not.toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });
});

describe("the Documents page while document storage is down", () => {
  it("keeps its title and intro, with the note and Retry in place of the list and search", async () => {
    serve({ "GET /documents": inOrder(storageDown, listOf(DECK)) });
    renderPage("/documents");
    expect(await screen.findByRole("heading", { level: 1, name: strings.library.title })).toBeInTheDocument();
    expect(screen.getByText(strings.library.intro)).toBeInTheDocument();
    await findNote();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: OUTAGE_TITLE })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: strings.status.error.retry }));
    expect(await screen.findByRole("heading", { level: 3, name: DECK.title })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });
});

describe("the viewer while document storage is down", () => {
  const copy = strings.viewer;

  it("shows its own error under the Back link when the list cannot be read, and asks for no link", async () => {
    serve({ "GET /documents": inOrder(storageDown, listOf(DECK)), [`POST ${LINK}`]: () => json(200, { url: SIGNED, expiresIn: 300 }) });
    renderPage(documentPath(DECK.id));
    expect(await screen.findByRole("alert")).toHaveTextContent(NOTE);
    expect(screen.getByRole("link", { name: copy.back })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: OUTAGE_TITLE })).not.toBeInTheDocument();
    expect(calls("POST", LINK)).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(await screen.findByTestId("viewer-url")).toHaveTextContent(SIGNED);
    expect(calls("GET", "/documents")).toHaveLength(2);
  });

  it("shows its own error, without a Download that could not work, when the link answers storage_unavailable", async () => {
    const signed: Handler = () => json(200, { url: SIGNED, expiresIn: 300 });
    serve({ "GET /documents": listOf(DECK), [`POST ${LINK}`]: inOrder(storageDown, signed) });
    renderPage(documentPath(DECK.id));
    expect(await screen.findByRole("alert")).toHaveTextContent(NOTE);
    expect(screen.getByRole("heading", { level: 1, name: DECK.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.back })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: OUTAGE_TITLE })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(await screen.findByTestId("viewer-url")).toHaveTextContent(SIGNED);
    expect(calls("POST", LINK)).toHaveLength(2);
  });
});

describe("the full-page fallback for any other page", () => {
  it("names storage being down and offers Retry", () => {
    const onRetry = vi.fn();
    renderWithProviders(<ApiErrorPage screen="storage_unavailable" onRetry={onRetry} />);
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: strings.status.error.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
