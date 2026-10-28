import { useCallback, useEffect, useRef, useState } from "react";

import { createBarVisibility, type BarVisibility } from "./bar-visibility";

/** The pointer, touch and key input that brings the bar back. */
const INPUTS = ["pointermove", "pointerdown", "keydown"] as const;

export interface BarState {
  readonly visible: boolean;
  /** The mouse rests on the bar (true) or left it (false). */
  readonly hold: (held: boolean) => void;
}

/**
 * Present mode's bar (bar-visibility.ts) while `active`: shown on entering,
 * gone after 3 s without input, back on any pointer, touch or key.
 */
export function useBarVisibility(active: boolean): BarState {
  const [visible, setVisible] = useState(true);
  const model = useRef<BarVisibility | null>(null);

  useEffect(() => {
    if (!active) return;
    const bar = createBarVisibility(setVisible);
    model.current = bar;
    setVisible(true);
    const poke = () => bar.poke();
    INPUTS.forEach((input) => window.addEventListener(input, poke));
    return () => {
      INPUTS.forEach((input) => window.removeEventListener(input, poke));
      bar.stop();
      model.current = null;
    };
  }, [active]);

  const hold = useCallback((held: boolean) => model.current?.hold(held), []);
  return { visible: !active || visible, hold };
}
