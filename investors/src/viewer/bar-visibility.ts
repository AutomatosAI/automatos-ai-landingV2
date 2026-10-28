/**
 * Present mode's bar (W3-02): shown on any pointer, touch or key input, gone
 * after 3 s without any, and held while the investor's focus or pointer is
 * on it. A small timer machine with injectable timers, so its test runs on
 * fake ones; use-bar-visibility.ts gives it to React.
 */

export const BAR_IDLE_MS = 3000;

export interface BarTimers {
  readonly setTimeout: (run: () => void, ms: number) => ReturnType<typeof setTimeout>;
  readonly clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
}

export interface BarVisibility {
  /** Any input: show the bar and start the 3 s again. */
  readonly poke: () => void;
  /** Focus or a pointer is on the bar (true): it stays; let go (false): the 3 s start again. */
  readonly hold: (held: boolean) => void;
  /** Present mode ended: no more changes. */
  readonly stop: () => void;
}

const browserTimers: BarTimers = {
  setTimeout: (run, ms) => setTimeout(run, ms),
  clearTimeout: (id) => clearTimeout(id),
};

/** Starts shown, with the idle timer running; onChange hears every change of visibility. */
export function createBarVisibility(
  onChange: (visible: boolean) => void,
  timers: BarTimers = browserTimers,
  idleMs: number = BAR_IDLE_MS,
): BarVisibility {
  let visible = true;
  let held = false;
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
    if (stopped || held) return;
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
    hold: (next) => {
      held = next;
      show(true);
      restart();
    },
    stop: () => {
      cancel();
      stopped = true;
    },
  };
}
