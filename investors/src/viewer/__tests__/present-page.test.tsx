import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { setTokenSource } from "@/auth/token";
import { navigateTo } from "@/documents/navigate";
import { strings } from "@/strings";
import { ADA_ME, investorDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

import { presentPath } from "../present-route";

// jsdom does not navigate: a download link lands here instead.
vi.mock("@/documents/navigate", () => ({ navigateTo: vi.fn() }));

interface StandInProps {
  readonly url: string;
  readonly present?: boolean;
  readonly onPresentExit?: () => void;
  readonly notice?: string | null;
  readonly actions?: ReactNode;
}

// pdf.js cannot run in jsdom: the viewer stands in, showing whether it was
// asked to present, the download's notice, and an Exit that ends present mode.
vi.mock("@/viewer/PdfViewer", () => ({
  PdfViewer: ({ url, present, onPresentExit, notice, actions }: StandInProps) => (
    <div>
      <p data-testid="viewer-url">{url}</p>
      <p data-testid="present">{present ? "presenting" : "reading"}</p>
      <p data-testid="notice">{notice ?? ""}</p>
      {actions}
      <button type="button" onClick={onPresentExit}>
        exit-present
      </button>
    </div>
  ),
}));

const DECK = investorDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck" });
const LINK = `/api/investors/documents/${DECK.id}/link`;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** /me is Ada, /documents is the deck; the inline link is granted, a download link answers `download`. */
function serve(download: () => Response) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input);
    if (path === "/api/investors/me") return json(200, ADA_ME);
    if (path === "/api/investors/documents") return json(200, { documents: [DECK] });
    if (path === LINK) {
      const body = JSON.parse(String(init?.body)) as { mode: string };
      return body.mode === "inline" ? json(200, { url: "https://storage.example.com/signed-get-1", expiresIn: 300 }) : download();
    }
    return json(404, { error: "not_found" });
  });
}

const linkCalls = () => fetchMock.mock.calls.filter(([input]) => String(input) === LINK);

function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

function renderAt(path: string) {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth: ADA },
  );
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

describe("the viewer's present address", () => {
  it("starts the PDF in present mode at ?present=1, and drops the parameter when present mode ends", async () => {
    serve(() => json(500, { error: "internal" }));
    renderAt(presentPath(DECK.id));
    await screen.findByTestId("viewer-url");
    expect(screen.getByTestId("present")).toHaveTextContent("presenting");
    expect(linkCalls()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "exit-present" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(new RegExp(`^/documents/${DECK.id}$`)));
    expect(screen.getByTestId("present")).toHaveTextContent("reading");
    expect(linkCalls()).toHaveLength(1);
  });

  it("reads the PDF normally without it, and an exit changes no address", async () => {
    serve(() => json(500, { error: "internal" }));
    renderAt(`/documents/${DECK.id}`);
    await screen.findByTestId("viewer-url");
    expect(screen.getByTestId("present")).toHaveTextContent("reading");
    fireEvent.click(screen.getByRole("button", { name: "exit-present" }));
    expect(screen.getByTestId("where")).toHaveTextContent(new RegExp(`^/documents/${DECK.id}$`));
  });

  it("hands the viewer a failed download's message for present mode", async () => {
    serve(() => json(429, { error: "rate_limited" }));
    renderAt(presentPath(DECK.id));
    await screen.findByTestId("viewer-url");
    fireEvent.click(screen.getByRole("button", { name: strings.library.actionLabel(strings.library.download, DECK.title) }));
    await waitFor(() => expect(screen.getByTestId("notice")).toHaveTextContent(strings.library.errors.rateLimited));
    expect(navigateTo).not.toHaveBeenCalled();
  });
});
