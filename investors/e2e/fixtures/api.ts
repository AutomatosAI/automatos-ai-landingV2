import type { Page, Request, Route } from "@playwright/test";

import type { Me } from "../../src/api/me";
import { DEFAULT_FAKE_SESSION, FAKE_AUTH_STORAGE_KEY, fakeToken } from "../../src/auth/fake-session";
import { ADMIN_ME, ADA_ME, NEW_ADA } from "../../src/test/fixtures";

import {
  ADA_DETAIL,
  ADA_ID,
  ADA_TIMELINE,
  ADMIN_DOCUMENTS,
  DECK_ID,
  DEMO_ID,
  INVESTORS,
  LIBRARY,
  MEMO_ID,
  OVERVIEW,
  PITCH_VIDEO_ID,
  SESSION_ID,
} from "./data";
import { twoPagePdf } from "./pdf";
import { ADMIN_SECTIONS, SECTIONS } from "./sections";
import { MEMO_STATS } from "./stats";

/*
 * The whole outside world of the e2e build (KP10): the runtime config the
 * site server would write, every /api/investors call, and the storage link
 * the viewer loads. Nothing reaches a real API, Clerk or S3.
 */

export const API_PREFIX = "/api/investors";

/** Where the mocked storage link points: same origin as the app, answered by page.route. */
export const PDF_PATH = "/e2e-storage/example-deck.pdf";

/** The videos' storage link (the demo and the pitch video): answered only by routeVideo, as the spec needs it. */
export const VIDEO_PATH = "/e2e-storage/example-demo.mp4";

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

/** A storage link to `path`, on the page's own origin. */
function storageLink(path: string): (request: Request) => Reply {
  return (request) => ok({ url: new URL(path, request.url()).href, expiresIn: 300 });
}

/** The key the viewer's link request for a document is answered at. */
export const linkKey = (documentId: string) => `POST /documents/${documentId}/link`;

/** A link request for any document: the server records an open for each (KP16, KP20). */
export const isLinkKey = (key: string) => /^POST \/documents\/[^/]+\/link$/.test(key);

const INVESTOR_ROUTES: ApiRoutes = {
  "POST /sessions": { status: 201, body: { sessionId: SESSION_ID } },
  "POST /events": { status: 204 },
  "GET /documents": ok({ documents: LIBRARY }),
  // Every page past the profile asks for them (the sidebar's Team, Story, FAQ and Contact links).
  "GET /sections": ok({ sections: SECTIONS }),
  [linkKey(DECK_ID)]: storageLink(PDF_PATH),
  [linkKey(DEMO_ID)]: storageLink(VIDEO_PATH),
  [linkKey(PITCH_VIDEO_ID)]: storageLink(VIDEO_PATH),
};

const ADMIN_ROUTES: ApiRoutes = {
  "GET /admin/overview": ok(OVERVIEW),
  "GET /admin/documents": ok({ documents: ADMIN_DOCUMENTS }),
  "GET /admin/investors": ok(INVESTORS),
  [`GET /admin/investors/${ADA_ID}`]: ok(ADA_DETAIL),
  [`GET /admin/investors/${ADA_ID}/events`]: ok(ADA_TIMELINE),
  "GET /admin/sections": ok({ sections: ADMIN_SECTIONS }),
  [`GET /admin/documents/${MEMO_ID}/stats`]: ok(MEMO_STATS),
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
  /** Every API call ('METHOD /path'), answered or not, oldest first. */
  readonly calls: () => readonly string[];
  /** API calls no route answered ('METHOD /path'): each got a 404, and a spec should expect none. */
  readonly unmocked: () => readonly string[];
  /** The JSON bodies of the calls answered at `key` ('METHOD /path'), oldest first; null for a call without one. */
  readonly bodies: (key: string) => readonly unknown[];
}

interface AnsweredCall {
  readonly key: string;
  readonly body: string | null;
}

/**
 * Serves /_config.js, the deck's PDF and every /api/investors call. A call
 * without the fake session's Bearer token gets 401, as the server would.
 * `overrides` replace or add answers for one spec (an outage, say).
 */
export async function mockPortal(page: Page, visitor: Visitor, overrides: ApiRoutes = {}): Promise<MockedApi> {
  const routes = { ...portalRoutes(visitor), ...overrides };
  let seen: readonly string[] = [];
  let missed: readonly string[] = [];
  let answered: readonly AnsweredCall[] = [];
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
      const key = routeKey(request);
      seen = [...seen, key];
      if (request.headers()["authorization"] !== BEARER) return fulfill(route, { status: 401, body: { error: "unauthenticated" } });
      const answer = routes[key];
      if (answer === undefined) {
        missed = [...missed, key];
        return fulfill(route, { status: 404, body: { error: "not_found" } });
      }
      answered = [...answered, { key, body: request.postData() }];
      return fulfill(route, typeof answer === "function" ? answer(request) : answer);
    },
  );
  return {
    calls: () => seen,
    unmocked: () => missed,
    bodies: (key) => answered.filter((call) => call.key === key).map((call) => (call.body === null ? null : JSON.parse(call.body))),
  };
}

/**
 * How storage answers the video's link: "hold" never answers, so the player
 * waits with its controls (Playwright's Chromium lacks the proprietary
 * codecs an MP4 needs, and no video file sits in the repo, KP5); "refuse"
 * answers 403, as storage does an expired link.
 */
export async function routeVideo(page: Page, answer: "hold" | "refuse"): Promise<void> {
  await page.route(
    (url) => url.pathname === VIDEO_PATH,
    (route) => (answer === "refuse" ? route.fulfill({ status: 403, body: "" }) : undefined),
  );
}

/** Starts the page signed in as the fake session (the e2e build's stand-in for Clerk, KP10). */
export async function signIn(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: FAKE_AUTH_STORAGE_KEY, value: JSON.stringify(DEFAULT_FAKE_SESSION) },
  );
}
