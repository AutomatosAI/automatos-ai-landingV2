import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { strings } from "@/strings";
import { fakeActions, renderWithProviders } from "@/test/providers";

import { Teaser } from "../Teaser";
import { teaserSignIn } from "../teaser-model";

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
  it("shows the pitch, what's inside and the tracking notice", () => {
    renderWithProviders(<Teaser />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(strings.teaser.title);
    expect(screen.getByText("Automatos is an open-source operating system for AI agents.")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Pitch deck", "One-pager", "Product demo", "Business model", "Team", "FAQ"]);
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
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(actions.openSignUp).toHaveBeenCalledTimes(1);
    expect(actions.openSignIn).toHaveBeenCalledTimes(1);
  });

  it("disables the buttons while sign-in loads", () => {
    renderWithProviders(<Teaser />, { auth: { status: "loading" } });
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
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
});
