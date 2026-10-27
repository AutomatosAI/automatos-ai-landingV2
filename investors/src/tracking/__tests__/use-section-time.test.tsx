import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TrackerContext } from "../context";
import type { Tracker } from "../tracker";
import { useSectionTime } from "../use-section-time";

let clock = 0;
let visibility: DocumentVisibilityState = "visible";

function fakeTracker(): Tracker & { readonly track: ReturnType<typeof vi.fn> } {
  return { start: vi.fn(), stop: vi.fn(), track: vi.fn() };
}

function Page({ section }: { readonly section: string }) {
  useSectionTime(section);
  return null;
}

const renderPage = (tracker: Tracker | null, section = "team") =>
  render(
    <TrackerContext.Provider value={tracker}>
      <Page section={section} />
    </TrackerContext.Provider>,
  );

function setTab(state: DocumentVisibilityState, at: number) {
  clock = at;
  visibility = state;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
  });
}

beforeEach(() => {
  clock = 0;
  visibility = "visible";
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSectionTime", () => {
  it("reports the visible time as section_view when the investor leaves the page", () => {
    const tracker = fakeTracker();
    const page = renderPage(tracker);
    clock = 7000;
    page.unmount();
    expect(tracker.track.mock.calls).toEqual([[{ type: "section_view", section: "team", durationMs: 7000 }]]);
  });

  it("reports when the tab hides and counts nothing while it is hidden", () => {
    const tracker = fakeTracker();
    const page = renderPage(tracker, "faq");
    setTab("hidden", 3000);
    expect(tracker.track).toHaveBeenLastCalledWith({ type: "section_view", section: "faq", durationMs: 3000 });
    setTab("visible", 120_000);
    clock = 125_000;
    page.unmount();
    expect(tracker.track.mock.calls.map(([event]) => event.durationMs)).toEqual([3000, 5000]);
  });

  it("queues the time before a listener on window (the tracker's flush) hears the tab hide", () => {
    const tracker = fakeTracker();
    let queuedWhenWindowHeard = -1;
    const onWindow = () => {
      queuedWhenWindowHeard = tracker.track.mock.calls.length;
    };
    window.addEventListener("visibilitychange", onWindow);
    renderPage(tracker);
    setTab("hidden", 2000);
    window.removeEventListener("visibilitychange", onWindow);
    expect(queuedWhenWindowHeard).toBe(1);
  });

  it("stops listening once the page has gone", () => {
    const tracker = fakeTracker();
    const page = renderPage(tracker);
    clock = 2000;
    page.unmount();
    setTab("hidden", 9000);
    setTab("visible", 10_000);
    expect(tracker.track).toHaveBeenCalledTimes(1);
  });

  it("drops a visit under a second, and sends nothing without a tracker (signed out)", () => {
    const tracker = fakeTracker();
    const quick = renderPage(tracker);
    clock = 400;
    quick.unmount();
    expect(tracker.track).not.toHaveBeenCalled();
    expect(() => renderPage(null).unmount()).not.toThrow();
  });
});
