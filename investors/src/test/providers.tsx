import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { AuthContext } from "@/auth/context";
import type { AuthActions, AuthState } from "@/auth/types";
import { ROUTER_FUTURE } from "@/lib/paths";

export const SIGNED_OUT: AuthState = { status: "signed_out" };
export const ADA: AuthState = { status: "signed_in", userId: "user_ada", email: "ada@example.com" };

export function fakeActions(): AuthActions {
  return { openSignIn: vi.fn(), openSignUp: vi.fn(), signOut: vi.fn(async () => undefined) };
}

interface RenderOptions {
  readonly path?: string;
  readonly auth?: AuthState;
  readonly actions?: AuthActions;
}

/** The app's providers, with the auth seam's value given directly (no Clerk) and no retries. */
export function renderWithProviders(ui: ReactElement, { path = "/", auth = SIGNED_OUT, actions }: RenderOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const value = { state: auth, actions: actions ?? fakeActions() };
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
          {ui}
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}
