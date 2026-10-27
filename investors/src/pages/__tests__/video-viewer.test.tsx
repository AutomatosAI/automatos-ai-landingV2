import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { setTokenSource } from "@/auth/token";
import { navigateTo } from "@/documents/navigate";
import { DOCUMENTS_PATH, documentPath, HOME_PATH } from "@/lib/paths";
import { strings } from "@/strings";
import { ADA_ME, investorDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";
import { MEDIA_ERR_DECODE, MEDIA_ERR_NETWORK } from "@/viewer/video-model";

// jsdom does not navigate: a download link lands here instead.
vi.mock("@/documents/navigate", () => ({ navigateTo: vi.fn() }));

const copy = strings.viewer;
const DEMO = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d4",
  title: "Example product demo",
  category: "Product",
  kind: "video",
  fileName: "example-demo.mp4",
  contentType: "video/mp4",
  pageCount: null,
});
const LINK = `/documents/${DEMO.id}/link`;
const SESSION_ID = "00000000-0000-4000-8000-00000000005e";

type Handler = (body: unknown) => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const signedUrl = (n: number) => `https://storage.example.com/signed-get-${n}`;

/** Answers /me, /documents and /sessions; each link request gets the next signed URL (1, 2, ...). */
function serve(extra: Readonly<Record<string, Handler>> = {}) {
  let links = 0;
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input).replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, ADA_ME);
    if (method === "GET" && path === "/documents") return json(200, { documents: [DEMO] });
    if (method === "POST" && path === "/sessions") return json(201, { sessionId: SESSION_ID });
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const handler = extra[`${method} ${path}`];
    if (handler) return handler(body);
    if (method === "POST" && path === LINK) {
      links += 1;
      return json(200, { url: signedUrl(links), expiresIn: 300 });
    }
    return json(404, { error: "not_found" });
  });
}

const calls = (method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? "GET") === method && String(input) === `/api/investors${path}`)
    .map(([, init]) => (typeof init?.body === "string" ? JSON.parse(init.body) : undefined));

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
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

/** The player once it has the link numbered `n`. */
async function playerWith(n: number): Promise<HTMLVideoElement> {
  const label = copy.video.label(DEMO.title);
  await waitFor(() => expect(screen.getByLabelText(label)).toHaveAttribute("src", signedUrl(n)));
  const video = screen.getByLabelText(label);
  if (!(video instanceof HTMLVideoElement)) throw new Error("no video element");
  return video;
}

/** jsdom plays nothing: the test sets what a browser would report. */
function loaded(video: HTMLVideoElement, duration = 200) {
  Object.defineProperty(video, "duration", { configurable: true, value: duration });
  fireEvent.loadedMetadata(video);
}

function at(video: HTMLVideoElement, seconds: number) {
  video.currentTime = seconds;
  fireEvent.timeUpdate(video);
}

function failWith(video: HTMLVideoElement, code: number) {
  Object.defineProperty(video, "error", { configurable: true, value: { code } });
  fireEvent.error(video);
}

const play = vi.fn(() => Promise.resolve());

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  setTokenSource(async () => "tok_ada");
});

afterEach(() => {
  fetchMock.mockReset();
  play.mockClear();
  vi.mocked(navigateTo).mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("opening a video", () => {
  it.each([
    ["home", HOME_PATH],
    ["documents", DOCUMENTS_PATH],
  ])("goes from %s to the document's page, where the player asks for one inline link", async (_, path) => {
    serve();
    renderAt(path);
    const open = await screen.findByRole("link", { name: strings.library.actionLabel(strings.library.open, DEMO.title) });
    expect(open).toHaveAttribute("href", documentPath(DEMO.id));
    expect(calls("POST", LINK)).toEqual([]);
    fireEvent.click(open);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(documentPath(DEMO.id)));
    await playerWith(1);
    expect(screen.getByRole("heading", { level: 1, name: DEMO.title })).toBeInTheDocument();
    expect(calls("POST", LINK)).toEqual([{ mode: "inline" }]);
    expect(navigateTo).not.toHaveBeenCalled();
  });
});

describe("the video page", () => {
  it("asks for one new link when storage refuses the link, and picks up at the same time", async () => {
    serve();
    renderAt(documentPath(DEMO.id));
    const first = await playerWith(1);
    loaded(first);
    fireEvent.play(first);
    at(first, 130);
    failWith(first, MEDIA_ERR_NETWORK);
    const second = await playerWith(2);
    expect(calls("POST", LINK)).toEqual([{ mode: "inline" }, { mode: "inline" }]);
    loaded(second);
    expect(second.currentTime).toBe(130);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("shows the error with the Download fallback when the new link is refused too, and Try again picks up there", async () => {
    serve();
    renderAt(documentPath(DEMO.id));
    const first = await playerWith(1);
    loaded(first);
    at(first, 90);
    failWith(first, MEDIA_ERR_NETWORK);
    failWith(await playerWith(2), MEDIA_ERR_NETWORK);
    expect(await screen.findByText(copy.video.failed)).toBeInTheDocument();
    expect(screen.getByText(copy.failed.title)).toBeInTheDocument();
    expect(calls("POST", LINK)).toHaveLength(2);
    expect(screen.getByRole("button", { name: strings.library.actionLabel(strings.library.download, DEMO.title) })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    const third = await playerWith(3);
    loaded(third);
    expect(third.currentTime).toBe(90);
  });

  it("renews again after the new link has played: a long video outlives several links", async () => {
    serve();
    renderAt(documentPath(DEMO.id));
    const first = await playerWith(1);
    loaded(first);
    failWith(first, MEDIA_ERR_NETWORK);
    const second = await playerWith(2);
    loaded(second);
    fireEvent.playing(second);
    failWith(second, MEDIA_ERR_NETWORK);
    await playerWith(3);
    expect(calls("POST", LINK)).toHaveLength(3);
  });

  it("does not renew for a file the browser cannot decode", async () => {
    serve();
    renderAt(documentPath(DEMO.id));
    failWith(await playerWith(1), MEDIA_ERR_DECODE);
    expect(await screen.findByText(copy.video.failed)).toBeInTheDocument();
    expect(calls("POST", LINK)).toHaveLength(1);
  });

  it("says why when the link is refused, in plain words", async () => {
    serve({ [`POST ${LINK}`]: () => json(429, { error: "rate_limited" }) });
    renderAt(documentPath(DEMO.id));
    expect(await screen.findByText(strings.library.errors.rateLimited)).toBeInTheDocument();
  });

  it("sends 25, 50, 75 and 100% once each through the tracker, across seeks and a renewed link", async () => {
    serve();
    renderAt(documentPath(DEMO.id));
    await waitFor(() => expect(calls("POST", "/sessions")).toHaveLength(1));
    const first = await playerWith(1);
    loaded(first);
    at(first, 52);
    at(first, 160);
    at(first, 20);
    failWith(first, MEDIA_ERR_NETWORK);
    const second = await playerWith(2);
    loaded(second);
    at(second, 60);
    at(second, 155);
    fireEvent.ended(second);
    window.dispatchEvent(new Event("pagehide"));
    await waitFor(() => expect(calls("POST", "/events")).toHaveLength(1));
    expect(calls("POST", "/events")[0]).toEqual({
      sessionId: SESSION_ID,
      events: [25, 50, 75, 100].map((percent) => ({ type: "video_progress", documentId: DEMO.id, percent })),
    });
  });
});
