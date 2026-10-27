import { FileWarning, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

const copy = strings.viewer;

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
