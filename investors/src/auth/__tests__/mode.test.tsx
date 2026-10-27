import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The E2E switch (KP10): only VITE_INVESTORS_E2E === '1' swaps Clerk for the
 * fake. Each case re-imports the seam so the flag is read afresh.
 */

const KEY = `pk_test_${btoa("example.clerk.accounts.dev$")}`;

async function loadSeam() {
  vi.resetModules();
  const [{ AUTH_MODE }, { AuthProvider }, context, token, fake] = await Promise.all([
    import("../mode"),
    import("../AuthProvider"),
    import("../context"),
    import("../token"),
    import("../fake-session"),
  ]);
  return { AUTH_MODE, AuthProvider, ...context, ...token, ...fake };
}

type Seam = Awaited<ReturnType<typeof loadSeam>>;

function Probe({ seam }: { seam: Seam }) {
  const state = seam.useAuthState();
  const actions = seam.useAuthActions();
  return (
    <div>
      <p data-testid="status">{state.status}</p>
      {state.status === "signed_in" && <p data-testid="email">{state.email}</p>}
      <button onClick={actions.openSignIn}>in</button>
      <button onClick={() => void actions.signOut()}>out</button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
});

describe("AUTH_MODE", () => {
  it.each([undefined, "", "0", "true", "1 "])("uses Clerk when the flag is %j", async (flag) => {
    if (flag !== undefined) vi.stubEnv("VITE_INVESTORS_E2E", flag);
    expect((await loadSeam()).AUTH_MODE).toBe("clerk");
  });

  it("uses the fake when the flag is exactly '1' (the e2e build)", async () => {
    vi.stubEnv("VITE_INVESTORS_E2E", "1");
    expect((await loadSeam()).AUTH_MODE).toBe("fake");
  });
});

describe("AuthProvider", () => {
  it("is disabled without a key, whatever the mode", async () => {
    vi.stubEnv("VITE_INVESTORS_E2E", "1");
    const seam = await loadSeam();
    render(
      <seam.AuthProvider publishableKey={null}>
        <Probe seam={seam} />
      </seam.AuthProvider>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("disabled");
    expect(await seam.getToken()).toBeNull();
  });

  it("in the e2e build signs in and out without Clerk, keyed by the marker", async () => {
    vi.stubEnv("VITE_INVESTORS_E2E", "1");
    const seam = await loadSeam();
    render(
      <seam.AuthProvider publishableKey={KEY}>
        <Probe seam={seam} />
      </seam.AuthProvider>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("signed_out");
    expect(await seam.getToken()).toBeNull();

    act(() => screen.getByText("in").click());
    expect(screen.getByTestId("status")).toHaveTextContent("signed_in");
    expect(screen.getByTestId("email")).toHaveTextContent("ada@example.com");
    expect(window.localStorage.getItem("INVESTORS_E2E_FAKE_AUTH")).toContain("user_e2e_ada");
    expect(await seam.getToken()).toBe("e2e.user_e2e_ada");
    expect(seam.lastToken()).toBe("e2e.user_e2e_ada");

    await act(async () => screen.getByText("out").click());
    expect(screen.getByTestId("status")).toHaveTextContent("signed_out");
    expect(window.localStorage.getItem("INVESTORS_E2E_FAKE_AUTH")).toBeNull();
    expect(await seam.getToken()).toBeNull();
  });

  it("in the e2e build starts signed in from a session Playwright stored", async () => {
    vi.stubEnv("VITE_INVESTORS_E2E", "1");
    window.localStorage.setItem(
      "INVESTORS_E2E_FAKE_AUTH",
      JSON.stringify({ userId: "user_e2e_admin", email: "admin@example.com" }),
    );
    const seam = await loadSeam();
    render(
      <seam.AuthProvider publishableKey={KEY}>
        <Probe seam={seam} />
      </seam.AuthProvider>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("signed_in");
    expect(screen.getByTestId("email")).toHaveTextContent("admin@example.com");
    expect(await seam.getToken()).toBe("e2e.user_e2e_admin");
  });

  it("names the marker the gate greps for", async () => {
    const seam = await loadSeam();
    expect(seam.FAKE_AUTH_MARKER).toBe("INVESTORS_E2E_FAKE_AUTH");
    expect(seam.FAKE_AUTH_STORAGE_KEY).toBe(seam.FAKE_AUTH_MARKER);
  });
});
