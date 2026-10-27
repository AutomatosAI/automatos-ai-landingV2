import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { setTokenSource } from "@/auth/token";
import type { InvestorDocument } from "@/documents/documents-api";
import { navigateTo } from "@/documents/navigate";
import { documentPath } from "@/lib/paths";
import { strings } from "@/strings";
import { ADA_ME, investorDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

// jsdom does not navigate: the storage link lands here instead.
vi.mock("@/documents/navigate", () => ({ navigateTo: vi.fn() }));

interface StandInProps {
  readonly url: string;
  readonly onLoadError: (error: unknown) => void;
  readonly onPageVisible?: (page: number, ms: number) => void;
  readonly actions?: ReactNode;
}

// pdf.js cannot run in jsdom: the viewer stands in, showing the link it was
// given, its toolbar actions, buttons that fail the load the way pdf.js does,
// and one that reports page 2 read for 1.5 s, as the visibility model would.
vi.mock("@/viewer/PdfViewer", () => ({
  PdfViewer: ({ url, onLoadError, onPageVisible, actions }: StandInProps) => (
    <div>
      <p data-testid="viewer-url">{url}</p>
      {actions}
      <button type="button" onClick={() => onPageVisible?.(2, 1500)}>
        read-page-2
      </button>
      <button
        type="button"
        onClick={() => onLoadError(Object.assign(new Error("refused"), { name: "UnexpectedResponseException", status: 403 }))}
      >
        fail-expired
      </button>
      <button type="button" onClick={() => onLoadError(Object.assign(new Error("bad"), { name: "InvalidPDFException" }))}>
        fail-corrupt
      </button>
    </div>
  ),
}));

const copy = strings.viewer;
const DECK = investorDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck" });
const MODEL = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d2",
  title: "Example model",
  kind: "spreadsheet",
  fileName: "example-model.xlsx",
  pageCount: null,
});
const LINK = `/documents/${DECK.id}/link`;

type Handler = (body: unknown) => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const signed = (n: number) => json(200, { url: `https://storage.example.com/signed-get-${n}`, expiresIn: 300 });

/** Answers /me with Ada, /documents with the list, and "METHOD /path" with its handler. */
function serve(routes: Readonly<Record<string, Handler>>, documents: readonly InvestorDocument[] = [DECK, MODEL]) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input).replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, ADA_ME);
    if (method === "GET" && path === "/documents") return json(200, { documents });
    const handler = routes[`${method} ${path}`];
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    return handler ? handler(body) : json(404, { error: "not_found" });
  });
}

/** Answers each link request with the next handler in line. */
function inOrder(...handlers: readonly Handler[]): Handler {
  let next = 0;
  return (body) => {
    const handler = handlers[Math.min(next, handlers.length - 1)];
    next += 1;
    if (!handler) throw new Error("no handler");
    return handler(body);
  };
}

const calls = (method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? "GET") === method && String(input) === `/api/investors${path}`)
    .map(([, init]) => (typeof init?.body === "string" ? JSON.parse(init.body) : undefined));

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderViewer(document: InvestorDocument = DECK) {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path: documentPath(document.id), auth: ADA },
  );
}

const viewerUrl = () => screen.findByTestId("viewer-url");
const downloadButton = () => screen.getByRole("button", { name: strings.library.actionLabel(strings.library.download, DECK.title) });

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

describe("the viewer page", () => {
  it("asks for one inline link on open and reads it, under the title and a Back link", async () => {
    serve({ [`POST ${LINK}`]: () => signed(1) });
    renderViewer();
    expect(await viewerUrl()).toHaveTextContent("https://storage.example.com/signed-get-1");
    expect(screen.getByRole("heading", { level: 1, name: DECK.title })).toBeInTheDocument();
    expect(calls("POST", LINK)).toEqual([{ mode: "inline" }]);
    fireEvent.click(screen.getByRole("link", { name: copy.back }));
    expect(screen.getByTestId("where")).toHaveTextContent("/documents");
  });

  it("downloads from the toolbar with a download link", async () => {
    serve({ [`POST ${LINK}`]: (body) => ((body as { mode: string }).mode === "download" ? signed(9) : signed(1)) });
    renderViewer();
    await viewerUrl();
    fireEvent.click(downloadButton());
    await waitFor(() => expect(navigateTo).toHaveBeenCalledWith("https://storage.example.com/signed-get-9"));
    expect(calls("POST", LINK)).toEqual([{ mode: "inline" }, { mode: "download" }]);
  });

  it("asks for a new link once when storage refuses the first as expired", async () => {
    serve({ [`POST ${LINK}`]: inOrder(() => signed(1), () => signed(2)) });
    renderViewer();
    await viewerUrl();
    fireEvent.click(screen.getByRole("button", { name: "fail-expired" }));
    await waitFor(() => expect(screen.getByTestId("viewer-url")).toHaveTextContent("signed-get-2"));
    expect(calls("POST", LINK)).toEqual([{ mode: "inline" }, { mode: "inline" }]);
  });

  it("shows the error with a Download fallback when the renewed link is refused too", async () => {
    serve({ [`POST ${LINK}`]: inOrder(() => signed(1), () => signed(2), () => signed(3)) });
    renderViewer();
    await viewerUrl();
    fireEvent.click(screen.getByRole("button", { name: "fail-expired" }));
    await waitFor(() => expect(screen.getByTestId("viewer-url")).toHaveTextContent("signed-get-2"));
    fireEvent.click(screen.getByRole("button", { name: "fail-expired" }));
    expect(await screen.findByText(copy.failed.title)).toBeInTheDocument();
    expect(calls("POST", LINK)).toHaveLength(2);
    fireEvent.click(downloadButton());
    await waitFor(() => expect(navigateTo).toHaveBeenCalledWith("https://storage.example.com/signed-get-3"));
    expect(calls("POST", LINK).at(-1)).toEqual({ mode: "download" });
  });

  it("does not renew for a file pdf.js cannot read; Try again asks for a new link", async () => {
    serve({ [`POST ${LINK}`]: inOrder(() => signed(1), () => signed(2)) });
    renderViewer();
    await viewerUrl();
    fireEvent.click(screen.getByRole("button", { name: "fail-corrupt" }));
    expect(await screen.findByText(copy.failed.body)).toBeInTheDocument();
    expect(calls("POST", LINK)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    await waitFor(() => expect(screen.getByTestId("viewer-url")).toHaveTextContent("signed-get-2"));
  });

  it("says why when the link is refused, in plain words", async () => {
    serve({ [`POST ${LINK}`]: () => json(429, { error: "rate_limited" }) });
    renderViewer();
    expect(await screen.findByText(strings.library.errors.rateLimited)).toBeInTheDocument();
    expect(downloadButton()).toBeEnabled();
  });

  it("says the document went when the link answers 404, and reads the list again", async () => {
    serve({ [`POST ${LINK}`]: () => json(404, { error: "not_found" }) });
    renderViewer();
    expect(await screen.findByRole("heading", { level: 1, name: copy.missing.title })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await waitFor(() => expect(calls("GET", "/documents").length).toBeGreaterThanOrEqual(2));
  });

  it("asks for no link for a document that is not in the library", async () => {
    serve({ [`POST ${LINK}`]: () => signed(1) }, [MODEL]);
    renderViewer();
    expect(await screen.findByRole("heading", { level: 1, name: copy.missing.title })).toBeInTheDocument();
    expect(screen.getByText(copy.missing.body)).toBeInTheDocument();
    expect(calls("POST", LINK)).toEqual([]);
  });

  it("feeds each page read to the tracker as a page_view of this version, sent when the page goes", async () => {
    const sessionId = "00000000-0000-4000-8000-00000000005e";
    serve({ [`POST ${LINK}`]: () => signed(1), "POST /sessions": () => json(201, { sessionId }) });
    renderViewer();
    await viewerUrl();
    await waitFor(() => expect(calls("POST", "/sessions")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "read-page-2" }));
    window.dispatchEvent(new Event("pagehide"));
    await waitFor(() => expect(calls("POST", "/events")).toHaveLength(1));
    expect(calls("POST", "/events")[0]).toEqual({
      sessionId,
      events: [{ type: "page_view", documentId: DECK.id, documentVersion: DECK.version, page: 2, durationMs: 1500 }],
    });
  });

  it("offers a download, and no inline link, for a document that is not a PDF", async () => {
    serve({});
    renderViewer(MODEL);
    expect(await screen.findByText(copy.notViewable)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: MODEL.title })).toBeInTheDocument();
    expect(calls("POST", `/documents/${MODEL.id}/link`)).toEqual([]);
  });
});
