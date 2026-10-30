import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { adminSection, adminSections } from "@/admin/__tests__/section-fixtures";
import type { AdminSection } from "@/admin/sections-api";
import { setTokenSource } from "@/auth/token";
import { CARD_ROW_LIMITS } from "@/company/card-rows";
import { FOUNDER } from "@/company/company-data";
import { strings } from "@/strings";
import { ADMIN_ME } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

const admin = strings.admin;
const copy = admin.sections;

type Handler = (body: unknown) => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** Answers /me as an admin, the tracker's session, the investor sections, and "METHOD /path" from `routes`. */
function serve(routes: Readonly<Record<string, Handler>>) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input).replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, ADMIN_ME);
    if (path === "/sessions") return json(201, { sessionId: "00000000-0000-4000-8000-00000000005e" });
    if (method === "GET" && path === "/sections") return json(200, { sections: [] });
    const handler = routes[`${method} ${path}`];
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    return handler ? handler(body) : json(404, { error: "not_found" });
  });
}

const listOf = (sections: readonly AdminSection[]) => () => json(200, { sections });

/** PUT answers what was sent, stamped by the admin, as the server does. */
const echoSave = (slug: "team" | "overview" | "founder_card") => (body: unknown) =>
  json(200, { section: adminSection(slug, { ...(body as Partial<AdminSection>), updatedAt: "2026-10-27T10:00:00.000Z" }) });

const calls = (method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? "GET") === method && String(input) === `/api/investors${path}`)
    .map(([, init]) => (typeof init?.body === "string" ? JSON.parse(init.body) : undefined));

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAdmin(path: string) {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth: ADA },
  );
}

const SECTIONS = adminSections({
  overview: { bodyMd: "Example overview text.", published: true },
  team: { bodyMd: "Example team text.", published: false, updatedBy: null },
  // As 005_founder_card_section.sql ships it: empty and unpublished.
  founder_card: { bodyMd: "", published: false, updatedBy: null },
});

/* The founder card's rows (KP5: an invented number from the UK's drama range, an example address). */
const PHONE = { text: "+44 7700 900123", href: "tel:+447700900123", label: "Mobile" } as const;
const SITE = { text: "example.com/someone", href: "https://example.com/someone", label: "Site" } as const;
const CARD_ROWS = [
  `- [${PHONE.text}](tel:+44 7700 900123) ${PHONE.label}`,
  `- [${SITE.text}](${SITE.href}) ${SITE.label}`,
  "A line that is not a row.",
  "- [Old site](http://example.com/old) Site",
  "- [Run](javascript:alert(1)) Script",
].join("\n");

const textArea = () => screen.findByLabelText(copy.fields.body.label);
const preview = () => within(screen.getByRole("region", { name: copy.preview.label }));
const type = async (text: string) => fireEvent.change(await textArea(), { target: { value: text } });

/** Radix's switch measures itself inside a form with a ResizeObserver, which jsdom lacks; nothing is resized here. */
class SilentResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", SilentResizeObserver);
  setTokenSource(async () => "tok_ada");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("the sections list", () => {
  it("lists the five sections with where each shows and whether investors see it", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections");

    const list = await screen.findByRole("list", { name: copy.listLabel });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(within(rows[0]!).getByText("Overview")).toBeInTheDocument();
    expect(within(rows[0]!).getByText(copy.places.overview)).toBeInTheDocument();
    expect(within(rows[0]!).getByText(copy.published)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(copy.notPublished)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(copy.neverSaved)).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("link", { name: copy.editLabel("Team") })).toHaveAttribute("href", "/admin/sections/team");
    expect(within(rows[4]!).getByText("Founder card")).toBeInTheDocument();
    expect(within(rows[4]!).getByText(copy.places.founder_card)).toBeInTheDocument();
    expect(within(rows[4]!).getByText(copy.notPublished)).toBeInTheDocument();
    expect(within(rows[4]!).getByRole("link", { name: copy.editLabel("Founder card") })).toHaveAttribute(
      "href",
      "/admin/sections/founder_card",
    );

    const nav = screen.getByRole("navigation", { name: admin.navLabel });
    expect(within(nav).getByRole("link", { name: admin.nav.sections })).toHaveAttribute("aria-current", "page");
  });

  it("says when the list cannot be read, and reads it again on retry", async () => {
    let answer: Handler = () => json(500, { error: "server_error" });
    serve({ "GET /admin/sections": (body) => answer(body) });
    renderAdmin("/admin/sections");

    const retry = await screen.findByRole("button", { name: strings.status.error.retry });
    answer = listOf(SECTIONS);
    fireEvent.click(retry);
    expect(await screen.findByRole("list", { name: copy.listLabel })).toBeInTheDocument();
  });
});

describe("the section editor", () => {
  it("opens from the list with the section's title, switch and text, and nothing unsaved", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections");

    fireEvent.click(await screen.findByRole("link", { name: copy.editLabel("Team") }));
    expect(await screen.findByRole("heading", { level: 1, name: copy.editTitle("Team") })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/sections/team");
    expect(screen.getByLabelText(copy.fields.title.label)).toHaveValue("Team");
    expect(screen.getByRole("switch", { name: copy.fields.published.label })).toHaveAttribute("aria-checked", "false");
    expect(await textArea()).toHaveValue("Example team text.");
    expect(screen.getByText(copy.clean)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.save })).toBeDisabled();
  });

  it("shows a live preview through the investors' renderer: headings and links, never raw HTML", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections/team");

    await type("# Who we are\n\nRead [the deck](https://example.com/deck).\n\n<script>alert(1)</script><b>raw</b>");
    expect(await preview().findByRole("heading", { name: "Who we are" })).toBeInTheDocument();
    expect(preview().getByRole("link", { name: "the deck" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(preview().queryByText("raw")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(copy.dirty)).toBeInTheDocument();

    await type("   ");
    expect(await preview().findByText(strings.sections.comingSoon)).toBeInTheDocument();
  });

  it("saves the three fields with PUT, says so in a toast, and refreshes what investors see", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS), "PUT /admin/sections/team": echoSave("team") });
    renderAdmin("/admin/sections/team");

    await type("We are three founders.");
    fireEvent.change(screen.getByLabelText(copy.fields.title.label), { target: { value: " The team " } });
    fireEvent.click(screen.getByRole("switch", { name: copy.fields.published.label }));
    const investorReads = calls("GET", "/sections").length;
    fireEvent.click(screen.getByRole("button", { name: copy.save }));

    expect(await screen.findByText(copy.saved("The team", true))).toBeInTheDocument();
    expect(calls("PUT", "/admin/sections/team")).toEqual([
      { title: "The team", bodyMd: "We are three founders.", published: true },
    ]);
    expect(screen.getByText(copy.clean)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.fields.title.label)).toHaveValue("The team");
    await waitFor(() => expect(calls("GET", "/sections").length).toBeGreaterThan(investorReads));
  });

  it("keeps the text when a save fails and says so in a toast", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS), "PUT /admin/sections/team": () => json(500, { error: "server_error" }) });
    renderAdmin("/admin/sections/team");

    await type("Text worth keeping.");
    fireEvent.click(screen.getByRole("button", { name: copy.save }));

    expect(await screen.findByText(copy.saveFailed("Team"))).toBeInTheDocument();
    expect(screen.getByText(copy.failures.other)).toBeInTheDocument();
    expect(await textArea()).toHaveValue("Text worth keeping.");
    expect(screen.getByText(copy.dirty)).toBeInTheDocument();
  });

  it("marks the field the server refused, and checks the title before sending", async () => {
    const refuse = () => json(400, { error: "invalid", fields: { bodyMd: "too_long" } });
    serve({ "GET /admin/sections": listOf(SECTIONS), "PUT /admin/sections/team": refuse });
    renderAdmin("/admin/sections/team");

    await type("Longer text.");
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    expect(await screen.findByText(admin.form.errors.tooLong(20000))).toBeInTheDocument();
    expect(await textArea()).toHaveFocus();

    fireEvent.change(screen.getByLabelText(copy.fields.title.label), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    expect(await screen.findByText(admin.form.errors.required)).toBeInTheDocument();
    expect(calls("PUT", "/admin/sections/team")).toHaveLength(1);
  });

  it("explains markdown in a page section's text hint, not the founder card's row format", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections/team");

    await textArea();
    expect(screen.getByText(copy.fields.body.hint)).toBeInTheDocument();
    expect(screen.queryByText(copy.founderCard.bodyHint(CARD_ROW_LIMITS))).toBeNull();
  });

  it("says when the address names no section", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections/pricing");
    expect(await screen.findByText(copy.missing)).toBeInTheDocument();
  });
});

describe("unsaved changes", () => {
  it("asks before a link leaves the editor: Keep editing stays, Leave goes", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections/team");
    await type("Half a thought");

    const nav = screen.getByRole("navigation", { name: admin.navLabel });
    fireEvent.click(within(nav).getByRole("link", { name: admin.nav.documents }));
    const dialog = await screen.findByRole("alertdialog", { name: copy.leave.title });
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/sections/team");

    fireEvent.click(within(dialog).getByRole("button", { name: copy.leave.stay }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(await textArea()).toHaveValue("Half a thought");

    fireEvent.click(screen.getByRole("link", { name: copy.back }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.leave.leave }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/admin\/sections$/));
    expect(await screen.findByRole("list", { name: copy.listLabel })).toBeInTheDocument();
  });

  it("asks the browser before a reload or a closed tab, only while there are unsaved changes", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections/team");
    const unload = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    await textArea();
    expect(unload()).toBe(false);
    await type("Unsaved");
    await waitFor(() => expect(unload()).toBe(true));
    await type("Example team text.");
    await waitFor(() => expect(unload()).toBe(false));
  });

  it("lets links go without asking when nothing changed, or once the changes are saved", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS), "PUT /admin/sections/team": echoSave("team") });
    renderAdmin("/admin/sections/team");

    await type("Saved text.");
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    await screen.findByText(copy.saved("Team", false));

    fireEvent.click(screen.getByRole("link", { name: copy.back }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/admin\/sections$/));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("the founder card's editor (PRD-003 US-305)", () => {
  it("opens with the row format in the text hint, and previews the card with the work email alone while empty", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections/founder_card");

    expect(await screen.findByRole("heading", { level: 1, name: copy.editTitle("Founder card") })).toBeInTheDocument();
    expect(screen.getByText(copy.places.founder_card)).toBeInTheDocument();
    expect(screen.getByText(copy.founderCard.bodyHint(CARD_ROW_LIMITS))).toBeInTheDocument();
    expect(screen.queryByText(copy.fields.body.hint)).toBeNull();
    await textArea();

    expect(preview().getByRole("heading", { level: 2, name: FOUNDER.name })).toBeInTheDocument();
    const links = preview().getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([`mailto:${FOUNDER.email}`]);
    expect(preview().queryByText(strings.sections.comingSoon)).toBeNull();
    expect(screen.queryByText(/not on the card/)).toBeNull();
  });

  it("shows the rows as the card shows them, after the work email, and says how many lines are skipped", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS) });
    renderAdmin("/admin/sections/founder_card");

    await type(CARD_ROWS);
    const phone = await preview().findByRole("link", { name: new RegExp(PHONE.label) });
    expect(phone).toHaveAttribute("href", PHONE.href);
    expect(phone).toHaveTextContent(PHONE.text);
    const site = preview().getByRole("link", { name: new RegExp(SITE.label) });
    expect(site).toHaveAttribute("href", SITE.href);
    expect(site).toHaveAttribute("target", "_blank");
    expect(site).toHaveAttribute("rel", "noopener noreferrer");

    const hrefs = preview()
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([`mailto:${FOUNDER.email}`, PHONE.href, SITE.href]);
    expect(preview().queryByText("A line that is not a row.")).toBeNull();
    expect(screen.getByText(copy.founderCard.skipped(3))).toBeInTheDocument();

    await type(`- [${PHONE.text}](${PHONE.href}) ${PHONE.label}\nNot a row`);
    expect(await screen.findByText(copy.founderCard.skipped(1))).toBeInTheDocument();
    await type(`- [${PHONE.text}](${PHONE.href}) ${PHONE.label}`);
    await waitFor(() => expect(screen.queryByText(/not on the card/)).toBeNull());
  });

  it("saves the rows as typed, like any section", async () => {
    serve({ "GET /admin/sections": listOf(SECTIONS), "PUT /admin/sections/founder_card": echoSave("founder_card") });
    renderAdmin("/admin/sections/founder_card");

    await type(CARD_ROWS);
    fireEvent.click(screen.getByRole("switch", { name: copy.fields.published.label }));
    fireEvent.click(screen.getByRole("button", { name: copy.save }));

    expect(await screen.findByText(copy.saved("Founder card", true))).toBeInTheDocument();
    expect(calls("PUT", "/admin/sections/founder_card")).toEqual([{ title: "Founder card", bodyMd: CARD_ROWS, published: true }]);
  });
});
