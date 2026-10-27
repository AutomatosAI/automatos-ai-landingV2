import { ArrowLeft } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { PageLoading } from "@/components/shell/PageLoading";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/documents/DocumentCard";
import type { InvestorDocument } from "@/documents/documents-api";
import { opensInViewer } from "@/documents/library-model";
import { isGone, linkFailureMessage } from "@/documents/messages";
import { useDocuments } from "@/documents/use-documents";
import { useDownload } from "@/documents/use-download";
import { DOCUMENTS_PATH } from "@/lib/paths";
import { strings } from "@/strings";
import type { ViewerPhase } from "@/viewer/link-model";
import { useViewerLink } from "@/viewer/use-viewer-link";
import { ViewerFailed, ViewerLoading } from "@/viewer/ViewerStates";

import { ApiErrorPage } from "./ApiErrorPage";
import { StatusPage } from "./StatusPage";

// react-pdf and pdf.js load with the first document opened, not with the portal.
const PdfViewer = lazy(() => import("@/viewer/PdfViewer").then((module) => ({ default: module.PdfViewer })));

const copy = strings.viewer;

function BackLink() {
  return (
    <Link
      to={DOCUMENTS_PATH}
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-3.5" />
      {copy.back}
    </Link>
  );
}

function MissingDocument() {
  const back = (
    <Button asChild variant="outline">
      <Link to={DOCUMENTS_PATH}>{copy.back}</Link>
    </Button>
  );
  return (
    <StatusPage title={copy.missing.title} actions={back}>
      <p>{copy.missing.body}</p>
    </StatusPage>
  );
}

interface ViewerBodyProps {
  readonly document: InvestorDocument;
  readonly phase: ViewerPhase;
  readonly onLoadError: (error: unknown) => void;
  readonly onRetry: () => void;
  readonly download: ReactNode;
}

function ViewerBody({ document, phase, onLoadError, onRetry, download }: ViewerBodyProps) {
  const frame = (child: ReactNode) => <div className="rounded-lg border">{child}</div>;
  switch (phase.kind) {
    case "linking":
      return frame(<ViewerLoading />);
    case "link_failed":
      return frame(<ViewerFailed message={linkFailureMessage(phase.error)} onRetry={onRetry} download={download} />);
    case "load_failed":
      return frame(<ViewerFailed onRetry={onRetry} download={download} />);
    case "ready":
      return (
        <Suspense fallback={frame(<ViewerLoading />)}>
          <PdfViewer key={phase.url} url={phase.url} title={document.title} onLoadError={onLoadError} actions={download} />
        </Suspense>
      );
  }
}

interface DocumentViewProps {
  readonly userId: string;
  readonly document: InvestorDocument;
  /** Reads the library again (the document went). */
  readonly onGone: () => void;
}

function DocumentView({ userId, document, onGone }: DocumentViewProps) {
  const viewable = opensInViewer(document.kind);
  const link = useViewerLink(userId, document.id, viewable);
  const action = useDownload(document.id, onGone);
  const download = <DownloadButton document={document} action={action} />;
  const gone = link.phase.kind === "link_failed" && isGone(link.phase.error);
  useEffect(() => {
    if (gone) onGone();
  }, [gone, onGone]);

  // Unpublished or deleted since the list was read (the link answered 404).
  if (gone) return <MissingDocument />;
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <BackLink />
      <h1 className="mb-6 mt-4 font-serif text-3xl font-normal leading-tight tracking-[-0.01em] sm:text-4xl">
        {document.title}
      </h1>
      {viewable ? (
        <ViewerBody document={document} phase={link.phase} onLoadError={link.onLoadError} onRetry={link.retry} download={download} />
      ) : (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border p-5 sm:p-6">
          <p className="text-muted-foreground">{copy.notViewable}</p>
          {download}
        </div>
      )}
      {action.message && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {action.message}
        </p>
      )}
    </section>
  );
}

function ViewerScreen({ userId, documentId }: { readonly userId: string; readonly documentId: string }) {
  const documents = useDocuments(userId);
  const { refetch } = documents;
  const onGone = useCallback(() => void refetch(), [refetch]);
  if (documents.isError) return <ApiErrorPage screen={screenForError(documents.error)} onRetry={onGone} />;
  if (documents.isPending) return <PageLoading />;
  const document = documents.data.find((candidate) => candidate.id === documentId);
  if (!document) return <MissingDocument />;
  return <DocumentView userId={userId} document={document} onGone={onGone} />;
}

/** /investors/documents/:id: a published PDF, read page by page (US-007). */
export function Viewer() {
  const state = useAuthState();
  const { id = "" } = useParams();
  // PortalGate renders the pages only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <ViewerScreen userId={state.userId} documentId={id} />;
}
