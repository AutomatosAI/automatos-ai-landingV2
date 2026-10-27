import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import type { Me } from "@/api/me";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { MOOD_STORAGE_KEY } from "@/theme/mood";
import { ADA_ME, ADMIN_ME, NEW_ADA } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

const nav = strings.nav;
const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** GET /me answers `me`; every list answers empty. */
function serve(me: Me) {
  fetchMock.mockImplementation(async (input) =>
    String(input).endsWith("/me") ? json(200, me) : json(200, { documents: [] }),
  );
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderPortal(me: Me, path = "/") {
  serve(me);
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth: ADA },
  );
}

/** The sidebar's links (the sheet's nav exists only while it is open). */
const sidebarLinks = () =>
  within(screen.getByRole("complementary")).getAllByRole("link").map((link) => link.textContent);

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_ada");
  window.localStorage.clear();
  document.body.setAttribute("data-mood", "bone");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
  document.body.removeAttribute("data-mood");
});

describe("the portal's sidebar", () => {
  it("links Home, Documents and Profile, marks the current page and keeps the account menu", async () => {
    renderPortal(ADA_ME, "/documents");
    await screen.findByRole("heading", { level: 1, name: strings.library.title });
    expect(sidebarLinks()).toEqual([nav.home, nav.documents, nav.profile]);
    const sidebar = within(screen.getByRole("complementary"));
    expect(sidebar.getByRole("link", { name: nav.documents })).toHaveAttribute("aria-current", "page");
    expect(sidebar.getByRole("link", { name: nav.home })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: strings.auth.accountMenu })).toBeInTheDocument();
  });

  it("adds Admin for an admin", async () => {
    renderPortal(ADMIN_ME);
    await screen.findByRole("heading", { level: 1, name: strings.home.title });
    expect(sidebarLinks()).toEqual([nav.home, nav.documents, nav.profile, nav.admin]);
  });

  it("follows a link", async () => {
    renderPortal(ADA_ME);
    await screen.findByRole("heading", { level: 1, name: strings.home.title });
    fireEvent.click(within(screen.getByRole("complementary")).getByRole("link", { name: nav.profile }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/profile"));
    expect(await screen.findByRole("heading", { level: 1, name: strings.profile.editTitle })).toBeInTheDocument();
  });

  it("shows no links on the first-visit profile form", async () => {
    renderPortal(NEW_ADA);
    await screen.findByRole("heading", { level: 1, name: strings.profile.firstTitle });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: nav.openMenu })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: strings.auth.accountMenu })).toBeInTheDocument();
  });
});

describe("the phone menu", () => {
  it("opens a sheet with the same links and closes once one is followed", async () => {
    renderPortal(ADMIN_ME);
    await screen.findByRole("heading", { level: 1, name: strings.home.title });
    fireEvent.click(screen.getByRole("button", { name: nav.openMenu }));
    const sheet = await screen.findByRole("dialog", { name: nav.menu });
    const links = within(sheet).getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual([nav.home, nav.documents, nav.profile, nav.admin]);
    fireEvent.click(within(sheet).getByRole("link", { name: nav.documents }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("where")).toHaveTextContent("/documents");
  });
});

describe("the mood switch", () => {
  it("switches between bone and pitch and saves the choice where the site keeps it", async () => {
    renderPortal(ADA_ME);
    await screen.findByRole("heading", { level: 1, name: strings.home.title });
    const sidebar = within(screen.getByRole("complementary"));
    fireEvent.click(sidebar.getByRole("button", { name: strings.mood.toPitch }));
    expect(document.body.dataset.mood).toBe("pitch");
    expect(window.localStorage.getItem(MOOD_STORAGE_KEY)).toBe("pitch");
    const back = await sidebar.findByRole("button", { name: strings.mood.toBone });
    expect(back).toHaveTextContent(strings.mood.pitch);
    fireEvent.click(back);
    expect(document.body.dataset.mood).toBe("bone");
    expect(window.localStorage.getItem(MOOD_STORAGE_KEY)).toBe("bone");
  });

  it("follows a change made elsewhere (another tab, the system)", async () => {
    renderPortal(ADA_ME);
    await screen.findByRole("heading", { level: 1, name: strings.home.title });
    document.body.setAttribute("data-mood", "pitch");
    expect(
      await within(screen.getByRole("complementary")).findByRole("button", { name: strings.mood.toBone }),
    ).toBeInTheDocument();
  });
});
