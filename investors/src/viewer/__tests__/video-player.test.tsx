import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { strings } from "@/strings";

import { MEDIA_ERR_DECODE, MEDIA_ERR_NETWORK, START, type ResumePoint } from "../video-model";
import { VideoPlayer } from "../VideoPlayer";

const URL_1 = "https://storage.example.com/signed-get-1";
const TITLE = "Example product demo";

interface Media {
  readonly duration?: number;
  readonly currentTime?: number;
  readonly errorCode?: number;
}

/** jsdom plays nothing: the test sets what a browser would report, then fires its event. */
function setMedia(video: HTMLVideoElement, { duration, currentTime, errorCode }: Media) {
  if (duration !== undefined) Object.defineProperty(video, "duration", { configurable: true, value: duration });
  if (currentTime !== undefined) video.currentTime = currentTime;
  if (errorCode !== undefined) Object.defineProperty(video, "error", { configurable: true, value: { code: errorCode } });
}

function renderPlayer(resume: ResumePoint = START) {
  const props = { onFailure: vi.fn(), onPlaying: vi.fn(), onProgress: vi.fn() };
  render(<VideoPlayer url={URL_1} title={TITLE} resume={resume} actions={<button type="button">download</button>} {...props} />);
  const video = screen.getByLabelText(strings.viewer.video.label(TITLE));
  if (!(video instanceof HTMLVideoElement)) throw new Error("no video element");
  return { video, ...props };
}

const play = vi.fn(() => Promise.resolve());

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
});

afterEach(() => {
  play.mockClear();
  vi.restoreAllMocks();
});

describe("the video player", () => {
  it("is the browser's player on the link: controls, inline on a phone, metadata only until play", () => {
    const { video } = renderPlayer();
    expect(video).toHaveAttribute("src", URL_1);
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(screen.getByRole("button", { name: "download" })).toBeInTheDocument();
  });

  it("reports the position as it plays, and the whole length when it ends", () => {
    const { video, onProgress } = renderPlayer();
    setMedia(video, { duration: 120, currentTime: 31 });
    fireEvent.timeUpdate(video);
    setMedia(video, { currentTime: 119.8 });
    fireEvent.ended(video);
    expect(onProgress.mock.calls).toEqual([
      [31, 120],
      [120, 120],
    ]);
  });

  it("starts at the beginning and does not play by itself", () => {
    const { video } = renderPlayer();
    setMedia(video, { duration: 120 });
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(0);
    expect(play).not.toHaveBeenCalled();
  });

  it("picks up at the resume point and plays on when the investor was watching", () => {
    const { video } = renderPlayer({ time: 64, playing: true });
    setMedia(video, { duration: 120 });
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(64);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("lets a refused play go: the controls are there", async () => {
    play.mockImplementationOnce(() => Promise.reject(new DOMException("blocked", "NotAllowedError")));
    const { video } = renderPlayer({ time: 10, playing: true });
    setMedia(video, { duration: 120 });
    expect(() => fireEvent.loadedMetadata(video)).not.toThrow();
    await Promise.resolve();
    expect(video.currentTime).toBe(10);
  });

  it("reports a failure with where it stopped and whether the investor was watching", () => {
    const { video, onFailure } = renderPlayer();
    setMedia(video, { duration: 120 });
    fireEvent.loadedMetadata(video);
    fireEvent.play(video);
    setMedia(video, { currentTime: 75.5, errorCode: MEDIA_ERR_NETWORK });
    fireEvent.error(video);
    expect(onFailure).toHaveBeenCalledWith({
      error: { name: "MediaFailure", code: MEDIA_ERR_NETWORK },
      at: { time: 75.5, playing: true },
    });
  });

  it("reports a paused video as paused", () => {
    const { video, onFailure } = renderPlayer({ time: 20, playing: true });
    setMedia(video, { duration: 120 });
    fireEvent.loadedMetadata(video);
    fireEvent.pause(video);
    setMedia(video, { currentTime: 20, errorCode: MEDIA_ERR_DECODE });
    fireEvent.error(video);
    expect(onFailure).toHaveBeenCalledWith({ error: { name: "MediaFailure", code: MEDIA_ERR_DECODE }, at: { time: 20, playing: false } });
  });

  it("keeps the resume point when the link fails before the video loaded", () => {
    const resume = { time: 64, playing: true };
    const { video, onFailure } = renderPlayer(resume);
    setMedia(video, { errorCode: MEDIA_ERR_NETWORK });
    fireEvent.error(video);
    expect(onFailure).toHaveBeenCalledWith({ error: { name: "MediaFailure", code: MEDIA_ERR_NETWORK }, at: resume });
  });

  it("says when the link played", () => {
    const { video, onPlaying } = renderPlayer();
    fireEvent.playing(video);
    expect(onPlaying).toHaveBeenCalledTimes(1);
  });
});
