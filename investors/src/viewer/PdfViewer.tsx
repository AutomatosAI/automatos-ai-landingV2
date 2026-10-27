// Sets pdf.js's worker to the copy bundled with the app (pdf.worker.min.mjs?url, no CDN).
import "@/lib/pdfjs";

import { useCallback, useState, type ReactNode } from "react";
import { Document, Page } from "react-pdf";

import { strings } from "@/strings";

import { stepPage } from "./page-model";
import { PDF_OPTIONS } from "./pdf-options";
import { useArrowKeys } from "./use-arrow-keys";
import { useFitWidth } from "./use-fit-width";
import { usePageVisibility } from "./use-page-visibility";
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
  /** A page was at least 50% visible for at least 1000 ms (the tracker, W1-14). */
  readonly onPageVisible?: OnPageVisible;
  /** The toolbar's Download button. */
  readonly actions?: ReactNode;
}

/**
 * One page at a time, fit to the width of the screen (ported from the
 * reference CoaPdfViewer, KP12): previous and next, the arrow keys,
 * "Page N of M", and the visibility model for the page events.
 */
export function PdfViewer({ url, title, onLoadError, onPageVisible, actions }: PdfViewerProps) {
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [rendered, setRendered] = useState<number | null>(null);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const width = useFitWidth(stage);
  const step = useCallback((delta: number) => setPage((current) => stepPage(current, delta, pageCount)), [pageCount]);
  useArrowKeys(step);
  usePageVisibility(stage, rendered === page ? page : null, onPageVisible);

  return (
    <div className="rounded-lg border">
      <ViewerToolbar page={page} pageCount={pageCount} onStep={step} actions={actions} />
      <div className="bg-secondary p-2 sm:p-4">
        <div ref={setStage} className="flex justify-center">
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
              <div role="img" aria-label={copy.pageLabel(title, page, pageCount ?? page)}>
                <Page
                  pageNumber={page}
                  width={width}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={(shown) => setRendered(shown.pageNumber)}
                  loading={<ViewerLoading label={copy.loadingPage} />}
                  className="bg-white"
                />
              </div>
            )}
          </Document>
        </div>
      </div>
      <p className="hidden border-t px-4 py-2 text-xs text-muted-foreground sm:block">{copy.keyboardHint}</p>
    </div>
  );
}
