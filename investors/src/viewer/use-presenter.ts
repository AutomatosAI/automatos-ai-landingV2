import { useCallback } from "react";

import type { Size } from "./fit-screen";
import type { PresentAction, SlideMove } from "./present-keys";
import { useBarVisibility, type BarState } from "./use-bar-visibility";
import { useBoxSize } from "./use-box-size";
import { usePresentKeys } from "./use-present-keys";
import { usePresentMode, type PresentMode } from "./use-present-mode";
import { useSlideGestures, type SlideGestures } from "./use-slide-gestures";

export interface Presenter extends PresentMode {
  readonly bar: BarState;
  /** The stage's size while presenting (the slide fits it whole); null otherwise. */
  readonly box: Size | null;
  /** Swipes and taps for the slide's area. */
  readonly gestures: SlideGestures;
}

interface PresenterOptions {
  /** The viewer: what goes full screen, or becomes the overlay. */
  readonly container: HTMLElement | null;
  /** Where the slide sits. */
  readonly stage: HTMLElement | null;
  /** Start in present mode (/documents/:id?present=1). */
  readonly initial: boolean;
  readonly onExit?: () => void;
  /** A key, a swipe or a tap moved the slideshow. */
  readonly onMove: (move: SlideMove) => void;
}

/** Everything present mode needs (W3-02): the mode, its bar, the stage's size, keys, swipes and taps. */
export function usePresenter({ container, stage, initial, onExit, onMove }: PresenterOptions): Presenter {
  const mode = usePresentMode(container, initial, onExit);
  const bar = useBarVisibility(mode.presenting);
  const box = useBoxSize(stage, mode.presenting);
  const gestures = useSlideGestures(onMove);
  const { exit } = mode;
  const onAction = useCallback((action: PresentAction) => (action === "exit" ? exit() : onMove(action)), [exit, onMove]);
  usePresentKeys(mode.presenting, onAction);
  return { ...mode, bar, box, gestures };
}
