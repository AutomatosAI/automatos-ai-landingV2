import { useEffect, useState } from "react";

import type { Size } from "./fit-screen";

function sizeOf(width: number, height: number): Size | null {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? { width, height } : null;
}

/**
 * The width and height of `element`'s content box while `active` (present
 * mode's stage), followed with a ResizeObserver so turning a phone or leaving
 * full screen re-fits the slide. Null while inactive or without room.
 */
export function useBoxSize(element: HTMLElement | null, active: boolean): Size | null {
  const [size, setSize] = useState<Size | null>(null);
  useEffect(() => {
    if (!element || !active) {
      setSize(null);
      return;
    }
    setSize(sizeOf(element.clientWidth, element.clientHeight));
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setSize(sizeOf(entry.contentRect.width, entry.contentRect.height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, active]);
  return size;
}
