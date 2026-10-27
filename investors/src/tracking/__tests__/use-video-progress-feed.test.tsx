import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TrackerContext } from "../context";
import type { Tracker } from "../tracker";
import { useVideoProgressFeed } from "../use-video-progress-feed";

const DEMO = "00000000-0000-4000-8000-0000000000d4";
const OTHER = "00000000-0000-4000-8000-0000000000d5";

function fakeTracker(): Tracker & { readonly track: ReturnType<typeof vi.fn> } {
  return { start: vi.fn(), stop: vi.fn(), track: vi.fn() };
}

function renderFeed(tracker: Tracker | null, documentId = DEMO) {
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <TrackerContext.Provider value={tracker}>{children}</TrackerContext.Provider>
  );
  return renderHook(({ id }) => useVideoProgressFeed(id), { wrapper, initialProps: { id: documentId } });
}

const percents = (tracker: ReturnType<typeof fakeTracker>) => tracker.track.mock.calls.map(([event]) => event.percent);

describe("useVideoProgressFeed", () => {
  it("sends each milestone passed as a video_progress of the document", () => {
    const tracker = fakeTracker();
    const { result } = renderFeed(tracker);
    result.current?.(30, 120);
    expect(tracker.track.mock.calls).toEqual([[{ type: "video_progress", documentId: DEMO, percent: 25 }]]);
    result.current?.(120, 120);
    expect(percents(tracker)).toEqual([25, 50, 75, 100]);
  });

  it("sends a milestone once per open, even after seeking back and a new feed function", () => {
    const tracker = fakeTracker();
    const { result, rerender } = renderFeed(tracker);
    result.current?.(70, 120);
    result.current?.(10, 120);
    rerender({ id: DEMO });
    result.current?.(70, 120);
    expect(percents(tracker)).toEqual([25, 50]);
  });

  it("sends nothing before the length is known", () => {
    const tracker = fakeTracker();
    const { result } = renderFeed(tracker);
    result.current?.(30, Number.NaN);
    expect(tracker.track).not.toHaveBeenCalled();
  });

  it("starts afresh for another document", () => {
    const tracker = fakeTracker();
    const { result, rerender } = renderFeed(tracker);
    result.current?.(60, 120);
    rerender({ id: OTHER });
    result.current?.(60, 120);
    expect(tracker.track.mock.calls.map(([event]) => [event.documentId, event.percent])).toEqual([
      [DEMO, 25],
      [DEMO, 50],
      [OTHER, 25],
      [OTHER, 50],
    ]);
  });

  it("is absent without a tracker (signed out)", () => {
    expect(renderFeed(null).result.current).toBeUndefined();
  });
});
