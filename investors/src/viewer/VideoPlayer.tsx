import { useRef, type ReactNode, type SyntheticEvent } from "react";

import { strings } from "@/strings";

import {
  failurePoint,
  mediaFailure,
  resumeTime,
  type OnVideoProgress,
  type ResumePoint,
  type VideoFailure,
} from "./video-model";

const copy = strings.viewer.video;

export interface VideoPlayerProps {
  /** The presigned inline link (the page renews it, keyed on this URL). */
  readonly url: string;
  readonly title: string;
  /** Where to start: the beginning, or where a refused link stopped. */
  readonly resume: ResumePoint;
  /** The element could not play the link: a refused one is renewed by the page, at the same time. */
  readonly onFailure: (failure: VideoFailure) => void;
  /** The link played: a later refusal of it is an expiry (link-model.ts afterLinkPlayed). */
  readonly onPlaying?: () => void;
  /** The position moved (the tracker's milestones, US-008). */
  readonly onProgress?: OnVideoProgress;
  /** The Download button. */
  readonly actions?: ReactNode;
}

type VideoEvent = SyntheticEvent<HTMLVideoElement>;

/**
 * Seeks to the resume point, and plays on when the investor was watching.
 * The browser may refuse to play without a fresh click (autoplay rules):
 * the controls are there for it, so the refusal is let go.
 */
function pickUp(video: HTMLVideoElement, resume: ResumePoint): void {
  const time = resumeTime(resume, video.duration);
  if (time > 0) video.currentTime = time;
  if (resume.playing) void Promise.resolve(video.play()).catch(() => undefined);
}

/**
 * The browser's own player (US-008): controls, inline on a phone, only the
 * metadata fetched until the investor presses play. It reports the position
 * for the milestones, and a failure with where it stopped, so the page can
 * renew a refused link and pick up at the same time.
 */
export function VideoPlayer({ url, title, resume, onFailure, onPlaying, onProgress, actions }: VideoPlayerProps) {
  const loaded = useRef(false);
  // The investor's intent: the element's own state does not survive a failure.
  const playing = useRef(resume.playing);
  const report = ({ currentTarget }: VideoEvent) => onProgress?.(currentTarget.currentTime, currentTarget.duration);
  const onLoadedMetadata = ({ currentTarget }: VideoEvent) => {
    loaded.current = true;
    pickUp(currentTarget, resume);
  };
  const onError = ({ currentTarget }: VideoEvent) => {
    const element = { loaded: loaded.current, time: currentTarget.currentTime, playing: playing.current };
    onFailure({ error: mediaFailure(currentTarget.error?.code), at: failurePoint(resume, element) });
  };

  return (
    <div className="rounded-lg border">
      <div className="bg-secondary">
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          aria-label={copy.label(title)}
          className="mx-auto block max-h-[75vh] w-full"
          onLoadedMetadata={onLoadedMetadata}
          onPlay={() => {
            playing.current = true;
          }}
          onPause={() => {
            playing.current = false;
          }}
          onPlaying={onPlaying}
          onTimeUpdate={report}
          onEnded={({ currentTarget }) => onProgress?.(currentTarget.duration, currentTarget.duration)}
          onError={onError}
        />
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2 border-t px-3 py-2 sm:px-4">{actions}</div>}
    </div>
  );
}
