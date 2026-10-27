import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setTokenSource } from "@/auth/token";

import { pageView } from "../events";
import { MAX_BATCH } from "../queue";
import { createTracker, FLUSH_INTERVAL_MS, HEARTBEAT_INTERVAL_MS, type Tracker } from "../tracker";

/*
 * The tracker with its real transport over a stubbed fetch, the real token
 * cache (@/auth/token) and fake timers. Each token the source hands out is
 * numbered, so a request shows which one it carried.
 */

const SESSION = "00000000-0000-4000-8000-00000000005e";
const DOC = "00000000-0000-4000-8000-0000000000d1";

type Answer = (path: string) => Response | Promise<Response>;

const fetchMock = vi.fn<typeof fetch>();
let answer: Answer;
let issued = 0;
let visible = true;
let tracker: Tracker;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const ok: Answer = (path) => (path === "/sessions" ? json(201, { sessionId: SESSION }) : new Response(null, { status: 204 }));

beforeEach(() => {
  vi.useFakeTimers();
  issued = 0;
  visible = true;
  answer = ok;
  setTokenSource(async () => `tok-${++issued}`);
  fetchMock.mockImplementation(async (input) => answer(String(input).replace("/api/investors", "")));
  vi.stubGlobal("fetch", fetchMock);
  tracker = createTracker({ isVisible: () => visible });
});

afterEach(() => {
  tracker.stop();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setTokenSource(null);
});

interface Sent {
  readonly path: string;
  readonly body: unknown;
  readonly init: RequestInit;
}

function sent(path: string): Sent[] {
  return fetchMock.mock.calls
    .map(([input, init = {}]) => ({ path: String(input).replace("/api/investors", ""), init }))
    .filter((call) => call.path === path)
    .map((call) => ({ ...call, body: JSON.parse(String(call.init.body)) }));
}

const header = (call: Sent | undefined, name: string) => new Headers(call?.init.headers).get(name);
const view = (page: number) => pageView(DOC, 1, page, 2000);

/** Starts the tracker and lets POST /sessions answer. */
async function started() {
  tracker.start();
  await vi.advanceTimersByTimeAsync(0);
}

describe("session", () => {
  it("opens one session on start, with the Bearer token", async () => {
    await started();
    tracker.start();
    const sessions = sent("/sessions");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.init.method).toBe("POST");
    expect(header(sessions[0], "Authorization")).toBe("Bearer tok-1");
  });

  it("sends events without a session while it cannot open one, and tries again with the next heartbeat", async () => {
    answer = (path) => (path === "/sessions" ? Promise.reject(new TypeError("offline")) : ok(path));
    await started();
    tracker.track(view(1));
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sent("/events")[0]?.body).toEqual({ events: [view(1)] });
    answer = ok;
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS - FLUSH_INTERVAL_MS);
    expect(sent("/sessions")).toHaveLength(2);
    expect(sent("/events").at(-1)?.body).toEqual({ sessionId: SESSION, heartbeat: true, events: [] });
  });

  it("does not ask again when the server refuses the investor", async () => {
    answer = (path) => (path === "/sessions" ? json(403, { error: "blocked" }) : ok(path));
    await started();
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2);
    expect(sent("/sessions")).toHaveLength(1);
    expect(sent("/events")).toEqual([]);
  });
});

describe("flush every 10 s", () => {
  it("queues events and sends them on the next tick, with a fresh token and no keepalive", async () => {
    await started();
    tracker.track(view(1));
    tracker.track(view(2));
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS - 1);
    expect(sent("/events")).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    const [batch] = sent("/events");
    expect(batch?.body).toEqual({ sessionId: SESSION, events: [view(1), view(2)] });
    expect(batch?.init).toMatchObject({ method: "POST", keepalive: false, credentials: "omit" });
    expect(header(batch, "Authorization")).toBe("Bearer tok-2");
    expect(header(batch, "Content-Type")).toBe("application/json");
  });

  it("sends nothing on a tick with nothing queued", async () => {
    await started();
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS * 2);
    expect(sent("/events")).toEqual([]);
  });

  it("sends at most 50 events a request", async () => {
    await started();
    Array.from({ length: MAX_BATCH + 3 }, (_, i) => tracker.track(view(i + 1)));
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sent("/events").map((call) => (call.body as { events: unknown[] }).events.length)).toEqual([MAX_BATCH]);
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sent("/events").map((call) => (call.body as { events: unknown[] }).events.length)).toEqual([MAX_BATCH, 3]);
  });

  it.each([
    ["a 5xx", () => new Response(null, { status: 503 })],
    ["the rate limit", () => json(429, { error: "rate_limited" })],
    ["no answer", () => Promise.reject(new TypeError("offline"))],
  ])("keeps a batch that met %s and sends it on the next tick", async (_name, failure) => {
    await started();
    answer = (path) => (path === "/events" ? failure() : ok(path));
    tracker.track(view(1));
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    answer = ok;
    tracker.track(view(2));
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sent("/events").map((call) => call.body)).toEqual([
      { sessionId: SESSION, events: [view(1)] },
      { sessionId: SESSION, events: [view(1), view(2)] },
    ]);
  });

  it("drops a batch the server refused", async () => {
    await started();
    answer = (path) => (path === "/events" ? json(400, { error: "invalid" }) : ok(path));
    tracker.track(view(1));
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS * 2);
    expect(sent("/events")).toHaveLength(1);
  });
});

describe("heartbeat every 30 s", () => {
  it("beats while the tab is visible and not while it is hidden", async () => {
    await started();
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
    expect(sent("/events").map((call) => call.body)).toEqual([{ sessionId: SESSION, heartbeat: true, events: [] }]);
    visible = false;
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2);
    expect(sent("/events")).toHaveLength(1);
  });
});

describe("leaving the page", () => {
  it("pagehide sends the whole queue at once with keepalive and the last cached token", async () => {
    await started();
    Array.from({ length: MAX_BATCH + 1 }, (_, i) => tracker.track(view(i + 1)));
    const asked = issued;
    window.dispatchEvent(new Event("pagehide"));
    const batches = sent("/events");
    expect(batches.map((call) => (call.body as { events: unknown[] }).events.length)).toEqual([MAX_BATCH, 1]);
    for (const batch of batches) {
      expect(batch.init).toMatchObject({ method: "POST", keepalive: true, credentials: "omit" });
      expect(header(batch, "Authorization")).toBe("Bearer tok-1");
      expect(batch.body).toMatchObject({ sessionId: SESSION });
    }
    expect(issued).toBe(asked);
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sent("/events")).toHaveLength(2);
  });

  it("a hidden tab flushes too: visibilitychange bubbles from the document to window", async () => {
    await started();
    tracker.track(view(1));
    visible = false;
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    expect(sent("/events")).toMatchObject([{ init: { keepalive: true }, body: { events: [view(1)] } }]);
  });

  it("refreshes the cached token every tick, so pagehide carries a fresh one", async () => {
    await started();
    expect(header(sent("/sessions")[0], "Authorization")).toBe("Bearer tok-1");
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS * 2);
    expect(issued).toBe(3);
    tracker.track(view(1));
    window.dispatchEvent(new Event("pagehide"));
    expect(header(sent("/events")[0], "Authorization")).toBe("Bearer tok-3");
  });

  it("keeps the queue when there is no token yet", async () => {
    setTokenSource(null);
    tracker.track(view(1));
    window.dispatchEvent(new Event("pagehide"));
    tracker.start();
    window.dispatchEvent(new Event("pagehide"));
    expect(sent("/events")).toEqual([]);
    setTokenSource(async () => `tok-${++issued}`);
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sent("/events")[0]?.body).toEqual({ events: [view(1)] });
  });
});

describe("stop", () => {
  it("drops the queue, stops the timers and listeners, and refuses new events", async () => {
    await started();
    tracker.track(view(1));
    tracker.stop();
    tracker.track(view(2));
    window.dispatchEvent(new Event("pagehide"));
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2);
    expect(sent("/events")).toEqual([]);
    tracker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent("/sessions")).toHaveLength(1);
  });

  it("does not send a batch it took before stopping", async () => {
    let release: (token: string) => void = () => undefined;
    await started();
    setTokenSource(() => new Promise<string>((resolve) => (release = resolve)));
    tracker.track(view(1));
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    tracker.stop();
    release("tok-late");
    await vi.advanceTimersByTimeAsync(0);
    expect(sent("/events")).toEqual([]);
  });
});
