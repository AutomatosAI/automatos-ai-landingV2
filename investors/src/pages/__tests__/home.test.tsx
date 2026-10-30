import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { setTokenSource } from "@/auth/token";
import type { InvestorDocument } from "@/documents/documents-api";
import { section } from "@/sections/__tests__/fixtures";
import type { Section } from "@/sections/sections-api";
import { strings } from "@/strings";
import { ADA_ME, investorDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

// pdf.js cannot run in jsdom: the viewer stands in, saying whether it starts in present mode.
vi.mock("@/viewer/PdfViewer", () => ({
  PdfViewer: ({ present }: { readonly present?: boolean }) => <p data-testid="viewer">{present ? "present" : "read"}</p>,
}));

/*
 * The signed-in Home's lead (PRD-003 §3.2, US-306): the compact company and
 * founder header, quick access and the product links above today's
 * overview, pitch block and library. The words are written out here, so the
 * page is checked against the PRD, not against itself.
 */

const FOUNDER_LINE = "I built Automatos myself, with AI agents. Then I brought in the team to scale it.";
const TEAM_LINE = "Gerard Kavanagh, Founder · Dave, CTO (since Oct 2026) · Ricardo 'Rikki' Capone, fundraising";

/** §3.2's order: every h2 above the rule, then the pitch block's and the library's. */
const LEAD_HEADINGS = ["Automatos", "Gerard Kavanagh", "Quick access", "See it working", "Also from Automatos"];

const DECK = investorDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck", category: "Pitch" });
const VIDEO = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d7",
  title: "Example pitch video",
  category: "Pitch",
  kind: "video",
  fileName: "example-pitch.mp4",
  contentType: "video/mp4",
  pageCount: null,
});
const MODEL = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d3",
  title: "Example model",
  category: "Business model",
  kind: "spreadsheet",
  pageCount: null,
});
const LIBRARY = [DECK, VIDEO, MODEL];

/* Invented (KP5): a number from the UK's drama range and a page on an example domain. */
const PHONE = { text: "+44 7700 900123", href: "tel:+447700900123" } as const;
const SITE = { text: "example.com/someone", href: "https://example.com/someone" } as const;
const FOUNDER_CARD = section("founder_card", {
  bodyMd: `- [${PHONE.text}](${PHONE.href}) Mobile\n- [${SITE.text}](${SITE.href}) Site`,
});

/** Published: the overview and the three pages; the founder card is not (it ships so). */
const SECTIONS = [section("overview"), section("team"), section("faq"), section("contact")];

const SESSION_ID = "00000000-0000-4000-8000-00000000005e";
const SIGNED = "https://storage.example.com/signed-get";

/** The tiles' names (label, then hint) and routes, in §3.2's order, while the booking address is null. */
const ALL_TILES = [
  ["View the deck Slideshow", `/documents/${DECK.id}?present=1`],
  ["Play the demo Video", `/documents/${VIDEO.id}`],
  ["Documents Library", "/documents"],
  ["Team Page", "/team"],
  ["FAQ Page", "/faq"],
  ["Book a call Contact page", "/contact"],
] as const;

/** The sections' answers that leave nothing to read: a failure, and none yet. */
const UNREAD_SECTIONS: ReadonlyArray<[string, "fail" | "hold"]> = [
  ["cannot be read", "fail"],
  ["have not answered yet", "hold"],
];

/** The calls Home made before this story; it makes no other. */
const KNOWN_PATHS = new Set(["/me", "/sessions", "/events", "/sections", "/documents"]);

interface Answers {
  /** GET /documents: the list, or storage down. */
  readonly documents?: readonly InvestorDocument[] | "storage_down";
  /** GET /sections: the list, a failure, or no answer at all. */
  readonly sections?: readonly Section[] | "fail" | "hold";
}

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** /me, the tracker's calls, the sections, the list and the deck's link; anything else is a 404. */
function serve({ documents = LIBRARY, sections = SECTIONS }: Answers = {}) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input).replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, ADA_ME);
    if (path === "/sessions") return json(201, { sessionId: SESSION_ID });
    if (path === "/events") return new Response(null, { status: 204 });
    if (path === "/sections") {
      if (sections === "hold") return new Promise<Response>(() => {});
      return sections === "fail" ? json(500, { error: "internal_error" }) : json(200, { sections });
    }
    if (method === "GET" && path === "/documents") {
      return documents === "storage_down" ? json(503, { error: "storage_unavailable" }) : json(200, { documents });
    }
    if (method === "POST" && path === `/documents/${DECK.id}/link`) return json(200, { url: SIGNED, expiresIn: 300 });
    return json(404, { error: "not_found" });
  });
}

const calls = (method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? "GET") === method && String(input) === `/api/investors${path}`)
    .map(([, init]) => (typeof init?.body === "string" ? JSON.parse(init.body) : undefined));

const linkCalls = () => fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/link"));

const sectionsAsked = () =>
  waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/investors/sections", expect.anything()));

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

/** The compact header: the card that holds the company's name. */
async function header(): Promise<HTMLElement> {
  const name = await screen.findByRole("heading", { level: 2, name: "Automatos" });
  const card = name.closest("article");
  if (!card) throw new Error("the company's name is not in a card");
  return card;
}

const tileList = () => screen.findByRole("list", { name: "Quick access" });

const tileRoutes = (list: HTMLElement) => within(list).getAllByRole("link").map((link) => link.getAttribute("href"));

/** True when `first` comes before `second` in the document. */
function precedes(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_ada");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("Home, top to bottom", () => {
  it("keeps the h1 first, then the header, quick access and the products, then the overview, the pitch and the library", async () => {
    serve();
    renderHome();
    await screen.findByRole("heading", { level: 2, name: strings.home.pitchTitle });
    const overview = await screen.findByRole("region", { name: "Overview" });
    const [first] = screen.getAllByRole("heading");
    expect(first?.tagName).toBe("H1");
    expect(first).toHaveTextContent(strings.home.title);
    expect(screen.getByText(strings.home.intro)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      ...LEAD_HEADINGS,
      strings.home.pitchTitle,
      "Business model",
    ]);
    expect(precedes(screen.getByRole("heading", { level: 2, name: "Also from Automatos" }), overview)).toBe(true);
    expect(precedes(overview, screen.getByRole("heading", { level: 2, name: strings.home.pitchTitle }))).toBe(true);
  });
});

describe("Home's header", () => {
  it("shows the company, then Gerard's compact card and the team along its foot", async () => {
    serve();
    renderHome();
    const element = await header();
    const card = within(element);
    expect(card.getByText(strings.company.spine)).toBeInTheDocument();
    const name = card.getByRole("heading", { level: 2, name: "Gerard Kavanagh" });
    expect(precedes(card.getByRole("heading", { level: 2, name: "Automatos" }), name)).toBe(true);
    expect(card.getByRole("img", { name: "Gerard Kavanagh" })).toBeInTheDocument();
    expect(card.getByText("Founder")).toBeInTheDocument();
    expect(card.getByRole("link", { name: /gerard@automatos\.app/ })).toHaveAttribute("href", "mailto:gerard@automatos.app");
    // The last line, across the card: "Team", then each member as "name, role", joined by " · ".
    const team = card.getByText("Team");
    expect(team.nextElementSibling?.textContent).toBe(TEAM_LINE);
    expect(element).toHaveTextContent(TEAM_LINE);
  });

  it("carries no founder line and no Book a call: the tile is Home's one", async () => {
    serve();
    renderHome();
    const list = await tileList();
    await within(list).findByRole("link", { name: "Book a call Contact page" });
    const card = within(await header());
    expect(screen.queryByText(FOUNDER_LINE, { exact: false })).not.toBeInTheDocument();
    expect(card.queryByRole("link", { name: /Book a call/ })).not.toBeInTheDocument();
    expect(card.queryByRole("button", { name: /Book a call/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Book a call/ })).toHaveLength(1);
  });

  it("shows the published founder_card rows after the work email", async () => {
    serve({ sections: [...SECTIONS, FOUNDER_CARD] });
    renderHome();
    const card = within(await header());
    const phone = await card.findByRole("link", { name: /\+44 7700 900123/ });
    expect(phone).toHaveAttribute("href", PHONE.href);
    expect(phone).not.toHaveAttribute("target");
    expect(phone).toHaveTextContent("Mobile");
    const site = card.getByRole("link", { name: /example\.com\/someone/ });
    expect(site).toHaveAttribute("href", SITE.href);
    expect(site).toHaveAttribute("target", "_blank");
    const email = card.getByRole("link", { name: /gerard@automatos\.app/ });
    expect(precedes(email, phone)).toBe(true);
    expect(precedes(phone, site)).toBe(true);
  });

  it("shows no founder_card row while the section is unpublished, as it ships", async () => {
    serve();
    const { container } = renderHome();
    // The Book a call tile comes from the same answer: once it shows, the sections are in.
    await within(await tileList()).findByRole("link", { name: "Book a call Contact page" });
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(within(await header()).getAllByRole("link")).toHaveLength(1);
  });

  it.each(UNREAD_SECTIONS)("shows no founder_card row, and the email still, while the sections %s", async (_state, sections) => {
    serve({ sections });
    const { container } = renderHome();
    await screen.findByRole("heading", { level: 3, name: MODEL.title });
    await sectionsAsked();
    const card = within(await header());
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(card.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["mailto:gerard@automatos.app"]);
  });
});

describe("Home's quick access", () => {
  it("shows a tile for everything the portal holds, each opening today's route in place", async () => {
    serve();
    renderHome();
    const list = await tileList();
    await waitFor(() => expect(tileRoutes(list)).toEqual(ALL_TILES.map(([, route]) => route)));
    for (const [name, route] of ALL_TILES) {
      const tile = within(list).getByRole("link", { name });
      expect(tile).toHaveAttribute("href", route);
      expect(tile).not.toHaveAttribute("target");
    }
  });

  it("asks for no document link on render; View the deck opens the slideshow, which asks for one", async () => {
    serve();
    renderHome();
    const deck = await within(await tileList()).findByRole("link", { name: "View the deck Slideshow" });
    await waitFor(() => expect(calls("POST", "/sessions")).toHaveLength(1));
    expect(linkCalls()).toEqual([]);
    fireEvent.click(deck);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`/documents/${DECK.id}?present=1`));
    expect(await screen.findByTestId("viewer")).toHaveTextContent("present");
    expect(calls("POST", `/documents/${DECK.id}/link`)).toEqual([{ mode: "inline" }]);
  });

  it("makes no call Home did not make before", async () => {
    serve({ sections: [...SECTIONS, FOUNDER_CARD] });
    renderHome();
    await within(await tileList()).findByRole("link", { name: "Book a call Contact page" });
    await waitFor(() => expect(calls("POST", "/sessions")).toHaveLength(1));
    const paths = fetchMock.mock.calls.map(([input]) => String(input).replace("/api/investors", ""));
    expect(paths.filter((path) => !KNOWN_PATHS.has(path))).toEqual([]);
    expect(calls("GET", "/documents")).toHaveLength(1);
  });

  it("hides the deck, video and Documents tiles while storage is down; Team, FAQ and Book a call stay", async () => {
    serve({ documents: "storage_down" });
    renderHome();
    await screen.findByText(strings.documents.unavailable);
    const list = await tileList();
    await waitFor(() => expect(tileRoutes(list)).toEqual(["/team", "/faq", "/contact"]));
  });

  it("hides Book a call while Contact is unpublished (the booking address is not set yet)", async () => {
    serve({ sections: [section("overview"), section("team")] });
    renderHome();
    const list = await tileList();
    await waitFor(() =>
      expect(tileRoutes(list)).toEqual([`/documents/${DECK.id}?present=1`, `/documents/${VIDEO.id}`, "/documents", "/team"]),
    );
    expect(screen.queryByRole("link", { name: /Book a call/ })).not.toBeInTheDocument();
  });

  it("leaves Quick access out when no tile has anything to open", async () => {
    serve({ documents: [], sections: [section("overview")] });
    renderHome();
    await screen.findByText(strings.library.empty.title);
    await screen.findByRole("region", { name: "Overview" });
    expect(screen.queryByRole("heading", { name: "Quick access" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "See it working" })).toBeInTheDocument();
  });
});
