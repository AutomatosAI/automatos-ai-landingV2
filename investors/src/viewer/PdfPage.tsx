import { Page } from "react-pdf";

import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import type { Size } from "./fit-screen";
import { SLIDE_FADE } from "./present-motion";
import { ViewerLoading } from "./ViewerStates";

const copy = strings.viewer;

/** What pdf.js tells of a loaded page: its size as shown at scale 1, its own rotation included. */
interface LoadedPage {
  readonly getViewport: (options: { scale: number }) => { readonly width: number; readonly height: number };
}

interface PdfPageProps {
  readonly title: string;
  readonly page: number;
  readonly pageCount: number | null;
  readonly width: number;
  /** Present mode: a slide, fading in, with no loading line between slides. */
  readonly presenting: boolean;
  readonly onRendered: (page: number) => void;
  /** The page's own size, so present mode can fit it whole. */
  readonly onSize: (size: Size) => void;
}

/** One page of the PDF at `width`, read as an image with its place in the document. */
export function PdfPage({ title, page, pageCount, width, presenting, onRendered, onSize }: PdfPageProps) {
  const count = pageCount ?? page;
  const label = presenting ? copy.present.slideLabel(title, page, count) : copy.pageLabel(title, page, count);
  const onLoadSuccess = (loaded: LoadedPage) => {
    const viewport = loaded.getViewport({ scale: 1 });
    onSize({ width: viewport.width, height: viewport.height });
  };
  return (
    <div role="img" aria-label={label}>
      <Page
        pageNumber={page}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={onLoadSuccess}
        onRenderSuccess={(shown) => onRendered(shown.pageNumber)}
        loading={presenting ? null : <ViewerLoading label={copy.loadingPage} />}
        className={cn("bg-white", presenting && SLIDE_FADE)}
      />
    </div>
  );
}
