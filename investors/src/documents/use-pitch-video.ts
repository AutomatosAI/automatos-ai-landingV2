import { useCallback, useEffect, useState } from "react";

import { useVideoProgressFeed } from "@/tracking/use-video-progress-feed";
import { useViewerLink, type ViewerLink } from "@/viewer/use-viewer-link";
import type { OnVideoProgress, ResumePoint, VideoFailure } from "@/viewer/video-model";

import { isGone } from "./messages";

/** The investor pressed play: the player starts at once (the press is the gesture browsers ask for). */
const PLAY_FROM_START: ResumePoint = Object.freeze({ time: 0, playing: true });

export interface PitchVideo {
  /** The investor pressed play; until then there is no link and no open. */
  readonly started: boolean;
  readonly start: () => void;
  readonly link: ViewerLink;
  /** Where the next link's player picks up: the start, then where a refused link stopped. */
  readonly resume: ResumePoint;
  readonly onFailure: (failure: VideoFailure) => void;
  readonly onProgress: OnVideoProgress | undefined;
}

/**
 * The pitch block's video (W3-03): the viewer page's video steps (pages/Viewer.tsx
 * VideoBody), held back until the investor presses play. The server records
 * an open for every link it issues, so none is asked for on render (KP20).
 * A 404 means the video went: onGone reads the list again.
 */
export function usePitchVideo(userId: string, documentId: string, onGone: () => void): PitchVideo {
  const [started, setStarted] = useState(false);
  const link = useViewerLink(userId, documentId, started);
  // Each milestone watched becomes a video_progress, once per open (US-008), as on the video's page.
  const onProgress = useVideoProgressFeed(documentId);
  const [resume, setResume] = useState(PLAY_FROM_START);
  const { onLoadError } = link;
  const onFailure = useCallback(
    (failure: VideoFailure) => {
      setResume(failure.at);
      onLoadError(failure.error);
    },
    [onLoadError],
  );
  const start = useCallback(() => setStarted(true), []);
  const gone = link.phase.kind === "link_failed" && isGone(link.phase.error);
  useEffect(() => {
    if (gone) onGone();
  }, [gone, onGone]);
  return { started, start, link, resume, onFailure, onProgress };
}
