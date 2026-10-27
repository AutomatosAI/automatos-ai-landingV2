import { describe, expect, it } from "vitest";

import {
  INITIAL_VISIBILITY,
  MIN_VISIBLE_RATIO,
  MIN_VISIT_MS,
  stepVisibility,
  type PageVisit,
  type VisibilityInput,
  type VisibilityState,
} from "../visibility-model";

/** Runs the inputs in order; returns the visits reported and the last state. */
function run(inputs: readonly VisibilityInput[], from: VisibilityState = INITIAL_VISIBILITY) {
  return inputs.reduce<{ state: VisibilityState; visits: readonly PageVisit[] }>(
    (acc, input) => {
      const step = stepVisibility(acc.state, input);
      return { state: step.state, visits: step.visit ? [...acc.visits, step.visit] : acc.visits };
    },
    { state: from, visits: [] },
  );
}

/** Page 1 rendered, half on screen, tab visible, all at t=0. */
const OPEN: readonly VisibilityInput[] = [
  { type: "tab", visible: true, at: 0 },
  { type: "ratio", ratio: 1, at: 0 },
  { type: "page", page: 1, at: 0 },
];

describe("the visibility model", () => {
  it("counts from 50% visible, for at least 1000 ms", () => {
    expect(MIN_VISIBLE_RATIO).toBe(0.5);
    expect(MIN_VISIT_MS).toBe(1000);
  });

  it("reports a page with its dwell when the reader turns the page", () => {
    const { visits, state } = run([...OPEN, { type: "page", page: 2, at: 4200 }]);
    expect(visits).toEqual([{ page: 1, ms: 4200 }]);
    expect(state).toMatchObject({ page: 2, since: 4200 });
  });

  it("drops a visit shorter than 1000 ms and keeps one of exactly 1000 ms", () => {
    expect(run([...OPEN, { type: "page", page: 2, at: 999 }]).visits).toEqual([]);
    expect(run([...OPEN, { type: "page", page: 2, at: 1000 }]).visits).toEqual([{ page: 1, ms: 1000 }]);
  });

  it("does not count a page under 50% visible", () => {
    const inputs: VisibilityInput[] = [
      { type: "tab", visible: true, at: 0 },
      { type: "ratio", ratio: 0.49, at: 0 },
      { type: "page", page: 1, at: 0 },
      { type: "page", page: 2, at: 5000 },
    ];
    expect(run(inputs).visits).toEqual([]);
  });

  it("ends the visit when the page scrolls under 50%, and starts a new one when it is back", () => {
    const { visits } = run([
      ...OPEN,
      { type: "ratio", ratio: 0.5, at: 1500 },
      { type: "ratio", ratio: 0.2, at: 3000 },
      { type: "ratio", ratio: 0.8, at: 9000 },
      { type: "stop", at: 11_000 },
    ]);
    expect(visits).toEqual([
      { page: 1, ms: 3000 },
      { page: 1, ms: 2000 },
    ]);
  });

  it("pauses while the tab is hidden", () => {
    const { visits } = run([
      ...OPEN,
      { type: "tab", visible: false, at: 2000 },
      { type: "tab", visible: true, at: 60_000 },
      { type: "page", page: 2, at: 61_500 },
    ]);
    expect(visits).toEqual([
      { page: 1, ms: 2000 },
      { page: 1, ms: 1500 },
    ]);
  });

  it("does not count a page until it has rendered (page null while the next one loads)", () => {
    const { visits, state } = run([...OPEN, { type: "page", page: null, at: 3000 }, { type: "page", page: 2, at: 3400 }]);
    expect(visits).toEqual([{ page: 1, ms: 3000 }]);
    expect(state).toMatchObject({ page: 2, since: 3400 });
  });

  it("ends the visit and resets when the viewer closes", () => {
    const { visits, state } = run([...OPEN, { type: "stop", at: 2500 }]);
    expect(visits).toEqual([{ page: 1, ms: 2500 }]);
    expect(state).toEqual(INITIAL_VISIBILITY);
  });

  it("keeps the visit going through inputs that change nothing", () => {
    const { visits } = run([
      ...OPEN,
      { type: "ratio", ratio: 0.9, at: 500 },
      { type: "tab", visible: true, at: 800 },
      { type: "page", page: 1, at: 900 },
      { type: "page", page: 2, at: 2000 },
    ]);
    expect(visits).toEqual([{ page: 1, ms: 2000 }]);
  });

  it("never reports before the tab is known to be visible", () => {
    const inputs: VisibilityInput[] = [
      { type: "ratio", ratio: 1, at: 0 },
      { type: "page", page: 1, at: 0 },
      { type: "stop", at: 5000 },
    ];
    expect(run(inputs).visits).toEqual([]);
  });

  it("does not change the state it is given", () => {
    const state = Object.freeze({ ...INITIAL_VISIBILITY });
    stepVisibility(state, { type: "page", page: 3, at: 10 });
    expect(state).toEqual(INITIAL_VISIBILITY);
  });
});
