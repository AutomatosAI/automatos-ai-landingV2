import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

const copy = strings.viewer;

interface ViewerToolbarProps {
  readonly page: number;
  /** Null until the document has loaded. */
  readonly pageCount: number | null;
  readonly onStep: (delta: number) => void;
  /** The Download button (the page owns the download). */
  readonly actions?: ReactNode;
}

/**
 * Previous and next, "Page N of M" and Download (ported from the reference
 * viewer's toolbar, KP12). Sticks under the site header, so the controls stay
 * in reach on a phone while the page scrolls.
 */
export function ViewerToolbar({ page, pageCount, onStep, actions }: ViewerToolbarProps) {
  const loaded = pageCount !== null;
  return (
    <div
      role="toolbar"
      aria-label={copy.toolbarLabel}
      className="sticky top-14 z-30 flex flex-wrap items-center justify-between gap-2 border-b bg-background/90 px-3 py-2 backdrop-blur-md sm:px-4"
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onStep(-1)}
          disabled={!loaded || page <= 1}
          aria-label={copy.previous}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <p
          aria-live="polite"
          className="min-w-[7.5rem] px-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          {loaded ? copy.pageOf(page, pageCount) : " "}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onStep(1)}
          disabled={!loaded || page >= pageCount}
          aria-label={copy.next}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      {actions}
    </div>
  );
}
