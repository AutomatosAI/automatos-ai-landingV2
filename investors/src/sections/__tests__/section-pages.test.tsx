import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import type { Me } from "@/api/me";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { ADA_ME, ADMIN_ME, investorDocument } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

import type { Section } from "../sections-api";

import { section } from "./fixtures";

const nav = strings.nav;
const copy = strings.sections;
const SESSION = "00000000-0000-4000-8000-00000000005e";
const DECK = investorDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck", category: "Pitch" });
const ALL = [section("overview"), section("team"), section("faq"), section("contact")];

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

interface Failure {
  readonly status: number;
  readonly body: unknown;
}

/** GET /sections answers the list, or fails. */
type SectionsAnswer = readonly Section[] | Failure;

const FAILED: Failure = { status: 500, body: { error: "internal_error" } };

const isFailure = (answer: SectionsAnswer): answer is Failure => "status" in answer;

/** /me, /documents, the tracker's calls and GET /sections; anything else is a 404. */
function serve(sections: SectionsAnswer, me: Me) {
  fetchMock.mockImplementation(async (input) => {
    const path = String(input).replace("/api/investors", "");
    if (path === "/me") return json(200, me);
    if (path === "/documents") return json(200, { documents: [DECK] });
    if (path === "/sessions") return json(201, { sessionId: SESSION });
    if (path === "/events") return new Response(null, { status: 204 });
    if (path !== "/sections") return json(404, { error: "not_found" });
    return isFailure(sections) ? json(sections.status, sections.body) : json(200, { sections });
  });
}

function renderPortal(path: string, sections: SectionsAnswer, me: Me = ADA_ME) {
  serve(sections, me);
  return renderWithProviders(<App />, { path, auth: ADA });
}

const sidebar = () => within(screen.getByRole("complementary"));
const sidebarLinks = () => sidebar().getAllByRole("link").map((link) => link.textContent);

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_ada");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setTokenSource(null);
});

describe("the home page's overview", () => {
  it("shows the published overview above the documents", async () => {
    renderPortal("/", [section("overview", { bodyMd: "# Why now\n\nAgents need an operating system." })]);
    const overview = await screen.findByRole("region", { name: "Overview" });
    expect(await within(overview).findByRole("heading", { level: 2, name: "Why now" })).toBeInTheDocument();
    expect(overview).toHaveTextContent("Agents need an operating system.");
    const deck = await screen.findByRole("heading", { level: 3, name: DECK.title });
    expect(overview.compareDocumentPosition(deck) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: strings.home.title })).toBeInTheDocument();
  });

  it.each([
    ["unpublished", [section("team")]],
    ["published but empty", [section("overview", { bodyMd: " \n " })]],
  ])("is left out when %s; the documents still show", async (_state, sections) => {
    renderPortal("/", sections);
    await screen.findByRole("heading", { level: 3, name: DECK.title });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/investors/sections", expect.anything()));
    expect(screen.queryByRole("region", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByText(copy.comingSoon)).not.toBeInTheDocument();
  });

  it("is left out when the sections cannot be read; the documents still show", async () => {
    renderPortal("/", FAILED);
    await screen.findByRole("heading", { level: 3, name: DECK.title });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: strings.home.title })).toBeInTheDocument();
  });
});

describe("the sidebar's section links", () => {
  it("links only the published section pages, in the order Team, FAQ, Contact", async () => {
    renderPortal("/", [section("contact"), section("team", { bodyMd: "" })]);
    await waitFor(() => expect(sidebarLinks()).toEqual([nav.home, nav.documents, nav.team, nav.contact, nav.profile]));
  });

  it("puts all three before Profile, and Admin last for an admin", async () => {
    renderPortal("/", ALL, ADMIN_ME);
    await waitFor(() =>
      expect(sidebarLinks()).toEqual([nav.home, nav.documents, nav.team, nav.faq, nav.contact, nav.profile, nav.admin]),
    );
  });

  it("shows no section links when the sections cannot be read", async () => {
    renderPortal("/", FAILED);
    await screen.findByRole("heading", { level: 3, name: DECK.title });
    expect(sidebarLinks()).toEqual([nav.home, nav.documents, nav.profile]);
  });
});

describe("the section pages", () => {
  it("renders the team's markdown under its title and marks its link", async () => {
    renderPortal("/team", [section("team", { title: "The team", bodyMd: "- Ada Example, founder\n- Example Person, CTO" })]);
    expect(await screen.findByRole("heading", { level: 1, name: "The team" })).toBeInTheDocument();
    expect((await screen.findAllByRole("listitem")).map((item) => item.textContent)).toContain("Ada Example, founder");
    await waitFor(() => expect(sidebar().getByRole("link", { name: nav.team })).toHaveAttribute("aria-current", "page"));
  });

  it("renders the FAQ's markdown", async () => {
    renderPortal("/faq", [section("faq", { bodyMd: "### Is it open source?\n\nYes." })]);
    expect(await screen.findByRole("heading", { level: 4, name: "Is it open source?" })).toBeInTheDocument();
    expect(screen.getByText("Yes.")).toBeInTheDocument();
  });

  it.each([
    ["unpublished", [section("team")], copy.titles.faq],
    ["published but empty", [section("faq", { title: "Questions", bodyMd: "" })], "Questions"],
  ])("says Coming soon. when %s", async (_state, sections, title) => {
    renderPortal("/faq", sections);
    expect(await screen.findByText(copy.comingSoon)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });

  it("shows the error screen when the sections cannot be read", async () => {
    renderPortal("/team", FAILED);
    expect(await screen.findByRole("heading", { level: 1, name: strings.status.error.title })).toBeInTheDocument();
  });
});

describe("the contact page", () => {
  const helloLink = () => screen.getByRole("link", { name: strings.contact.helloEmail });

  it("renders the booking link from the markdown, then the fixed email line", async () => {
    renderPortal("/contact", [section("contact", { bodyMd: "[Book a call](https://booking.example.com/automatos)" })]);
    const booking = await screen.findByRole("link", { name: "Book a call" });
    expect(booking).toHaveAttribute("target", "_blank");
    expect(booking).toHaveAttribute("rel", "noopener noreferrer");
    expect(helloLink()).toHaveAttribute("href", `mailto:${strings.contact.helloEmail}`);
    expect(booking.compareDocumentPosition(helloLink()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the email line while the section is coming soon", async () => {
    renderPortal("/contact", []);
    expect(await screen.findByText(copy.comingSoon)).toBeInTheDocument();
    expect(helloLink().closest("p")).toHaveTextContent(`${copy.contactLine.before}${strings.contact.helloEmail}.`);
  });
});

describe("section time tracking", () => {
  it("sends the visible time on the page as section_view when the tab hides", async () => {
    let clock = 0;
    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    renderPortal("/team", [section("team")]);
    await screen.findByText("Example team text.");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/investors/sessions", expect.anything()));
    clock = 4500;
    visibility = "hidden";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    });
    const flush = fetchMock.mock.calls.find(([input]) => String(input) === "/api/investors/events");
    expect(flush?.[1]?.keepalive).toBe(true);
    expect(JSON.parse(String(flush?.[1]?.body)).events).toEqual([
      { type: "section_view", section: "team", durationMs: 4500 },
    ]);
  });
});
