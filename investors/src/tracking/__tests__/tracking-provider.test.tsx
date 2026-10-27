import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "@/auth/context";
import { setTokenSource } from "@/auth/token";
import type { AuthState } from "@/auth/types";
import { ADA, fakeActions, SIGNED_OUT } from "@/test/providers";

import { useTracker } from "../context";
import { TrackingProvider } from "../TrackingProvider";
import { usePageViewFeed } from "../use-page-view-feed";

const SESSION = "00000000-0000-4000-8000-00000000005e";
const DOC = "00000000-0000-4000-8000-0000000000d1";
const BEA: AuthState = { status: "signed_in", userId: "user_bea", email: "bea@example.com" };

const fetchMock = vi.fn<typeof fetch>();
const actions = fakeActions();

/** Reads one page through the viewer's feed, as the PDF viewer would. */
function Reader() {
  const tracker = useTracker();
  const onPageVisible = usePageViewFeed(DOC, 3);
  return (
    <>
      <p data-testid="tracking">{tracker === null ? "off" : "on"}</p>
      <button type="button" disabled={!onPageVisible} onClick={() => onPageVisible?.(2, 1500)}>
        read
      </button>
    </>
  );
}

const tree = (state: AuthState) => (
  <AuthContext.Provider value={{ state, actions }}>
    <TrackingProvider>
      <Reader />
    </TrackingProvider>
  </AuthContext.Provider>
);

const posts = (path: string) =>
  fetchMock.mock.calls.filter(([input]) => String(input) === `/api/investors${path}`).map(([, init]) => init ?? {});

beforeEach(() => {
  setTokenSource(async () => "tok_ada");
  fetchMock.mockImplementation(async (input) =>
    String(input).endsWith("/sessions")
      ? new Response(JSON.stringify({ sessionId: SESSION }), { status: 201 })
      : new Response(null, { status: 204 }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("TrackingProvider", () => {
  it("does nothing while signed out", () => {
    render(tree(SIGNED_OUT));
    expect(screen.getByTestId("tracking")).toHaveTextContent("off");
    expect(screen.getByRole("button", { name: "read" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts after sign-in, and the viewer's feed queues a page_view of the document version", async () => {
    render(tree(ADA));
    expect(await screen.findByText("on")).toBeInTheDocument();
    await act(async () => undefined);
    expect(posts("/sessions")).toHaveLength(1);
    act(() => screen.getByRole("button", { name: "read" }).click());
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    const [flush] = posts("/events");
    expect(flush?.keepalive).toBe(true);
    expect(JSON.parse(String(flush?.body))).toEqual({
      sessionId: SESSION,
      events: [{ type: "page_view", documentId: DOC, documentVersion: 3, page: 2, durationMs: 1500 }],
    });
  });

  it("stops on sign-out and starts afresh for the next account, without the last one's queue", async () => {
    const view = render(tree(ADA));
    await screen.findByText("on");
    act(() => screen.getByRole("button", { name: "read" }).click());
    view.rerender(tree(SIGNED_OUT));
    expect(screen.getByTestId("tracking")).toHaveTextContent("off");
    view.rerender(tree(BEA));
    await screen.findByText("on");
    await act(async () => undefined);
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(posts("/sessions")).toHaveLength(2);
    expect(posts("/events")).toEqual([]);
  });
});
