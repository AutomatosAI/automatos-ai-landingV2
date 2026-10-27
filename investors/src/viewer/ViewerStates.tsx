import { FileWarning, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { linkFailureMessage } from "@/documents/messages";
import { strings } from "@/strings";

import type { ViewerPhase } from "./link-model";

const copy = strings.viewer;

/** The bordered frame the viewers' states sit in (the players draw their own). */
export function ViewerFrame({ children }: { readonly children: ReactNode }) {
  return <div className="rounded-lg border">{children}</div>;
}

/** While the link is issued, the document loads or a page renders. */
export function ViewerLoading({ label = copy.loading }: { readonly label?: string }) {
  return (
    <div role="status" className="flex min-h-[240px] items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {label}
    </div>
  );
}

interface ViewerFailedProps {
  /** Why, in plain words (the link's message); the default says the document could not be shown. */
  readonly message?: string;
  readonly onRetry: () => void;
  /** The Download fallback. */
  readonly download: ReactNode;
}

/** The document could not be shown: try again, or download it instead (ported from the reference viewer's error). */
export function ViewerFailed({ message = copy.failed.body, onRetry, download }: ViewerFailedProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <FileWarning aria-hidden="true" className="size-8 text-muted-foreground" />
      <div role="alert" className="max-w-prose">
        <p className="font-serif text-2xl leading-tight">{copy.failed.title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {download}
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {copy.retry}
        </Button>
      </div>
    </div>
  );
}

/** Every phase but "ready": the link on its way, or a failure. */
export type PendingPhase = Exclude<ViewerPhase, { readonly kind: "ready" }>;

interface ViewerPendingProps {
  readonly phase: PendingPhase;
  readonly onRetry: () => void;
  /** The Download fallback. */
  readonly download: ReactNode;
  /** Why, when the file would not load; the default speaks of reading it. */
  readonly loadFailedBody?: string;
}

/** What the PDF viewer and the video player show until their link is ready. */
export function ViewerPending({ phase, onRetry, download, loadFailedBody }: ViewerPendingProps) {
  switch (phase.kind) {
    case "linking":
      return (
        <ViewerFrame>
          <ViewerLoading />
        </ViewerFrame>
      );
    case "link_failed":
      return (
        <ViewerFrame>
          <ViewerFailed message={linkFailureMessage(phase.error)} onRetry={onRetry} download={download} />
        </ViewerFrame>
      );
    case "load_failed":
      return (
        <ViewerFrame>
          <ViewerFailed message={loadFailedBody} onRetry={onRetry} download={download} />
        </ViewerFrame>
      );
  }
}
