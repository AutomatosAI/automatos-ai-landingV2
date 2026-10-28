import { useCallback, useRef, type PointerEvent } from "react";

import { gestureMove, type Point } from "./swipe-model";
import type { SlideMove } from "./present-keys";

export interface SlideGestures {
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerCancel: () => void;
}

/**
 * Swipes and taps on the slide's area (swipe-model.ts), from the primary
 * pointer only: a second finger (a pinch) or a cancelled touch moves nothing.
 * A mouse click on a third turns the slide as a tap does.
 */
export function useSlideGestures(onMove: (move: SlideMove) => void): SlideGestures {
  const down = useRef<{ readonly id: number; readonly at: Point } | null>(null);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    down.current = event.isPrimary && event.button === 0 ? { id: event.pointerId, at: { x: event.clientX, y: event.clientY } } : null;
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = down.current;
      down.current = null;
      if (!start || start.id !== event.pointerId) return;
      const area = event.currentTarget.getBoundingClientRect();
      const move = gestureMove(start.at, { x: event.clientX, y: event.clientY }, { left: area.left, width: area.width });
      if (move !== "none") onMove(move);
    },
    [onMove],
  );

  const onPointerCancel = useCallback(() => {
    down.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
