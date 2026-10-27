import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** The browser can put an element full screen (an iPhone's Safari cannot: it offers that to video only). */
export function fullscreenAvailable(): boolean {
  return typeof document !== "undefined" && document.fullscreenEnabled === true;
}

/**
 * Asks for full screen. A refusal (no gesture, a policy, an older browser) is
 * the expected fallback, not an error: the overlay already fills the window.
 */
function askFullscreen(element: HTMLElement): void {
  if (!fullscreenAvailable() || typeof element.requestFullscreen !== "function") return;
  try {
    void Promise.resolve(element.requestFullscreen()).catch(() => undefined);
  } catch {
    // Refused at once: the overlay stays.
  }
}

function leaveFullscreen(element: HTMLElement | null): void {
  if (!element || document.fullscreenElement !== element || typeof document.exitFullscreen !== "function") return;
  void Promise.resolve(document.exitFullscreen()).catch(() => undefined);
}

export interface PresentMode {
  readonly presenting: boolean;
  /** The viewer is the browser's full-screen element; otherwise present mode is the overlay. */
  readonly fullscreen: boolean;
  /** The overlay may offer its Full screen button. */
  readonly canFullscreen: boolean;
  /** From a click (full screen needs the gesture): present mode, full screen when the browser grants it. */
  readonly start: () => void;
  /** From a click in the overlay: full screen. */
  readonly enterFullscreen: () => void;
  readonly exit: () => void;
  /** The button that started present mode: focus goes back to it on exit. */
  readonly triggerRef: RefObject<HTMLButtonElement>;
}

/** Focus moves into the slideshow when it starts, and back to its button when it ends. */
function useFocusHandoff(container: HTMLElement | null, presenting: boolean, trigger: RefObject<HTMLButtonElement>): void {
  const shown = useRef(false);
  useEffect(() => {
    if (presenting) {
      shown.current = true;
      container?.focus({ preventScroll: true });
    } else if (shown.current) {
      shown.current = false;
      trigger.current?.focus();
    }
  }, [container, presenting, trigger]);
}

/**
 * Present mode (W3-02) for the viewer's `container`: the Fullscreen API when
 * the browser has it and grants it, else the overlay. Leaving full screen by
 * any route (Esc, the browser's own UI) leaves present mode; onExit hears
 * every way out.
 */
export function usePresentMode(container: HTMLElement | null, initial: boolean, onExit?: () => void): PresentMode {
  const [presenting, setPresenting] = useState(initial);
  const [fullscreen, setFullscreen] = useState(false);
  const wasFullscreen = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const exitHandler = useRef(onExit);
  useEffect(() => {
    exitHandler.current = onExit;
  }, [onExit]);

  const leave = useCallback(() => {
    setPresenting(false);
    exitHandler.current?.();
  }, []);
  const start = useCallback(() => {
    setPresenting(true);
    if (container) askFullscreen(container);
  }, [container]);
  const enterFullscreen = useCallback(() => {
    if (container) askFullscreen(container);
  }, [container]);
  const exit = useCallback(() => {
    wasFullscreen.current = false;
    leaveFullscreen(container);
    leave();
  }, [container, leave]);

  useEffect(() => {
    if (!container) return;
    const onChange = () => {
      const now = document.fullscreenElement === container;
      if (wasFullscreen.current && !now) leave();
      wasFullscreen.current = now;
      setFullscreen(now);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      leaveFullscreen(container);
    };
  }, [container, leave]);

  useFocusHandoff(container, presenting, triggerRef);
  return { presenting, fullscreen, canFullscreen: fullscreenAvailable(), start, enterFullscreen, exit, triggerRef };
}
