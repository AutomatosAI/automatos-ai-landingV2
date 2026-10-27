import type { VideoPercent } from "./events";

/**
 * How far a video was watched (US-008): each of 25, 50, 75 and 100% is
 * reported once per open, when the furthest point reached passes it. Seeking
 * forward past a milestone counts it, once; seeking back and watching that
 * part again does not repeat it. Pure steps over the player's position; the
 * feed (use-video-progress-feed.ts) sends what they report to the tracker.
 */

export const VIDEO_MILESTONES: readonly VideoPercent[] = Object.freeze([25, 50, 75, 100]);

/** The milestones already reported in this open, in the order they were passed. */
export type Milestones = readonly VideoPercent[];

export const NO_MILESTONES: Milestones = Object.freeze([]);

/**
 * How far through the video `time` is, in percent (0 to 100); null while the
 * length is unknown (no metadata yet, or a stream without an end).
 */
export function percentAt(time: number, duration: number): number | null {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(time)) return null;
  return Math.min(100, Math.max(0, (time / duration) * 100));
}

export interface MilestoneStep {
  readonly reached: Milestones;
  /** The milestones this position passed for the first time, lowest first. */
  readonly passed: readonly VideoPercent[];
}

/** The position moved to `percent` (percentAt): what it passed for the first time. */
export function passMilestones(reached: Milestones, percent: number | null): MilestoneStep {
  if (percent === null) return { reached, passed: [] };
  const passed = VIDEO_MILESTONES.filter((milestone) => percent >= milestone && !reached.includes(milestone));
  return passed.length === 0 ? { reached, passed } : { reached: [...reached, ...passed], passed };
}
