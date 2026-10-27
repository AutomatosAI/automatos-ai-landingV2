import { describe, expect, it } from "vitest";

import { sectionView } from "../events";
import { MIN_SECTION_MS, startSectionClock, stepSectionClock, type SectionClock, type SectionInput } from "../section-time";

/** Runs the inputs from `clock`; the reported milliseconds, in order. */
function run(clock: SectionClock, inputs: readonly SectionInput[]): readonly number[] {
  const { reported } = inputs.reduce(
    (acc, input) => {
      const step = stepSectionClock(acc.clock, input);
      return { clock: step.clock, reported: step.ms === null ? acc.reported : [...acc.reported, step.ms] };
    },
    { clock, reported: [] as readonly number[] },
  );
  return reported;
}

const hide = (at: number): SectionInput => ({ type: "tab", visible: false, at });
const show = (at: number): SectionInput => ({ type: "tab", visible: true, at });
const leave = (at: number): SectionInput => ({ type: "leave", at });

describe("the section page's visible-time clock", () => {
  it("runs from the page opening in a visible tab to the investor leaving", () => {
    expect(run(startSectionClock(true, 1000), [leave(6000)])).toEqual([5000]);
  });

  it("reports when the tab hides, stops while hidden, and starts again when it comes back", () => {
    expect(run(startSectionClock(true, 0), [hide(4000), show(60_000), leave(63_000)])).toEqual([4000, 3000]);
  });

  it("counts nothing for a page opened in a hidden tab until the tab shows", () => {
    expect(run(startSectionClock(false, 0), [leave(30_000)])).toEqual([]);
    expect(run(startSectionClock(false, 0), [show(10_000), leave(12_500)])).toEqual([2500]);
  });

  it("ignores repeated events that change nothing", () => {
    expect(run(startSectionClock(true, 0), [show(500), show(900), hide(2000), hide(5000), leave(9000)])).toEqual([2000]);
  });

  it("drops a stretch under a second (a tab flicked past, a development double mount)", () => {
    expect(run(startSectionClock(true, 0), [leave(MIN_SECTION_MS - 1)])).toEqual([]);
    expect(run(startSectionClock(true, 0), [leave(MIN_SECTION_MS)])).toEqual([MIN_SECTION_MS]);
  });

  it("rounds to whole milliseconds and never goes negative", () => {
    expect(run(startSectionClock(true, 0.4), [leave(1500.7)])).toEqual([1500]);
    expect(run(startSectionClock(true, 5000), [leave(1000)])).toEqual([]);
  });

  it("returns new clocks: the one it was given is not changed", () => {
    const clock = startSectionClock(true, 0);
    const step = stepSectionClock(clock, hide(2000));
    expect(clock).toEqual({ since: 0 });
    expect(step.clock).toEqual({ since: null });
  });
});

describe("sectionView", () => {
  it("builds the section_view event, capped at the server's 10 minutes", () => {
    expect(sectionView("team", 4200.4)).toEqual({ type: "section_view", section: "team", durationMs: 4200 });
    expect(sectionView("faq", 3_600_000)).toEqual({ type: "section_view", section: "faq", durationMs: 600_000 });
  });
});
