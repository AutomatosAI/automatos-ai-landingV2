import { useCallback, useEffect, useRef, useState } from "react";

import { createBarVisibility, createKeyboardFocus, type BarVisibility, type KeyboardFocus } from "./bar-visibility";

/** The pointer, touch and key input that brings the bar back. */
const INPUTS = ["pointermove", "pointerdown", "keydown"] as const;
/** The pointer and touch input that ends keyboard focus's hold. */
const POINTER_INPUTS = ["pointermove", "pointerdown"] as const;
/** Heard on the way down, so a control that stops an input from bubbling cannot hide what kind it was. */
const CAPTURE = { capture: true } as const;

export interface BarState {
  readonly visible: boolean;
  /** The mouse rests on the bar (true) or left it (false). */
  readonly hold: (held: boolean) => void;
  /** Focus is on one of the bar's controls (true) or on none (false): it holds the bar while the latest input is a key. */
  readonly focusWithin: (inside: boolean) => void;
}

interface Models {
  readonly bar: BarVisibility;
  readonly focus: KeyboardFocus;
}

/** Wires the models to the window's input; returns the unwiring. */
function listen({ bar, focus }: Models): () => void {
  const poke = () => bar.poke();
  INPUTS.forEach((input) => window.addEventListener(input, poke));
  window.addEventListener("keydown", focus.key, CAPTURE);
  POINTER_INPUTS.forEach((input) => window.addEventListener(input, focus.pointer, CAPTURE));
  return () => {
    INPUTS.forEach((input) => window.removeEventListener(input, poke));
    window.removeEventListener("keydown", focus.key, CAPTURE);
    POINTER_INPUTS.forEach((input) => window.removeEventListener(input, focus.pointer, CAPTURE));
  };
}

/**
 * Present mode's bar (bar-visibility.ts) while `active`: shown on entering,
 * gone after 3 s without input, back on any pointer, touch or key. It stays
 * while the mouse rests on it, and while keyboard focus is on one of its
 * controls (W3-RVW-3) until focus leaves them or the next pointer input.
 */
export function useBarVisibility(active: boolean): BarState {
  const [visible, setVisible] = useState(true);
  const models = useRef<Models | null>(null);

  useEffect(() => {
    if (!active) return;
    const bar = createBarVisibility(setVisible);
    const focus = createKeyboardFocus((held) => bar.hold(held, "focus"));
    models.current = { bar, focus };
    setVisible(true);
    const unlisten = listen(models.current);
    return () => {
      unlisten();
      bar.stop();
      models.current = null;
    };
  }, [active]);

  const hold = useCallback((held: boolean) => models.current?.bar.hold(held), []);
  const focusWithin = useCallback((inside: boolean) => models.current?.focus.focus(inside), []);
  return { visible: !active || visible, hold, focusWithin };
}
