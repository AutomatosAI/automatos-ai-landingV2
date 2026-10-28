import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
import { useEffect, useRef, type FocusEvent, type PointerEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { BAR_FADE } from "./present-motion";
import type { SlideMove } from "./present-keys";

const copy = strings.viewer.present;

interface PresentBarProps {
  readonly page: number;
  /** Null until the document has loaded. */
  readonly pageCount: number | null;
  /** False after 3 s without input, unless held (use-bar-visibility.ts). */
  readonly visible: boolean;
  /** Offer Full screen: the browser has it and the overlay is not full screen yet. */
  readonly offerFullscreen: boolean;
  readonly onMove: (move: SlideMove) => void;
  readonly onFullscreen: () => void;
  readonly onExit: () => void;
  /** The mouse rests on the bar (true) or left it (false): it stays while it rests. */
  readonly onHold: (held: boolean) => void;
  /** Focus came onto one of the bar's controls (true) or left them all (false): it stays while that is keyboard focus. */
  readonly onFocusWithin: (inside: boolean) => void;
  /** The Download button (the page owns the download), raised to 44 px here. */
  readonly actions?: ReactNode;
  /** Why the last download failed: the page's own message is behind the slideshow. */
  readonly notice?: string | null;
}

const LABEL = "font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground";

/**
 * Present mode's controls, over the foot of the slide: "Slide N of M",
 * previous and next, Download, Full screen and Exit, every target 44 px.
 * They fade after 3 s without input and come back on any; they stay while
 * the mouse rests on them or keyboard focus is on one of them (W3-RVW-3).
 */
export function PresentBar(props: PresentBarProps) {
  const { page, pageCount, visible, offerFullscreen, onMove, onFullscreen, onExit, onHold, onFocusWithin, actions, notice } = props;
  const loaded = pageCount !== null;
  const shell = useRef<HTMLDivElement>(null);
  // A focused control that goes (Full screen, once granted) drops focus to <body>, and no blur says so.
  useEffect(() => {
    if (!shell.current?.contains(document.activeElement)) onFocusWithin(false);
  });
  const onPointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") onHold(true);
  };
  // Focus moving between two of the bar's controls stays inside it.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => onFocusWithin(event.currentTarget.contains(event.relatedTarget));
  return (
    <div
      ref={shell}
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        BAR_FADE,
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => onHold(false)}
      onFocus={() => onFocusWithin(true)}
      onBlur={onBlur}
    >
      {notice && (
        <p role="alert" className="max-w-prose rounded-md border bg-background px-3 py-2 text-sm text-destructive">
          {notice}
        </p>
      )}
      <div
        role="toolbar"
        aria-label={copy.toolbarLabel}
        className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-md border bg-background/90 p-1"
      >
        <Button type="button" variant="ghost" size="icon" onClick={() => onMove("back")} disabled={!loaded || page <= 1} aria-label={copy.previous}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <p aria-live="polite" className={cn("min-w-[7.5rem] px-1 text-center", LABEL)}>
          {loaded ? copy.slideOf(page, pageCount) : " "}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMove("next")}
          disabled={!loaded || page >= pageCount}
          aria-label={copy.next}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
        <div className="flex items-center [&_button]:h-11">{actions}</div>
        {offerFullscreen && (
          <Button type="button" variant="ghost" className="min-w-11 px-3" onClick={onFullscreen} aria-label={copy.fullscreen}>
            <Maximize aria-hidden="true" />
            <span className="hidden sm:inline">{copy.fullscreen}</span>
          </Button>
        )}
        <Button type="button" variant="ghost" className="min-w-11 px-3" onClick={onExit} aria-label={copy.exitLabel}>
          <X aria-hidden="true" />
          <span className="hidden sm:inline">{copy.exit}</span>
        </Button>
      </div>
    </div>
  );
}
