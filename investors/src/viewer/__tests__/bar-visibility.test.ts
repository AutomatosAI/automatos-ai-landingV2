import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BAR_IDLE_MS, createBarVisibility } from "../bar-visibility";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the present bar's visibility", () => {
  it("starts shown and goes after 3 s without input", () => {
    expect(BAR_IDLE_MS).toBe(3000);
    const onChange = vi.fn();
    createBarVisibility(onChange);
    vi.advanceTimersByTime(2999);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange.mock.calls).toEqual([[false]]);
  });

  it("comes back on any input and starts the 3 s again", () => {
    const onChange = vi.fn();
    const bar = createBarVisibility(onChange);
    vi.advanceTimersByTime(3000);
    bar.poke();
    expect(onChange.mock.calls).toEqual([[false], [true]]);
    vi.advanceTimersByTime(2000);
    bar.poke();
    vi.advanceTimersByTime(2999);
    expect(onChange).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(onChange.mock.calls).toEqual([[false], [true], [false]]);
  });

  it("reports only changes: input while shown says nothing", () => {
    const onChange = vi.fn();
    const bar = createBarVisibility(onChange);
    bar.poke();
    bar.poke();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stays while held, and goes 3 s after it is let go", () => {
    const onChange = vi.fn();
    const bar = createBarVisibility(onChange);
    bar.hold(true);
    vi.advanceTimersByTime(60_000);
    expect(onChange).not.toHaveBeenCalled();
    bar.hold(false);
    vi.advanceTimersByTime(3000);
    expect(onChange.mock.calls).toEqual([[false]]);
  });

  it("is shown when held after it went", () => {
    const onChange = vi.fn();
    const bar = createBarVisibility(onChange);
    vi.advanceTimersByTime(3000);
    bar.hold(true);
    expect(onChange.mock.calls).toEqual([[false], [true]]);
  });

  it("changes nothing once stopped", () => {
    const onChange = vi.fn();
    const bar = createBarVisibility(onChange);
    bar.stop();
    vi.advanceTimersByTime(10_000);
    bar.poke();
    bar.hold(true);
    expect(onChange).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("runs on the timers it is given", () => {
    const timers = { setTimeout: vi.fn(() => 7 as unknown as ReturnType<typeof setTimeout>), clearTimeout: vi.fn() };
    const bar = createBarVisibility(vi.fn(), timers, 500);
    expect(timers.setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
    bar.poke();
    expect(timers.clearTimeout).toHaveBeenCalledWith(7);
  });
});
