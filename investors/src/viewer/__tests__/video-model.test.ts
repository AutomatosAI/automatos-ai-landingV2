import { describe, expect, it } from "vitest";

import { afterLinkPlayed, afterLoadError, FIRST_CYCLE, isExpiredLink, retryCycle } from "../link-model";
import {
  failurePoint,
  isRefusedMedia,
  MEDIA_ERR_DECODE,
  MEDIA_ERR_NETWORK,
  MEDIA_ERR_SRC_NOT_SUPPORTED,
  mediaFailure,
  resumeTime,
  START,
} from "../video-model";

const refused = mediaFailure(MEDIA_ERR_NETWORK);
const decode = mediaFailure(MEDIA_ERR_DECODE);

describe("isRefusedMedia", () => {
  it("is a failed fetch: a refused range, or a refused first request", () => {
    expect(isRefusedMedia(mediaFailure(MEDIA_ERR_NETWORK))).toBe(true);
    expect(isRefusedMedia(mediaFailure(MEDIA_ERR_SRC_NOT_SUPPORTED))).toBe(true);
  });

  it("is not a file the browser cannot decode, an unknown code or anything else", () => {
    expect(isRefusedMedia(decode)).toBe(false);
    expect(isRefusedMedia(mediaFailure(undefined))).toBe(false);
    expect(isRefusedMedia({ name: "MediaFailure", code: "2" })).toBe(false);
    expect(isRefusedMedia({ code: MEDIA_ERR_NETWORK })).toBe(false);
    expect(isRefusedMedia(null)).toBe(false);
  });
});

describe("the link, for a video", () => {
  it("renews a refused link once, then stops with the error", () => {
    const renewed = afterLoadError(FIRST_CYCLE, refused);
    expect(isExpiredLink(refused)).toBe(true);
    expect(renewed).toEqual({ generation: 1, renewals: 1, loadError: null });
    expect(afterLoadError(renewed, refused)).toEqual({ generation: 1, renewals: 1, loadError: refused });
  });

  it("never renews for a file the browser cannot decode", () => {
    expect(afterLoadError(FIRST_CYCLE, decode)).toEqual({ ...FIRST_CYCLE, loadError: decode });
  });

  it("renews again once the renewed link has played (it expired while being watched)", () => {
    const renewed = afterLoadError(FIRST_CYCLE, refused);
    const played = afterLinkPlayed(renewed);
    expect(played).toEqual({ generation: 1, renewals: 0, loadError: null });
    expect(afterLoadError(played, refused)).toEqual({ generation: 2, renewals: 1, loadError: null });
  });

  it("keeps the same cycle when nothing was spent (no re-render), and never changes the one it is given", () => {
    expect(afterLinkPlayed(FIRST_CYCLE)).toBe(FIRST_CYCLE);
    const spent = Object.freeze(afterLoadError(FIRST_CYCLE, refused));
    afterLinkPlayed(spent);
    expect(spent.renewals).toBe(1);
    expect(afterLinkPlayed(retryCycle(spent)).renewals).toBe(0);
  });
});

describe("failurePoint", () => {
  const given = { time: 42, playing: true };

  it("is where the element was, once it had loaded", () => {
    expect(failurePoint(given, { loaded: true, time: 95.5, playing: false })).toEqual({ time: 95.5, playing: false });
  });

  it("keeps the point it was given when the element failed before loading (it never got there)", () => {
    expect(failurePoint(given, { loaded: false, time: 0, playing: false })).toBe(given);
  });
});

describe("resumeTime", () => {
  it("is the resume time, inside the video", () => {
    expect(resumeTime({ time: 42, playing: true }, 300)).toBe(42);
    expect(resumeTime({ time: 420, playing: true }, 300)).toBe(300);
    expect(resumeTime({ time: -5, playing: false }, 300)).toBe(0);
  });

  it("keeps the time while the length is unknown, and starts at 0 from the start", () => {
    expect(resumeTime({ time: 42, playing: false }, Number.NaN)).toBe(42);
    expect(resumeTime(START, 300)).toBe(0);
    expect(resumeTime({ time: Number.NaN, playing: false }, 300)).toBe(0);
  });
});
