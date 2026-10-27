import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import type { Me } from "@/api/me";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { ADA_ME, NEW_ADA } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

const fields = strings.profile.fields;
const fetchMock = vi.fn<typeof fetch>();

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** GET /me answers `me`; PUT /me answers `put`. */
function serve(me: Me, put: () => Response = () => json(200, { ...me, profileComplete: true })) {
  fetchMock.mockImplementation(async (_url, init) => (init?.method === "PUT" ? put() : json(200, me)));
}

function putCalls() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderProfile() {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path: "/profile", auth: ADA },
  );
}

const change = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillRequired() {
  change(fields.firm.label, "Example Ventures");
  change(fields.investorType.label, "angel");
  change(fields.source.label, "intro");
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

describe("the profile form, first visit", () => {
  it("prefills the name, hints the firm, leaves the opt-in unticked and shows the tracking notice", async () => {
    serve(NEW_ADA);
    renderProfile();
    expect(await screen.findByRole("heading", { level: 1, name: strings.profile.firstTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(fields.name.label)).toHaveValue("Ada Example");
    expect(screen.getByLabelText(fields.firm.label)).toHaveAttribute("placeholder", "Firm or Independent");
    const optIn = screen.getByRole("checkbox", { name: "Send me Automatos investor updates (optional)" });
    expect(optIn).not.toBeChecked();
    expect(screen.getByRole("option", { name: "Venture capital" })).toBeInTheDocument();
    expect(screen.getByText(/we record which documents you open or download/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: strings.profile.saveFirst })).toBeEnabled();
  });

  it("shows the missing fields without asking the server", async () => {
    serve(NEW_ADA);
    renderProfile();
    fireEvent.click(await screen.findByRole("button", { name: strings.profile.saveFirst }));
    expect(screen.getByRole("alert")).toHaveTextContent(strings.profile.checkFields);
    expect(screen.getByLabelText(fields.firm.label)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(fields.firm.label)).toHaveAccessibleDescription(strings.profile.errors.required);
    expect(screen.getByLabelText(fields.firm.label)).toHaveFocus();
    expect(putCalls()).toHaveLength(0);
  });

  it("shows the server's field error under its field", async () => {
    serve(NEW_ADA, () => json(400, { error: "invalid", fields: { linkedinUrl: "linkedin_url" } }));
    renderProfile();
    await screen.findByLabelText(fields.name.label);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: strings.profile.saveFirst }));
    const linkedin = screen.getByLabelText(/LinkedIn/);
    await waitFor(() => expect(linkedin).toHaveAccessibleDescription(strings.profile.errors.linkedinUrl));
    expect(linkedin).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("where")).toHaveTextContent("/profile");
  });

  it("saves with PUT /me and goes home", async () => {
    serve(NEW_ADA);
    renderProfile();
    await screen.findByLabelText(fields.name.label);
    fillRequired();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: strings.profile.saveFirst }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/));
    // The saved answer opened the profile gate: home stays home.
    expect(await screen.findByRole("heading", { level: 1, name: strings.placeholder.title })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/);
    expect(putCalls()).toHaveLength(1);
    const [url, init] = putCalls()[0] ?? [];
    expect(url).toBe("/api/investors/me");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Ada Example",
      firm: "Example Ventures",
      title: null,
      investorType: "angel",
      chequeSize: null,
      linkedinUrl: null,
      country: null,
      source: "intro",
      marketingOptIn: true,
    });
  });
});

describe("the profile form, editing", () => {
  it("starts from the saved profile, says when it is saved and stays on the page", async () => {
    serve(ADA_ME, () => json(200, ADA_ME));
    renderProfile();
    expect(await screen.findByRole("heading", { level: 1, name: strings.profile.editTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(fields.firm.label)).toHaveValue("Example Ventures");
    fireEvent.click(screen.getByRole("button", { name: strings.profile.save }));
    expect(await screen.findByRole("status")).toHaveTextContent(strings.profile.saved);
    expect(screen.getByTestId("where")).toHaveTextContent("/profile");
  });

  it("says so when saving too often", async () => {
    serve(ADA_ME, () => json(429, { error: "rate_limited" }));
    renderProfile();
    fireEvent.click(await screen.findByRole("button", { name: strings.profile.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(strings.profile.rateLimited);
  });
});
