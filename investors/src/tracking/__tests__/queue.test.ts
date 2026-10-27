import { describe, expect, it } from "vitest";

import { batchOf, MAX_DURATION_MS, pageView, type TrackedEvent } from "../events";
import { allBatches, EMPTY_QUEUE, enqueue, MAX_BATCH, MAX_QUEUE, requeue, takeBatch, type Queue } from "../queue";

const DOC = "00000000-0000-4000-8000-0000000000d1";
const view = (page: number): TrackedEvent => pageView(DOC, 1, page, 1000);
const queueOf = (n: number): Queue => Array.from({ length: n }, (_, i) => view(i + 1));
const pages = (queue: Queue) => queue.map((event) => (event.type === "page_view" ? event.page : null));

describe("pageView", () => {
  it("rounds the duration and keeps it between 0 and 600000", () => {
    expect(pageView(DOC, 2, 3, 1234.6)).toEqual({
      type: "page_view",
      documentId: DOC,
      documentVersion: 2,
      page: 3,
      durationMs: 1235,
    });
    expect(pageView(DOC, 1, 1, 9_999_999)).toMatchObject({ durationMs: MAX_DURATION_MS });
    expect(pageView(DOC, 1, 1, -5)).toMatchObject({ durationMs: 0 });
  });
});

describe("batchOf", () => {
  it("names the session when there is one, and marks a heartbeat only with a session", () => {
    const events = [view(1)];
    expect(batchOf(events, null, false)).toEqual({ events });
    expect(batchOf(events, null, true)).toEqual({ events });
    expect(batchOf(events, "s-1", false)).toEqual({ sessionId: "s-1", events });
    expect(batchOf([], "s-1", true)).toEqual({ sessionId: "s-1", heartbeat: true, events: [] });
  });
});

describe("the queue", () => {
  it("adds without changing the queue it was given", () => {
    const before = queueOf(2);
    const after = enqueue(before, view(3));
    expect(pages(before)).toEqual([1, 2]);
    expect(pages(after)).toEqual([1, 2, 3]);
  });

  it("keeps the newest MAX_QUEUE events", () => {
    const full = queueOf(MAX_QUEUE);
    const after = enqueue(full, view(MAX_QUEUE + 1));
    expect(after).toHaveLength(MAX_QUEUE);
    expect(pages(after)[0]).toBe(2);
    expect(pages(after).at(-1)).toBe(MAX_QUEUE + 1);
  });

  it("takes at most MAX_BATCH events for one request", () => {
    const { batch, rest } = takeBatch(queueOf(MAX_BATCH + 5));
    expect(batch).toHaveLength(MAX_BATCH);
    expect(pages(rest)).toEqual([51, 52, 53, 54, 55]);
    expect(takeBatch(EMPTY_QUEUE)).toEqual({ batch: [], rest: [] });
  });

  it("puts a failed batch back in front of what arrived since, within MAX_QUEUE", () => {
    expect(pages(requeue([view(9)], [view(1), view(2)]))).toEqual([1, 2, 9]);
    const crowded = requeue(queueOf(MAX_QUEUE), [view(0)]);
    expect(crowded).toHaveLength(MAX_QUEUE);
    expect(pages(crowded)[0]).toBe(1);
  });

  it("splits the whole queue into request-sized batches", () => {
    expect(allBatches(EMPTY_QUEUE)).toEqual([]);
    expect(allBatches(queueOf(MAX_BATCH * 2 + 1)).map((batch) => batch.length)).toEqual([MAX_BATCH, MAX_BATCH, 1]);
  });
});
