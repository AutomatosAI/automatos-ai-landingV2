import { useMemo, useRef } from "react";

import type { OnVideoProgress } from "@/viewer/video-model";

import { useTracker } from "./context";
import { videoProgress } from "./events";
import { NO_MILESTONES, passMilestones, percentAt, type Milestones } from "./video-progress";

interface Reached {
  readonly documentId: string;
  readonly milestones: Milestones;
}

/**
 * The video player's onProgress for one document: each milestone passed
 * becomes a video_progress, once per open. The open is this page's visit:
 * the milestones live here, above the player, so a renewed link (a new
 * player) does not report them again; another document starts afresh.
 */
export function useVideoProgressFeed(documentId: string): OnVideoProgress | undefined {
  const tracker = useTracker();
  const reached = useRef<Reached>({ documentId, milestones: NO_MILESTONES });
  return useMemo(() => {
    if (tracker === null) return undefined;
    return (time: number, duration: number) => {
      const before = reached.current.documentId === documentId ? reached.current.milestones : NO_MILESTONES;
      const step = passMilestones(before, percentAt(time, duration));
      reached.current = { documentId, milestones: step.reached };
      step.passed.forEach((percent) => tracker.track(videoProgress(documentId, percent)));
    };
  }, [tracker, documentId]);
}
