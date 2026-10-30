import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { setTokenSource } from "@/auth/token";
import { FOUNDER } from "@/company/company-data";
import type { InvestorDocument } from "@/documents/documents-api";
import { navigateTo } from "@/documents/navigate";
import { section } from "@/sections/__tests__/fixtures";
import { strings } from "@/strings";
import { ADA_ME, investorDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";
import { presentPath } from "@/viewer/present-route";

// jsdom does not navigate: a download link lands here instead.
vi.mock("@/documents/navigate", () => ({ navigateTo: vi.fn() }));

// pdf.js cannot run in jsdom: the viewer stands in, saying whether it starts in present mode.
vi.mock("@/viewer/PdfViewer", () => ({
  PdfViewer: ({ present }: { readonly present?: boolean }) => <p data-testid="viewer">{present ? "present" : "read"}</p>,
}));

const copy = strings.home.pitch;
const library = strings.library;
/** The h2s above the rule (PRD-003 §3.2): the header, Quick access and the product links, before the pitch block's. */
const LEAD_HEADINGS = [
  strings.company.name,
  FOUNDER.name,
  strings.company.quickAccess.heading,
  strings.company.seeItWorking,
  strings.company.alsoFromAutomatos,
];
const DECK = investorDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck", category: "Pitch" });
const VIDEO = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d7",
  title: "Example pitch video",
  description: "The company in three minutes.",
  category: " pitch ",
  kind: "video",
  fileName: "example-pitch.mp4",
  contentType: "video/mp4",
  sizeBytes: 48_234_496,
  pageCount: null,
});
const ONE_PAGER = investorDocument({ id: "00000000-0000-4000-8000-0000000000d2", title: "Example one-pager", pageCount: 1 });
const MODEL = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d3",
  title: "Example model",
  category: "Business model",
  kind: "spreadsheet",
  pageCount: null,
});
const DEMO = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d4",
  title: "Example product demo",
  category: "Product",
  kind: "video",
  pageCount: null,
});
const SESSION_ID = "00000000-0000-4000-8000-00000000005e";
const SIGNED = "https://storage.example.com/signed-get";

type Handler = () => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const linkPath = (document: InvestorDocument) => `/documents/${document.id}/link`;
const signedLink: Handler = () => json(200, { url: SIGNED, expiresIn: 300 });

/** /me, the tracker's calls, the overview, the list, and "METHOD /path" from the table; anything else is a 404. */
function serve(documents: readonly InvestorDocument[] | (() => readonly InvestorDocument[]), routes: Readonly<Record<string, Handler>> = {}) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input).replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, ADA_ME);
    if (path === "/sessions") return json(201, { sessionId: SESSION_ID });
    if (path === "/events") return new Response(null, { status: 204 });
    if (path === "/sections") return json(200, { sections: [section("overview")] });
    if (method === "GET" && path === "/documents") {
      return json(200, { documents: typeof documents === "function" ? documents() : documents });
    }
    const handler = routes[`${method} ${path}`];
    return handler ? handler() : json(404, { error: "not_found" });
  });
}

const calls = (method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? "GET") === method && String(input) === `/api/investors${path}`)
    .map(([, init]) => (typeof init?.body === "string" ? JSON.parse(init.body) : undefined));

const linkCalls = () => fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/link"));

function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

function renderHome() {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path: "/", auth: ADA },
  );
}

/** The pitch block: the section under its heading. */
async function pitchBlock() {
  const heading = await screen.findByRole("heading", { level: 2, name: strings.home.pitchTitle });
  const block = heading.closest("section");
  if (!block) throw new Error("the pitch heading is not in a section");
  return block;
}

/** A card of the pitch block, by its title. */
function pitchCard(block: HTMLElement, title: string) {
  const item = within(block).getByRole("heading", { level: 3, name: title }).closest("li");
  if (!item) throw new Error(`no pitch card for ${title}`);
  return within(item);
}

const playButton = () => screen.getByRole("button", { name: library.actionLabel(copy.play, VIDEO.title) });
const videoLabel = strings.viewer.video.label(VIDEO.title);

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

describe("the pitch block on the home page", () => {
  it("sits between the overview and the library, and the featured deck and video are not repeated below", async () => {
    serve([MODEL, DECK, VIDEO, ONE_PAGER, DEMO]);
    renderHome();
    const block = await pitchBlock();
    const overview = await screen.findByRole("region", { name: "Overview" });
    expect(overview.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(block).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([DECK.title, VIDEO.title]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      ...LEAD_HEADINGS,
      strings.home.pitchTitle,
      "Business model",
      "Pitch",
      "Product",
    ]);
    // Each document once: the other 'Pitch' PDF and the non-pitch video stay in the groups.
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      DECK.title,
      VIDEO.title,
      MODEL.title,
      ONE_PAGER.title,
      DEMO.title,
    ]);
    const pitchGroup = screen.getByRole("heading", { level: 2, name: "Pitch" }).closest("section");
    expect(pitchGroup).not.toBeNull();
    expect(within(pitchGroup as HTMLElement).getByRole("link", { name: library.actionLabel(library.open, ONE_PAGER.title) })).toBeInTheDocument();
  });

  it("asks for no document link on render: only a press does (KP20)", async () => {
    serve([DECK, VIDEO], { [`POST ${linkPath(VIDEO)}`]: signedLink });
    renderHome();
    await pitchBlock();
    await waitFor(() => expect(calls("POST", "/sessions")).toHaveLength(1));
    await screen.findByRole("region", { name: "Overview" });
    expect(linkCalls()).toEqual([]);
    expect(screen.queryByLabelText(videoLabel)).not.toBeInTheDocument();
    fireEvent.click(playButton());
    await waitFor(() => expect(calls("POST", linkPath(VIDEO))).toEqual([{ mode: "inline" }]));
    expect(calls("POST", linkPath(DECK))).toEqual([]);
  });

  it("stacks the cards on a phone and sets them side by side from tablets up", async () => {
    serve([DECK, VIDEO]);
    renderHome();
    const list = within(await pitchBlock()).getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    const classes = list.className.split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(["grid", "md:grid-cols-2"]));
    expect(classes).not.toContain("grid-cols-2");
  });

  it("leaves the block out when no 'Pitch' document is a PDF or a video", async () => {
    serve([MODEL, DEMO, investorDocument({ id: "00000000-0000-4000-8000-0000000000d8", title: "Example sheet", kind: "spreadsheet" })]);
    renderHome();
    await screen.findByRole("heading", { level: 3, name: MODEL.title });
    expect(screen.queryByRole("heading", { name: strings.home.pitchTitle })).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      ...LEAD_HEADINGS,
      "Business model",
      "Product",
      "Pitch",
    ]);
  });

  it("shows only the pitch when the deck and the video are all there is", async () => {
    serve([VIDEO, DECK]);
    renderHome();
    const block = await pitchBlock();
    // The deck comes first, whatever the admin's order between the two.
    expect(within(block).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([DECK.title, VIDEO.title]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      ...LEAD_HEADINGS,
      strings.home.pitchTitle,
    ]);
    expect(screen.queryByText(library.empty.title)).not.toBeInTheDocument();
  });
});

describe("the pitch deck", () => {
  it("counts slides in words", () => {
    expect([1, 2, 12].map(copy.slides)).toEqual(["1 slide", "2 slides", "12 slides"]);
  });

  it("shows its title, description, facts and slide count", async () => {
    serve([DECK, VIDEO]);
    renderHome();
    const deck = pitchCard(await pitchBlock(), DECK.title);
    expect(deck.getByText(DECK.description ?? "")).toBeInTheDocument();
    expect(deck.getByText(copy.slides(12))).toBeInTheDocument();
    expect(deck.getByText("PDF · 1.5 MB · Updated 21 Oct 2026")).toBeInTheDocument();
  });

  it("says nothing of slides when the page count is not known", async () => {
    serve([{ ...DECK, pageCount: null }]);
    renderHome();
    await pitchBlock();
    expect(screen.queryByText(copy.slides(12))).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.viewDeck })).toBeInTheDocument();
  });

  it("View the deck opens the viewer in present mode, which asks for the inline link", async () => {
    serve([DECK], { [`POST ${linkPath(DECK)}`]: signedLink });
    renderHome();
    const view = pitchCard(await pitchBlock(), DECK.title).getByRole("link", { name: copy.viewDeck });
    expect(view).toHaveAttribute("href", presentPath(DECK.id));
    expect(linkCalls()).toEqual([]);
    fireEvent.click(view);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(presentPath(DECK.id)));
    expect(await screen.findByTestId("viewer")).toHaveTextContent("present");
    expect(calls("POST", linkPath(DECK))).toEqual([{ mode: "inline" }]);
  });

  it("Download PDF asks for a download link, then goes to it", async () => {
    serve([DECK, VIDEO], { [`POST ${linkPath(DECK)}`]: signedLink });
    renderHome();
    await pitchBlock();
    fireEvent.click(screen.getByRole("button", { name: library.actionLabel(copy.downloadDeck, DECK.title) }));
    await waitFor(() => expect(navigateTo).toHaveBeenCalledWith(SIGNED));
    expect(calls("POST", linkPath(DECK))).toEqual([{ mode: "download" }]);
    expect(calls("POST", linkPath(VIDEO))).toEqual([]);
  });

  it("says why under the card when the download link is refused", async () => {
    serve([DECK], { [`POST ${linkPath(DECK)}`]: () => json(429, { error: "rate_limited" }) });
    renderHome();
    const deck = pitchCard(await pitchBlock(), DECK.title);
    fireEvent.click(deck.getByRole("button", { name: library.actionLabel(copy.downloadDeck, DECK.title) }));
    expect(await deck.findByRole("alert")).toHaveTextContent(library.errors.rateLimited);
    expect(navigateTo).not.toHaveBeenCalled();
  });
});

describe("the pitch video", () => {
  it("shows a poster until play is pressed, then the player with one inline link, playing", async () => {
    serve([VIDEO], { [`POST ${linkPath(VIDEO)}`]: signedLink });
    renderHome();
    const video = pitchCard(await pitchBlock(), VIDEO.title);
    expect(video.getByText(VIDEO.description ?? "")).toBeInTheDocument();
    fireEvent.click(playButton());
    await waitFor(() => expect(screen.getByLabelText(videoLabel)).toHaveAttribute("src", SIGNED));
    const element = screen.getByLabelText(videoLabel);
    expect(screen.queryByRole("button", { name: library.actionLabel(copy.play, VIDEO.title) })).not.toBeInTheDocument();
    Object.defineProperty(element, "duration", { configurable: true, value: 200 });
    fireEvent.loadedMetadata(element);
    // The press is the investor's intent: the player starts without a second one.
    expect(play).toHaveBeenCalledTimes(1);
    expect(calls("POST", linkPath(VIDEO))).toEqual([{ mode: "inline" }]);
  });

  it("sends its milestones through the tracker, as on the video's page", async () => {
    serve([VIDEO], { [`POST ${linkPath(VIDEO)}`]: signedLink });
    renderHome();
    await pitchBlock();
    await waitFor(() => expect(calls("POST", "/sessions")).toHaveLength(1));
    fireEvent.click(playButton());
    await waitFor(() => expect(screen.getByLabelText(videoLabel)).toHaveAttribute("src", SIGNED));
    const element = screen.getByLabelText(videoLabel) as HTMLVideoElement;
    Object.defineProperty(element, "duration", { configurable: true, value: 200 });
    fireEvent.loadedMetadata(element);
    element.currentTime = 110;
    fireEvent.timeUpdate(element);
    window.dispatchEvent(new Event("pagehide"));
    await waitFor(() => expect(calls("POST", "/events")).toHaveLength(1));
    expect(calls("POST", "/events")[0]).toEqual({
      sessionId: SESSION_ID,
      events: [25, 50].map((percent) => ({ type: "video_progress", documentId: VIDEO.id, percent })),
    });
  });

  it("Download video asks for a download link, and no inline one", async () => {
    serve([VIDEO], { [`POST ${linkPath(VIDEO)}`]: signedLink });
    renderHome();
    await pitchBlock();
    fireEvent.click(screen.getByRole("button", { name: library.actionLabel(copy.downloadVideo, VIDEO.title) }));
    await waitFor(() => expect(navigateTo).toHaveBeenCalledWith(SIGNED));
    expect(calls("POST", linkPath(VIDEO))).toEqual([{ mode: "download" }]);
    expect(screen.getByRole("button", { name: library.actionLabel(copy.play, VIDEO.title) })).toBeInTheDocument();
  });

  it("shows the storage note in the card, with Try again, when storage is down", async () => {
    let refused = true;
    serve([VIDEO], {
      [`POST ${linkPath(VIDEO)}`]: () => (refused ? json(503, { error: "storage_unavailable" }) : signedLink()),
    });
    renderHome();
    await pitchBlock();
    fireEvent.click(playButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(strings.documents.unavailable);
    expect(screen.getByRole("heading", { level: 1, name: strings.home.title })).toBeInTheDocument();
    refused = false;
    fireEvent.click(screen.getByRole("button", { name: strings.viewer.retry }));
    await waitFor(() => expect(screen.getByLabelText(videoLabel)).toHaveAttribute("src", SIGNED));
    expect(calls("POST", linkPath(VIDEO))).toHaveLength(2);
  });

  it("reads the list again when the video has gone, and the block goes with it", async () => {
    const gone = () => calls("POST", linkPath(VIDEO)).length > 0;
    serve(() => (gone() ? [MODEL] : [VIDEO, MODEL]));
    renderHome();
    await pitchBlock();
    fireEvent.click(playButton());
    await waitFor(() => expect(screen.queryByRole("heading", { name: strings.home.pitchTitle })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 3, name: MODEL.title })).toBeInTheDocument();
    expect(calls("GET", "/documents")).toHaveLength(2);
    expect(calls("POST", linkPath(VIDEO))).toEqual([{ mode: "inline" }]);
  });
});

describe("keyboard focus around the pitch video (W3-RVW-2)", () => {
  /** The video's card: the list item under its title. */
  async function videoItem() {
    const item = within(await pitchBlock()).getByRole("heading", { level: 3, name: VIDEO.title }).closest("li");
    if (!item) throw new Error("no pitch card for the video");
    return item;
  }

  /** The frame that holds the poster, then the link's states, then the player. */
  const mediaFrame = () => screen.getByRole("group", { name: VIDEO.title });

  /** A keyboard press: focus is on the button when it is activated (fireEvent.click alone moves none). */
  function press(button: HTMLElement) {
    button.focus();
    fireEvent.click(button);
  }

  it("moves no focus on render: the page keeps it where the browser put it", async () => {
    serve([DECK, VIDEO]);
    renderHome();
    const block = await pitchBlock();
    await waitFor(() => expect(calls("POST", "/sessions")).toHaveLength(1));
    expect(block.contains(document.activeElement)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it("keeps focus in the video's card when play is pressed, through the link and into the player", async () => {
    serve([DECK, VIDEO], { [`POST ${linkPath(VIDEO)}`]: signedLink });
    renderHome();
    const item = await videoItem();
    press(playButton());
    // The poster went; focus did not fall to the page.
    expect(screen.queryByRole("button", { name: library.actionLabel(copy.play, VIDEO.title) })).not.toBeInTheDocument();
    expect(within(mediaFrame()).getByRole("status")).toHaveTextContent(strings.viewer.loading);
    expect(document.activeElement).toBe(mediaFrame());
    expect(item).toContainElement(mediaFrame());
    expect(mediaFrame()).toHaveAttribute("tabindex", "-1");

    await waitFor(() => expect(screen.getByLabelText(videoLabel)).toHaveAttribute("src", SIGNED));
    const player = screen.getByLabelText(videoLabel);
    expect(document.activeElement).toBe(mediaFrame());
    expect(item).toContainElement(document.activeElement as HTMLElement);
    // Tab from the frame: the player's controls are the first thing in it that takes focus.
    expect(mediaFrame().querySelector("video, button, a[href], input, select, textarea, [tabindex]")).toBe(player);
    expect(calls("POST", linkPath(VIDEO))).toEqual([{ mode: "inline" }]);
  });

  it("keeps focus in the card when Try again is pressed after a refused link", async () => {
    let refused = true;
    serve([VIDEO], {
      [`POST ${linkPath(VIDEO)}`]: () => (refused ? json(503, { error: "storage_unavailable" }) : signedLink()),
    });
    renderHome();
    const item = await videoItem();
    press(playButton());
    await within(item).findByRole("alert");
    refused = false;
    press(within(item).getByRole("button", { name: strings.viewer.retry }));
    expect(within(item).queryByRole("button", { name: strings.viewer.retry })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(mediaFrame());
    await waitFor(() => expect(screen.getByLabelText(videoLabel)).toHaveAttribute("src", SIGNED));
    expect(document.activeElement).toBe(mediaFrame());
  });
});
