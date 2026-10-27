import { describe, expect, it } from "vitest";

import { videoProgress, type VideoPercent } from "../events";
import { NO_MILESTONES, passMilestones, percentAt, VIDEO_MILESTONES, type Milestones } from "../video-progress";

/** Plays the positions (percent) from `reached`; every milestone reported, in order. */
function watch(positions: readonly (number | null)[], reached: Milestones = NO_MILESTONES): readonly VideoPercent[] {
  const { passed } = positions.reduce(
    (acc, percent) => {
      const step = passMilestones(acc.reached, percent);
      return { reached: step.reached, passed: [...acc.passed, ...step.passed] };
    },
    { reached, passed: [] as readonly VideoPercent[] },
  );
  return passed;
}

describe("percentAt", () => {
  it("is the share of the video's length, in percent", () => {
    expect(percentAt(0, 200)).toBe(0);
    expect(percentAt(50, 200)).toBe(25);
    expect(percentAt(200, 200)).toBe(100);
  });

  it("stays between 0 and 100", () => {
    expect(percentAt(250, 200)).toBe(100);
    expect(percentAt(-3, 200)).toBe(0);
  });

  it("is unknown until the length is (no metadata yet, or a stream without an end)", () => {
    expect(percentAt(10, Number.NaN)).toBeNull();
    expect(percentAt(10, Number.POSITIVE_INFINITY)).toBeNull();
    expect(percentAt(10, 0)).toBeNull();
    expect(percentAt(Number.NaN, 200)).toBeNull();
  });
});

describe("the video's milestones", () => {
  it("are 25, 50, 75 and 100%", () => {
    expect(VIDEO_MILESTONES).toEqual([25, 50, 75, 100]);
  });

  it("reports each once while the video plays through", () => {
    const positions = Array.from({ length: 201 }, (_, i) => i / 2);
    expect(watch(positions)).toEqual([25, 50, 75, 100]);
  });

  it("counts a milestone a seek forward jumped past, once", () => {
    expect(watch([5, 60])).toEqual([25, 50]);
    expect(watch([5, 60, 61, 62])).toEqual([25, 50]);
  });

  it("does not repeat a milestone when the investor seeks back and watches it again", () => {
    expect(watch([30, 10, 20, 30, 40])).toEqual([25]);
    expect(watch([80, 0, 30, 55, 80, 100])).toEqual([25, 50, 75, 100]);
  });

  it("counts a milestone from the moment the position reaches it", () => {
    expect(watch([24.99])).toEqual([]);
    expect(watch([25])).toEqual([25]);
  });

  it("reports nothing while the length is unknown", () => {
    expect(watch([null, null])).toEqual([]);
    expect(watch([null, 30])).toEqual([25]);
  });

  it("goes on from the milestones already reached", () => {
    expect(watch([60, 100], [25, 50])).toEqual([75, 100]);
  });

  it("returns new lists: the one it was given is not changed", () => {
    const reached: Milestones = Object.freeze([25]);
    const step = passMilestones(reached, 55);
    expect(step).toEqual({ reached: [25, 50], passed: [50] });
    expect(reached).toEqual([25]);
    expect(passMilestones(reached, 30).reached).toBe(reached);
  });
});

describe("videoProgress", () => {
  it("is the event the server stores for a milestone", () => {
    expect(videoProgress("doc-1", 75)).toEqual({ type: "video_progress", documentId: "doc-1", percent: 75 });
  });
});
