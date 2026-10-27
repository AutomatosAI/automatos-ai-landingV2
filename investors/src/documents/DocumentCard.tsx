import { Download } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { documentPath } from "@/lib/paths";
import { strings } from "@/strings";

import type { InvestorDocument } from "./documents-api";
import { KindIcon } from "./KindIcon";
import { documentFacts, viewerFor } from "./library-model";
import { useDownload, type DownloadAction } from "./use-download";

const copy = strings.library;

interface DocumentCardProps {
  readonly document: InvestorDocument;
  /** Reads the list again (the document went). */
  readonly onGone: () => void;
}

function OpenButton({ document, action }: { readonly document: InvestorDocument; readonly action: DownloadAction }) {
  const label = copy.actionLabel(copy.open, document.title);
  if (viewerFor(document.kind) !== null) {
    return (
      <Button asChild size="sm">
        <Link to={documentPath(document.id)} aria-label={label}>
          {copy.open}
        </Link>
      </Button>
    );
  }
  return (
    <Button type="button" size="sm" onClick={action.download} disabled={action.busy} aria-label={label}>
      {copy.open}
    </Button>
  );
}

/** Also the viewer's toolbar button and its fallback when a document cannot be shown. */
export function DownloadButton({ document, action }: { readonly document: InvestorDocument; readonly action: DownloadAction }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={action.download}
      disabled={action.busy}
      aria-label={copy.actionLabel(copy.download, document.title)}
    >
      <Download aria-hidden="true" />
      {action.busy ? copy.preparing : copy.download}
    </Button>
  );
}

/** One document: what it is, its facts, Open and Download (ported from the reference DataRoom card, KP12). */
export function DocumentCard({ document, onGone }: DocumentCardProps) {
  const action = useDownload(document.id, onGone);
  return (
    <Card className="flex h-full flex-col gap-4 p-5 transition-colors hover:border-foreground/30 sm:p-6">
      <div className="flex items-start gap-3">
        <KindIcon kind={document.kind} className="mt-1 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-2xl font-normal leading-tight tracking-tight">{document.title}</h3>
          {document.description && <p className="mt-2 text-sm text-muted-foreground">{document.description}</p>}
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {documentFacts(document).join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <OpenButton document={document} action={action} />
        <DownloadButton document={document} action={action} />
      </div>
      {action.message && (
        <p role="alert" className="text-sm text-destructive">
          {action.message}
        </p>
      )}
    </Card>
  );
}
