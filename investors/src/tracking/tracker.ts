import { getToken, lastToken } from "@/auth";

import { batchOf, type EventBatch, type TrackedEvent } from "./events";
import { allBatches, EMPTY_QUEUE, enqueue, requeue, takeBatch, type Queue } from "./queue";
import { openSession, postEvents, sessionRefused, type SendOutcome } from "./transport";

/*
 * The reading tracker (US-010), adapted from the reference portal's activity
 * tracker (KP12): its session and heartbeat idea, none of its data access.
 * The server decides who the investor is, from the token; nothing here names
 * them.
 *
 * After sign-in it opens a session (POST /sessions), heartbeats every 30 s
 * while the tab is visible, queues events and flushes them every 10 s. When
 * the tab is hidden or the page goes (pagehide) the queue leaves at once with
 * fetch keepalive and the last token seen: no time to ask for a fresh one.
 * Clerk's tokens live about a minute, so every 10 s tick asks for one even
 * with nothing to send, which keeps that cached token fresh.
 *
 * pagehide and visibilitychange are heard on window. visibilitychange fires
 * at the document and bubbles, so the viewer's own listener (on document)
 * has already reported the page being read when the tracker flushes.
 *
 * Failures are quiet: the portal works the same without tracking. A batch
 * that met no answer, a 5xx or the rate limit goes back in the queue; one
 * the server refused is dropped. A session that could not be opened is
 * tried again with the next heartbeat, unless the server refused it.
 */

export const FLUSH_INTERVAL_MS = 10_000;
export const HEARTBEAT_INTERVAL_MS = 30_000;

export interface Tracker {
  /** Opens the session and starts the timers and listeners. */
  start(): void;
  /** Stops for good and drops what is queued: the next account must not send it. */
  stop(): void;
  /** Queues an event for the next flush. */
  track(event: TrackedEvent): void;
}

export interface TrackerDeps {
  readonly openSession: () => Promise<string>;
  readonly postEvents: (batch: EventBatch, token: string, keepalive: boolean) => Promise<SendOutcome>;
  /** A fresh token (and the one lastToken() then answers). */
  readonly getToken: () => Promise<string | null>;
  readonly lastToken: () => string | null;
  readonly isVisible: () => boolean;
  /** Where pagehide and visibilitychange are heard. */
  readonly target: EventTarget;
}

type SessionState = "none" | "opening" | "open" | "refused";

function defaultDeps(): TrackerDeps {
  return {
    openSession,
    postEvents,
    getToken,
    lastToken,
    isVisible: () => document.visibilityState === "visible",
    target: window,
  };
}

class ReadingTracker implements Tracker {
  private readonly deps: TrackerDeps;
  private queue: Queue = EMPTY_QUEUE;
  private sessionId: string | null = null;
  private session: SessionState = "none";
  private running = false;
  private stopped = false;
  private timers: readonly ReturnType<typeof setInterval>[] = [];

  constructor(deps: TrackerDeps) {
    this.deps = deps;
  }

  start(): void {
    if (this.running || this.stopped) return;
    this.running = true;
    void this.ensureSession();
    this.timers = [
      setInterval(() => void this.tick(), FLUSH_INTERVAL_MS),
      setInterval(() => void this.heartbeat(), HEARTBEAT_INTERVAL_MS),
    ];
    this.deps.target.addEventListener("pagehide", this.onPageHide);
    this.deps.target.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.running = false;
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers = [];
    this.deps.target.removeEventListener("pagehide", this.onPageHide);
    this.deps.target.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.queue = EMPTY_QUEUE;
  }

  track(event: TrackedEvent): void {
    if (!this.stopped) this.queue = enqueue(this.queue, event);
  }

  private readonly onPageHide = () => this.flushNow();

  private readonly onVisibilityChange = () => {
    if (!this.deps.isVisible()) this.flushNow();
  };

  private async freshToken(): Promise<string | null> {
    try {
      return await this.deps.getToken();
    } catch {
      return null;
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.session !== "none" || this.stopped) return;
    this.session = "opening";
    try {
      this.sessionId = await this.deps.openSession();
      this.session = "open";
    } catch (error) {
      this.session = sessionRefused(error) ? "refused" : "none";
    }
  }

  /** Every 10 s: the next batch, or just a fresh token for a later pagehide. */
  private async tick(): Promise<void> {
    if (this.queue.length > 0) return this.flush(false);
    await this.freshToken();
  }

  /** Every 30 s while the tab is visible: the session is alive. */
  private async heartbeat(): Promise<void> {
    if (!this.deps.isVisible()) return;
    await this.ensureSession();
    await this.flush(true);
  }

  private async flush(heartbeat: boolean): Promise<void> {
    const { batch, rest } = takeBatch(this.queue);
    const beat = heartbeat && this.sessionId !== null;
    if (this.stopped || (batch.length === 0 && !beat)) return;
    this.queue = rest;
    const token = await this.freshToken();
    if (this.stopped) return;
    if (token === null) {
      this.queue = requeue(this.queue, batch);
      return;
    }
    const outcome = await this.deps.postEvents(batchOf(batch, this.sessionId, beat), token, false);
    if (outcome === "retry" && !this.stopped) this.queue = requeue(this.queue, batch);
  }

  /** The page may be going: everything queued, now, with the last token seen. */
  private flushNow(): void {
    const token = this.deps.lastToken();
    if (this.stopped || token === null || this.queue.length === 0) return;
    const batches = allBatches(this.queue);
    this.queue = EMPTY_QUEUE;
    batches.forEach((batch) => void this.deps.postEvents(batchOf(batch, this.sessionId, false), token, true));
  }
}

export function createTracker(overrides: Partial<TrackerDeps> = {}): Tracker {
  return new ReadingTracker({ ...defaultDeps(), ...overrides });
}
