import type { TrackedEvent } from "./events";

/*
 * The tracker's queue, as pure steps over immutable arrays. A request carries
 * at most MAX_BATCH events (the server refuses more). The queue keeps the
 * newest MAX_QUEUE: while the API cannot be reached the oldest go first,
 * and a pagehide flush of the whole queue stays well inside the browser's
 * 64 kB allowance for keepalive requests.
 */

export const MAX_BATCH = 50;
export const MAX_QUEUE = 200;

export type Queue = readonly TrackedEvent[];

export const EMPTY_QUEUE: Queue = Object.freeze([]);

const newest = (events: readonly TrackedEvent[]): Queue =>
  events.length > MAX_QUEUE ? events.slice(events.length - MAX_QUEUE) : events;

export function enqueue(queue: Queue, event: TrackedEvent): Queue {
  return newest([...queue, event]);
}

/** The next request's events, and what stays queued. */
export function takeBatch(queue: Queue): { readonly batch: Queue; readonly rest: Queue } {
  return { batch: queue.slice(0, MAX_BATCH), rest: queue.slice(MAX_BATCH) };
}

/** A batch that could not be sent goes back in front of what arrived since. */
export function requeue(queue: Queue, batch: Queue): Queue {
  return newest([...batch, ...queue]);
}

/** The whole queue in request-sized batches (the pagehide flush). */
export function allBatches(queue: Queue): readonly Queue[] {
  const count = Math.ceil(queue.length / MAX_BATCH);
  return Array.from({ length: count }, (_, i) => queue.slice(i * MAX_BATCH, (i + 1) * MAX_BATCH));
}
