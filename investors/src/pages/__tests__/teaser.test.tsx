import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { strings } from "@/strings";
import { fakeActions, renderWithProviders } from "@/test/providers";

import { Teaser } from "../Teaser";
import { teaserSignIn } from "../teaser-model";

/* PRD-003 §5.1, written out here so the page is checked against the PRD, not against itself. */
const SPINE =
  "One assistant, Auto, runs a team of AI agents that finish a small business's work in its own brand. Open source, on your own server. Hosted beta opens November 2026.";
const INSIDE = ["Pitch deck", "One-pager", "Product demo", "Business model", "Team", "FAQ"] as const;
const TEAM_ENTRIES = [
  ["Gerard Kavanagh", "Founder"],
  ["Dave", "CTO (since Oct 2026)"],
  ["Ricardo 'Rikki' Capone", "fundraising"],
] as const;

/** §3.1's order, top to bottom: every heading on the page, the h1 first. */
const HEADINGS = [
  "Investor portal",
  "Automatos",
  "Access",
  "Inside the portal",
  "Gerard Kavanagh",
  "Team",
  "See it working",
  "Also from Automatos",
] as const;

const insideList = () => screen.getByRole("list", { name: "Inside the portal" });

/** True when `first` comes before `second` in the document. */
function precedes(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("teaserSignIn", () => {
  it("offers the buttons once sign-in is ready, disabled while it loads", () => {
    expect(teaserSignIn("signed_out")).toEqual({ kind: "buttons", disabled: false });
    expect(teaserSignIn("loading")).toEqual({ kind: "buttons", disabled: true });
  });

  it("replaces the buttons when the sign-in service failed to load", () => {
    expect(teaserSignIn("unavailable")).toEqual({ kind: "signin_unavailable" });
  });

  it("says the portal is unavailable when there is no key", () => {
    expect(teaserSignIn("disabled")).toEqual({ kind: "portal_unavailable" });
  });
});

describe("Teaser", () => {
  it("shows the company, what's inside and the tracking notice", () => {
    renderWithProviders(<Teaser />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(strings.teaser.title);
    expect(screen.getByRole("heading", { level: 2, name: "Automatos" })).toBeInTheDocument();
    expect(screen.getByText(SPINE)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Inside the portal" })).toBeInTheDocument();
    // The primary button says what signing up is for, so the old line under "Access" is gone.
    expect(screen.queryByText(/Create an account or sign in/)).not.toBeInTheDocument();
    // The Inside list alone, in its order: each card named by its title, "Sign in to open" its description.
    const cards = within(insideList()).getAllByRole("button");
    expect(cards).toEqual(INSIDE.map((title) => within(insideList()).getByRole("button", { name: title })));
    for (const card of cards) expect(card).toHaveAccessibleDescription("Sign in to open");
    expect(within(insideList()).getAllByText("Sign in to open")).toHaveLength(INSIDE.length);
    const notice = screen.getByText(/we record which documents you open or download/);
    expect(notice).toHaveTextContent(
      "When you sign in, we record which documents you open or download and how long you spend on each page, so the team can follow up with the right information. See our Privacy Policy. Ask privacy@automatos.app to see or delete your data.",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy#investors");
    expect(screen.getByRole("link", { name: "privacy@automatos.app" })).toHaveAttribute(
      "href",
      "mailto:privacy@automatos.app",
    );
  });

  it("opens Clerk's sign-up and sign-in modals from its buttons", () => {
    const actions = fakeActions();
    renderWithProviders(<Teaser />, { actions });
    fireEvent.click(screen.getByRole("button", { name: "Create an account to read the deck" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(actions.openSignUp).toHaveBeenCalledTimes(1);
    expect(actions.openSignIn).toHaveBeenCalledTimes(1);
  });

  it("disables the buttons while sign-in loads", () => {
    renderWithProviders(<Teaser />, { auth: { status: "loading" } });
    expect(screen.getByRole("button", { name: "Create an account to read the deck" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("says sign-in is unavailable, with the contact address, when Clerk failed to load", () => {
    renderWithProviders(<Teaser />, { auth: { status: "unavailable" } });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Sign-in is unavailable right now. Email hello@automatos.app.");
    expect(screen.getByRole("link", { name: "hello@automatos.app" })).toHaveAttribute("href", "mailto:hello@automatos.app");
    expect(screen.getByText(/we record which documents/)).toBeInTheDocument();
  });

  it("says the portal is unavailable when the runtime config has no key", () => {
    renderWithProviders(<Teaser />, { auth: { status: "disabled" } });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("The investor portal is temporarily unavailable.");
    expect(screen.getByRole("link", { name: "hello@automatos.app" })).toBeInTheDocument();
  });

  it("opens Clerk's sign-in from a card under Inside the portal", () => {
    const actions = fakeActions();
    renderWithProviders(<Teaser />, { actions });
    fireEvent.click(within(insideList()).getByRole("button", { name: "Pitch deck" }));
    fireEvent.click(within(insideList()).getByRole("button", { name: "FAQ" }));
    expect(actions.openSignIn).toHaveBeenCalledTimes(2);
    expect(actions.openSignUp).not.toHaveBeenCalled();
  });

  it("disables the cards while sign-in loads", () => {
    const actions = fakeActions();
    renderWithProviders(<Teaser />, { auth: { status: "loading" }, actions });
    const cards = within(insideList()).getAllByRole("button");
    expect(cards).toHaveLength(INSIDE.length);
    for (const card of cards) expect(card).toBeDisabled();
    fireEvent.click(within(insideList()).getByRole("button", { name: "Pitch deck" }));
    expect(actions.openSignIn).not.toHaveBeenCalled();
  });

  it.each(["unavailable", "disabled"] as const)("shows plain cards when sign-in is %s", (status) => {
    renderWithProviders(<Teaser />, { auth: { status } });
    const list = insideList();
    expect(within(list).queryAllByRole("button")).toHaveLength(0);
    const items = within(list).getAllByRole("listitem");
    // Each item holds its card's title, then "Sign in to open", in the list's order.
    expect(items.map((item) => item.textContent)).toEqual(INSIDE.map((title) => `${title}Sign in to open`));
  });

  it("puts the company and Access before the founder card and the product links, the h1 first", () => {
    renderWithProviders(<Teaser />);
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual([...HEADINGS]);
    const company = screen.getByRole("heading", { level: 2, name: "Automatos" });
    const access = screen.getByRole("heading", { level: 2, name: "Access" });
    const primary = screen.getByRole("button", { name: "Create an account to read the deck" });
    const founder = screen.getByRole("heading", { level: 2, name: "Gerard Kavanagh" });
    const products = screen.getByRole("heading", { level: 2, name: "See it working" });
    expect(precedes(company, access)).toBe(true);
    expect(precedes(access, primary)).toBe(true);
    expect(precedes(primary, founder)).toBe(true);
    expect(precedes(founder, products)).toBe(true);
    expect(screen.getByRole("link", { name: /Studio/ })).toHaveAttribute("href", "https://studio.automatos.app");
    expect(screen.getByRole("link", { name: /Markets/ })).toHaveAttribute("href", "https://markets.automatos.app");
  });

  it("shows the founder's work email and the team exactly as §5.1 gives them", () => {
    renderWithProviders(<Teaser />);
    expect(screen.getByRole("link", { name: /gerard@automatos\.app/ })).toHaveAttribute(
      "href",
      "mailto:gerard@automatos.app",
    );
    const team = screen.getByRole("region", { name: "Team" });
    const entries = within(team)
      .getAllByRole("listitem")
      .map((item) => [...item.children].map((part) => part.textContent));
    expect(entries).toEqual(TEAM_ENTRIES.map(([name, role]) => [name, role]));
  });

  it("shows no LinkedIn row, no Book a call and no phone link", () => {
    const { container } = renderWithProviders(<Teaser />);
    expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /linkedin/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Book a call")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /book a call/i })).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\+?\d[\d ()-]{7,}\d/);
  });
});
