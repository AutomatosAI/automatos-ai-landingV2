import type { Page, Request, Route } from "@playwright/test";

import type { Me } from "../../src/api/me";
import { DEFAULT_FAKE_SESSION, FAKE_AUTH_STORAGE_KEY, fakeToken } from "../../src/auth/fake-session";
import { ADMIN_ME, ADA_ME, NEW_ADA } from "../../src/test/fixtures";

import { ADA_DETAIL, ADA_ID, ADA_TIMELINE, ADMIN_DOCUMENTS, DECK_ID, INVESTORS, LIBRARY, OVERVIEW, SESSION_ID } from "./data";
import { twoPagePdf } from "./pdf";

/*
 * The whole outside world of the e2e build (KP10): the runtime config the
 * site server would write, every /api/investors call, and the storage link
 * the viewer loads. Nothing reaches a real API, Clerk or S3.
 */

export const API_PREFIX = "/api/investors";

/** Where the mocked storage link points: same origin as the app, answered by page.route. */
export const PDF_PATH = "/e2e-storage/example-deck.pdf";

/** Clerk's format check passes (config.ts); nothing ever calls Clerk in the e2e build. */
const PLACEHOLDER_KEY = `pk_test_${btoa("example.clerk.accounts.dev$")}`;

/** What /_config.js says in production (server.js hydrateConfig), with the placeholder key. */
const CONFIG_SCRIPT = `window.AUTOMATOS_CONFIG = ${JSON.stringify({ clerkPublishableKey: PLACEHOLDER_KEY })};\n`;

const BEARER = `Bearer ${fakeToken(DEFAULT_FAKE_SESSION)}`;

export interface Reply {
  readonly status: number;
  readonly body?: unknown;
}

/** 'METHOD /path' under the API prefix, without the query string → the answer. */
export type ApiRoutes = Readonly<Record<string, Reply | ((request: Request) => Reply)>>;

/** Who the signed-in visitor is, as GET /me answers. */
export type Visitor = "new_investor" | "investor" | "admin";

const ME: Record<Visitor, Me> = { new_investor: NEW_ADA, investor: ADA_ME, admin: ADMIN_ME };

const ok = (body: unknown): Reply => ({ status: 200, body });

/** The storage link for the deck, on the page's own origin. */
function deckLink(request: Request): Reply {
  return ok({ url: new URL(PDF_PATH, request.url()).href, expiresIn: 300 });
}

const INVESTOR_ROUTES: ApiRoutes = {
  "POST /sessions": { status: 201, body: { sessionId: SESSION_ID } },
  "POST /events": { status: 204 },
  "GET /documents": ok({ documents: LIBRARY }),
  [`POST /documents/${DECK_ID}/link`]: deckLink,
};

const ADMIN_ROUTES: ApiRoutes = {
  "GET /admin/overview": ok(OVERVIEW),
  "GET /admin/documents": ok({ documents: ADMIN_DOCUMENTS }),
  "GET /admin/investors": ok(INVESTORS),
  [`GET /admin/investors/${ADA_ID}`]: ok(ADA_DETAIL),
  [`GET /admin/investors/${ADA_ID}/events`]: ok(ADA_TIMELINE),
};

/**
 * Every call a signed-in page makes, with the invented data. The admin
 * routes exist only for the admin, so a non-admin page that calls one shows
 * up in unmocked().
 */
function portalRoutes(visitor: Visitor): ApiRoutes {
  const routes = { "GET /me": ok(ME[visitor]), ...INVESTOR_ROUTES };
  return visitor === "admin" ? { ...routes, ...ADMIN_ROUTES } : routes;
}

function routeKey(request: Request): string {
  const { pathname } = new URL(request.url());
  return `${request.method()} ${pathname.slice(API_PREFIX.length)}`;
}

async function fulfill(route: Route, reply: Reply): Promise<void> {
  if (reply.body === undefined) return route.fulfill({ status: reply.status });
  return route.fulfill({ status: reply.status, json: reply.body });
}

export interface MockedApi {
  /** API calls no route answered ('METHOD /path'): each got a 404, and a spec should expect none. */
  readonly unmocked: () => readonly string[];
}

/**
 * Serves /_config.js, the deck's PDF and every /api/investors call. A call
 * without the fake session's Bearer token gets 401, as the server would.
 */
export async function mockPortal(page: Page, visitor: Visitor): Promise<MockedApi> {
  const routes = portalRoutes(visitor);
  let missed: readonly string[] = [];
  await page.route("**/_config.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: CONFIG_SCRIPT }),
  );
  await page.route(`**${PDF_PATH}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/pdf", body: twoPagePdf() }),
  );
  await page.route(
    (url) => url.pathname.startsWith(`${API_PREFIX}/`),
    (route) => {
      const request = route.request();
      if (request.headers()["authorization"] !== BEARER) return fulfill(route, { status: 401, body: { error: "unauthenticated" } });
      const key = routeKey(request);
      const answer = routes[key];
      if (answer === undefined) {
        missed = [...missed, key];
        return fulfill(route, { status: 404, body: { error: "not_found" } });
      }
      return fulfill(route, typeof answer === "function" ? answer(request) : answer);
    },
  );
  return { unmocked: () => missed };
}

/** Starts the page signed in as the fake session (the e2e build's stand-in for Clerk, KP10). */
export async function signIn(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: FAKE_AUTH_STORAGE_KEY, value: JSON.stringify(DEFAULT_FAKE_SESSION) },
  );
}
