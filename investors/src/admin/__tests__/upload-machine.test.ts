import { describe, expect, it } from "vitest";

import { IDLE, isBusy, percentOf, uploadReducer, type UploadEvent, type UploadState } from "../upload-machine";

const run = (events: readonly UploadEvent[], from: UploadState = IDLE) => events.reduce(uploadReducer, from);

const REQUESTING: UploadState = { phase: "requesting" };
const FINALIZING: UploadState = { phase: "finalizing" };
const uploading = (percent: number): UploadState => ({ phase: "uploading", percent });

describe("the upload state machine", () => {
  it("walks idle → requesting → uploading(pct) → finalizing → done", () => {
    const states: UploadState[] = [];
    const events: UploadEvent[] = [
      { type: "start" },
      { type: "progress", loaded: 25, total: 100 },
      { type: "progress", loaded: 100, total: 100 },
      { type: "uploaded" },
      { type: "finalized", version: 2 },
    ];
    events.reduce((state, event) => {
      const next = uploadReducer(state, event);
      states.push(next);
      return next;
    }, IDLE);
    expect(states).toEqual([REQUESTING, uploading(25), uploading(100), FINALIZING, { phase: "done", version: 2 }]);
  });

  it.each<[string, UploadState]>([
    ["requesting", REQUESTING],
    ["uploading", uploading(40)],
    ["finalizing", FINALIZING],
  ])("goes to error from %s", (_name, from) => {
    expect(uploadReducer(from, { type: "fail", reason: "expired" })).toEqual({ phase: "error", reason: "expired" });
  });

  it("lets a small file finish before any progress event", () => {
    expect(run([{ type: "start" }, { type: "uploaded" }])).toEqual(FINALIZING);
  });

  it("never moves the bar backwards", () => {
    expect(uploadReducer(uploading(60), { type: "progress", loaded: 10, total: 100 })).toEqual(uploading(60));
  });

  it("starts again from done or error, but not while an upload is in flight", () => {
    expect(uploadReducer({ phase: "done", version: 1 }, { type: "start" })).toEqual(REQUESTING);
    expect(uploadReducer({ phase: "error", reason: "network" }, { type: "start" })).toEqual(REQUESTING);
    const busy = uploading(30);
    expect(uploadReducer(busy, { type: "start" })).toBe(busy);
  });

  it("ignores events that do not fit the state", () => {
    expect(uploadReducer(IDLE, { type: "progress", loaded: 1, total: 2 })).toBe(IDLE);
    expect(uploadReducer(IDLE, { type: "uploaded" })).toBe(IDLE);
    expect(uploadReducer(IDLE, { type: "finalized", version: 1 })).toBe(IDLE);
    expect(uploadReducer(IDLE, { type: "fail", reason: "failed" })).toBe(IDLE);
    expect(uploadReducer(REQUESTING, { type: "finalized", version: 1 })).toBe(REQUESTING);
    const done: UploadState = { phase: "done", version: 3 };
    expect(uploadReducer(done, { type: "fail", reason: "failed" })).toBe(done);
    expect(uploadReducer(FINALIZING, { type: "progress", loaded: 1, total: 2 })).toBe(FINALIZING);
  });

  it("resets to idle from any state", () => {
    expect(uploadReducer(uploading(50), { type: "reset" })).toBe(IDLE);
    expect(uploadReducer({ phase: "error", reason: "failed" }, { type: "reset" })).toBe(IDLE);
  });

  it("does not change the state it is given", () => {
    const from = Object.freeze(uploading(10));
    const next = uploadReducer(from, { type: "progress", loaded: 50, total: 100 });
    expect(from).toEqual(uploading(10));
    expect(next).not.toBe(from);
  });

  it("is busy only while requesting, uploading or finalizing", () => {
    expect([IDLE, REQUESTING, uploading(1), FINALIZING, { phase: "done", version: 1 } as const].map(isBusy)).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
    expect(isBusy({ phase: "error", reason: "failed" })).toBe(false);
  });
});

describe("percentOf", () => {
  it.each([
    [0, 100, 0],
    [1, 3, 33],
    [999, 1000, 99],
    [1000, 1000, 100],
    [2000, 1000, 100],
    [5, 0, 0],
    [5, Number.NaN, 0],
    [-5, 100, 0],
  ])("%d of %d is %d%%", (loaded, total, expected) => {
    expect(percentOf(loaded, total)).toBe(expected);
  });
});
