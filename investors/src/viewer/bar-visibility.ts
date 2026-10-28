/**
 * Present mode's bar (W3-02): shown on any pointer, touch or key input, gone
 * after 3 s without any, and held while the mouse rests on it or keyboard
 * focus is on one of its controls (W3-RVW-3). Two small machines with
 * injectable timers and no DOM, so their tests run on fake ones;
 * use-bar-visibility.ts gives them to React.
 */

export const BAR_IDLE_MS = 3000;

export interface BarTimers {
  readonly setTimeout: (run: () => void, ms: number) => ReturnType<typeof setTimeout>;
  readonly clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
}

/** What holds the bar: the mouse resting on it, or keyboard focus on one of its controls. */
export type BarHold = "pointer" | "focus";

export interface BarVisibility {
  /** Any input: show the bar and start the 3 s again. */
  readonly poke: () => void;
  /**
   * One hold (the mouse unless named) is on (true): the bar stays; let go
   * (false): the 3 s start again once no other hold is on.
   */
  readonly hold: (held: boolean, source?: BarHold) => void;
  /** Present mode ended: no more changes. */
  readonly stop: () => void;
}

const browserTimers: BarTimers = {
  setTimeout: (run, ms) => setTimeout(run, ms),
  clearTimeout: (id) => clearTimeout(id),
};

function withHold(holds: ReadonlySet<BarHold>, source: BarHold, held: boolean): ReadonlySet<BarHold> {
  return held ? new Set([...holds, source]) : new Set([...holds].filter((hold) => hold !== source));
}

/** Starts shown, with the idle timer running; onChange hears every change of visibility. */
export function createBarVisibility(
  onChange: (visible: boolean) => void,
  timers: BarTimers = browserTimers,
  idleMs: number = BAR_IDLE_MS,
): BarVisibility {
  let visible = true;
  let holds: ReadonlySet<BarHold> = new Set();
  let stopped = false;
  let pending: ReturnType<typeof setTimeout> | null = null;

  const show = (next: boolean) => {
    if (stopped || next === visible) return;
    visible = next;
    onChange(next);
  };
  const cancel = () => {
    if (pending !== null) timers.clearTimeout(pending);
    pending = null;
  };
  const restart = () => {
    cancel();
    if (stopped || holds.size > 0) return;
    pending = timers.setTimeout(() => {
      pending = null;
      show(false);
    }, idleMs);
  };

  restart();
  return {
    poke: () => {
      show(true);
      restart();
    },
    hold: (next, source = "pointer") => {
      holds = withHold(holds, source, next);
      show(true);
      restart();
    },
    stop: () => {
      cancel();
      stopped = true;
    },
  };
}

export interface KeyboardFocus {
  /** A key went down. */
  readonly key: () => void;
  /** A pointer moved or went down (mouse, touch or pen). */
  readonly pointer: () => void;
  /** Focus is on one of the bar's controls (true) or on none of them (false). */
  readonly focus: (inside: boolean) => void;
}

/**
 * Keyboard focus on the bar (W3-RVW-3): focus is on one of its controls and
 * the latest input was a key, so the focus ring is showing. A click or a tap
 * that focuses a control is a pointer input, so the bar fades as before; the
 * next pointer input lets go too. onHold hears every change.
 */
export function createKeyboardFocus(onHold: (held: boolean) => void): KeyboardFocus {
  let byKey = false;
  let inside = false;
  let held = false;

  const update = () => {
    const next = byKey && inside;
    if (next === held) return;
    held = next;
    onHold(next);
  };
  return {
    key: () => {
      byKey = true;
      update();
    },
    pointer: () => {
      byKey = false;
      update();
    },
    focus: (next) => {
      inside = next;
      update();
    },
  };
}
