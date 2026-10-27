import { useEffect, useState } from "react";

import { fitWidth } from "./page-model";

/**
 * The page width that fits `element` (no padding of its own), followed with
 * a ResizeObserver so turning a phone or resizing a window re-fits the page.
 * Null until the element is there and has a width.
 */
export function useFitWidth(element: HTMLElement | null): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    if (!element) return;
    setWidth(fitWidth(element.clientWidth));
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setWidth(fitWidth(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return width;
}
