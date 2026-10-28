// Sets pdf.js's worker to the copy bundled with the app (pdf.worker.min.mjs?url, no CDN).
import "@/lib/pdfjs";
import "./present-stage.css";

import { useCallback, useState, type ReactNode } from "react";
import { Document } from "react-pdf";

import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { slideWidth, type Size } from "./fit-screen";
import { stepPage } from "./page-model";
import { PdfPage } from "./PdfPage";
import { PDF_OPTIONS } from "./pdf-options";
import { moveSlide, type SlideMove } from "./present-keys";
import { PresentBar } from "./PresentBar";
import { useArrowKeys } from "./use-arrow-keys";
import { useFitWidth } from "./use-fit-width";
import { usePageVisibility } from "./use-page-visibility";
import { usePresenter } from "./use-presenter";
import { ViewerLoading } from "./ViewerStates";
import { ViewerToolbar } from "./ViewerToolbar";
import type { OnPageVisible } from "./visibility-model";

const copy = strings.viewer;

export interface PdfViewerProps {
  /** The presigned inline link (the page renews it, keyed on this URL). */
  readonly url: string;
  readonly title: string;
  /** pdf.js could not load the link: an expired one (403) is renewed once by the page. */
  readonly onLoadError: (error: unknown) => void;
  /** A page was at least 50% visible for at least 1000 ms (the tracker, W1-14), in present mode too. */
  readonly onPageVisible?: OnPageVisible;
  /** The toolbar's Download button. */
  readonly actions?: ReactNode;
  /** Why the last download failed, repeated in present mode, where the page's own line is hidden. */
  readonly notice?: string | null;
  /** Start in present mode (/documents/:id?present=1, W3-02). */
  readonly present?: boolean;
  /** Present mode ended, by any route. */
  readonly onPresentExit?: () => void;
}

function sameSize(a: Size | null, b: Size): boolean {
  return a !== null && a.width === b.width && a.height === b.height;
}

const PRESENT_FRAME =
  "present-stage fixed inset-0 z-50 flex touch-pinch-zoom flex-col overflow-hidden overscroll-none bg-background text-foreground outline-none";

/**
 * One page at a time, fit to the width of the screen (ported from the
 * reference CoaPdfViewer, KP12): previous and next, the arrow keys,
 * "Page N of M", and the visibility model for the page events. Present
 * (W3-02) turns the same viewer into a slideshow: the container goes full
 * screen (or becomes the overlay), one slide fills it, and the one Document
 * stays loaded, so presenting never asks for another link.
 */
export function PdfViewer(props: PdfViewerProps) {
  const { url, title, onLoadError, onPageVisible, actions, notice, present = false, onPresentExit } = props;
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [rendered, setRendered] = useState<number | null>(null);
  const [slide, setSlide] = useState<Size | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const step = useCallback((delta: number) => setPage((current) => stepPage(current, delta, pageCount)), [pageCount]);
  const move = useCallback((to: SlideMove) => setPage((current) => moveSlide(current, to, pageCount)), [pageCount]);
  const onSize = useCallback((size: Size) => setSlide((current) => (sameSize(current, size) ? current : size)), []);
  const presenter = usePresenter({ container, stage, initial: present, onExit: onPresentExit, onMove: move });
  const { presenting, bar } = presenter;
  const fitted = useFitWidth(stage);
  const width = presenting ? slideWidth(slide, presenter.box) : fitted;
  useArrowKeys(step, !presenting);
  // The same stage in both modes: a slide seen while presenting is a page read (KP20).
  usePageVisibility(stage, rendered === page ? page : null, onPageVisible);

  const presentFrame = { role: "dialog", "aria-modal": true, "aria-label": copy.present.label(title), tabIndex: -1 } as const;
  return (
    <div
      ref={setContainer}
      className={presenting ? cn(PRESENT_FRAME, !bar.visible && "cursor-none") : "rounded-lg border"}
      {...(presenting ? presentFrame : {})}
    >
      {presenting ? (
        <PresentBar
          page={page}
          pageCount={pageCount}
          visible={bar.visible}
          offerFullscreen={presenter.canFullscreen && !presenter.fullscreen}
          onMove={move}
          onFullscreen={presenter.enterFullscreen}
          onExit={presenter.exit}
          onHold={bar.hold}
          onFocusWithin={bar.focusWithin}
          actions={actions}
          notice={notice}
        />
      ) : (
        <ViewerToolbar
          page={page}
          pageCount={pageCount}
          onStep={step}
          actions={actions}
          onPresent={presenter.start}
          presentRef={presenter.triggerRef}
        />
      )}
      <div className={presenting ? "min-h-0 flex-1" : "bg-secondary p-2 sm:p-4"} {...(presenting ? presenter.gestures : {})}>
        <div ref={setStage} className={presenting ? "flex size-full items-center justify-center" : "flex justify-center"}>
          <Document
            file={url}
            options={PDF_OPTIONS}
            onLoadSuccess={(pdf) => setPageCount(pdf.numPages)}
            onLoadError={onLoadError}
            onSourceError={onLoadError}
            loading={<ViewerLoading />}
            error={<ViewerLoading />}
          >
            {width !== null && (
              <PdfPage
                title={title}
                page={page}
                pageCount={pageCount}
                width={width}
                presenting={presenting}
                onRendered={setRendered}
                onSize={onSize}
              />
            )}
          </Document>
        </div>
      </div>
      {!presenting && <p className="hidden border-t px-4 py-2 text-xs text-muted-foreground sm:block">{copy.keyboardHint}</p>}
    </div>
  );
}
