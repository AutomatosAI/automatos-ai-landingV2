import { screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { ADA_ME, NEW_ADA } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

import { App } from "../App";

const fetchMock = vi.fn<typeof fetch>();

/** /me answers `body` with `status`; the library pages' GET /documents answers an empty list. */
function answerMe(status: number, body: unknown) {
  fetchMock.mockImplementation(async (url) =>
    String(url) === "/api/investors/documents"
      ? new Response(JSON.stringify({ documents: [] }), { status: 200 })
      : new Response(JSON.stringify(body), { status }),
  );
}

const me = (profileComplete: boolean) => (profileComplete ? ADA_ME : NEW_ADA);

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderApp(path: string, auth = ADA) {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth },
  );
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

describe("App, signed out", () => {
  it("renders the shell header and the teaser at the root", () => {
    renderApp("/", { status: "signed_out" });
    const banner = screen.getByRole("banner");
    expect(banner).toHaveTextContent(strings.shell.wordmark);
    expect(banner).toHaveTextContent(strings.shell.section);
    expect(screen.getByRole("link", { name: strings.shell.homeLabel })).toHaveAttribute("href", "/");
    expect(screen.getByText(strings.teaser.pitch)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: strings.auth.accountMenu })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the teaser for any path under the app", () => {
    renderApp("/documents/abc", { status: "signed_out" });
    expect(screen.getByText(strings.teaser.pitch)).toBeInTheDocument();
  });

  it("shows the teaser with its buttons disabled while sign-in loads", () => {
    renderApp("/", { status: "loading" });
    expect(screen.getByText(strings.teaser.pitch)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: strings.auth.signIn })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the teaser with the unavailable message when there is no key", () => {
    renderApp("/", { status: "disabled" });
    expect(screen.getByRole("status")).toHaveTextContent(strings.status.unavailable.body);
  });
});

describe("App, signed in", () => {
  it("asks /me with the token and sends a new investor to the profile form", async () => {
    answerMe(200, me(false));
    renderApp("/");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/profile"));
    expect(fetchMock).toHaveBeenCalledWith("/api/investors/me", expect.objectContaining({ method: "GET" }));
    expect(screen.getByRole("heading", { level: 1, name: strings.profile.firstTitle })).toBeInTheDocument();
  });

  it.each(["/documents", "/documents/abc", "/admin"])("sends a new investor from %s to the profile form", async (path) => {
    answerMe(200, me(false));
    renderApp(path);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/profile"));
    expect(screen.getByRole("heading", { level: 1, name: strings.profile.firstTitle })).toBeInTheDocument();
  });

  it("shows an investor with a profile the edit form at /profile", async () => {
    answerMe(200, me(true));
    renderApp("/profile");
    expect(await screen.findByRole("heading", { level: 1, name: strings.profile.editTitle })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/profile");
  });

  it("lets an investor with a profile stay on the page they asked for", async () => {
    answerMe(200, me(true));
    renderApp("/documents");
    await screen.findByRole("heading", { level: 1, name: strings.library.title });
    expect(screen.getByTestId("where")).toHaveTextContent("/documents");
  });

  it("shows an investor with a profile the home page at the root", async () => {
    answerMe(200, me(true));
    renderApp("/");
    expect(await screen.findByRole("heading", { level: 1, name: strings.home.title })).toBeInTheDocument();
    expect(screen.getByText(strings.home.intro)).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/);
  });

  it("sends an unknown path home", async () => {
    answerMe(200, me(true));
    renderApp("/no-such-page");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/));
    expect(await screen.findByRole("heading", { level: 1, name: strings.home.title })).toBeInTheDocument();
  });

  it("shows the account menu", async () => {
    answerMe(200, me(true));
    renderApp("/");
    expect(await screen.findByRole("button", { name: strings.auth.accountMenu })).toBeInTheDocument();
  });

  it.each([
    [404, { error: "not_found" }],
    [503, { error: "portal_unavailable", state: "starting" }],
  ])("shows the unavailable screen when /me answers %i", async (status, body) => {
    answerMe(status, body);
    renderApp("/");
    expect(await screen.findByRole("heading", { name: strings.status.unavailable.title })).toBeInTheDocument();
    expect(screen.getByText(strings.status.unavailable.body)).toBeInTheDocument();
  });

  it("shows the blocked screen for a blocked investor", async () => {
    answerMe(403, { error: "blocked" });
    renderApp("/");
    expect(await screen.findByRole("heading", { name: strings.status.blocked.title })).toBeInTheDocument();
    expect(screen.getByText(/Your access has been paused\. Contact/)).toHaveTextContent(
      "Your access has been paused. Contact privacy@automatos.app.",
    );
  });

  it("asks the investor to sign in again on a 401", async () => {
    answerMe(401, { error: "unauthenticated" });
    renderApp("/");
    expect(await screen.findByRole("heading", { name: strings.status.signIn.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: strings.auth.signIn })).toBeInTheDocument();
  });
});
