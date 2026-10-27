import { ArrowLeft } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { isStorageUnavailable, screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { PageLoading } from "@/components/shell/PageLoading";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/documents/DocumentCard";
import type { InvestorDocument } from "@/documents/documents-api";
import { viewerFor, type DocumentViewer } from "@/documents/library-model";
import { isGone } from "@/documents/messages";
import { useDocuments } from "@/documents/use-documents";
import { useDownload } from "@/documents/use-download";
import { DOCUMENTS_PATH } from "@/lib/paths";
import { strings } from "@/strings";
import { usePageViewFeed } from "@/tracking/use-page-view-feed";
import { useVideoProgressFeed } from "@/tracking/use-video-progress-feed";
import { useViewerLink, type ViewerLink } from "@/viewer/use-viewer-link";
import { isPresentRequested, withoutPresent } from "@/viewer/present-route";
import { START, type VideoFailure } from "@/viewer/video-model";
import { VideoPlayer } from "@/viewer/VideoPlayer";
import { ViewerFrame, ViewerLoading, ViewerPending, ViewerStorageUnavailable } from "@/viewer/ViewerStates";

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

/** The list could not be read because document storage is down: the viewer's error under the Back link. */
function StorageUnavailable({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <BackLink />
      <div className="mt-6">
        <ViewerStorageUnavailable onRetry={onRetry} />
      </div>
    </section>
  );
}

interface BodyProps {
  readonly document: InvestorDocument;
  readonly link: ViewerLink;
  readonly download: ReactNode;
  /** Why the last download failed (the PDF's present mode repeats it). */
  readonly notice: string | null;
}

/** ?present=1 starts the PDF in present mode; leaving present mode drops it (W3-02). */
function usePresentParam() {
  const [params, setParams] = useSearchParams();
  const present = isPresentRequested(params);
  const onPresentExit = useCallback(() => {
    if (present) setParams(withoutPresent(params), { replace: true });
  }, [params, present, setParams]);
  return { present, onPresentExit };
}

function PdfBody({ document, link, download, notice }: BodyProps) {
  // Each page read becomes a page_view of this version (the tracker, US-010), slides in present mode too.
  const onPageVisible = usePageViewFeed(document.id, document.version);
  const { present, onPresentExit } = usePresentParam();
  const { phase } = link;
  if (phase.kind !== "ready") return <ViewerPending phase={phase} onRetry={link.retry} download={download} />;
  const loading = (
    <ViewerFrame>
      <ViewerLoading />
    </ViewerFrame>
  );
  return (
    <Suspense fallback={loading}>
      <PdfViewer
        key={phase.url}
        url={phase.url}
        title={document.title}
        onLoadError={link.onLoadError}
        onPageVisible={onPageVisible}
        actions={download}
        notice={notice}
        present={present}
        onPresentExit={onPresentExit}
      />
    </Suspense>
  );
}

function VideoBody({ document, link, download }: BodyProps) {
  // Each milestone watched becomes a video_progress, once per open (US-008).
  const onProgress = useVideoProgressFeed(document.id);
  // Where a refused link stopped: the next link's player picks up there.
  const [resume, setResume] = useState(START);
  const { phase, onLoadError } = link;
  const onFailure = useCallback(
    (failure: VideoFailure) => {
      setResume(failure.at);
      onLoadError(failure.error);
    },
    [onLoadError],
  );
  if (phase.kind !== "ready") {
    return <ViewerPending phase={phase} onRetry={link.retry} download={download} loadFailedBody={copy.video.failed} />;
  }
  return (
    <VideoPlayer
      key={phase.url}
      url={phase.url}
      title={document.title}
      resume={resume}
      onFailure={onFailure}
      onPlaying={link.onPlayed}
      onProgress={onProgress}
      actions={download}
    />
  );
}

function DocumentBody({ viewer, ...body }: BodyProps & { readonly viewer: DocumentViewer | null }) {
  if (viewer === "pdf") return <PdfBody {...body} />;
  if (viewer === "video") return <VideoBody {...body} />;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border p-5 sm:p-6">
      <p className="text-muted-foreground">{copy.notViewable}</p>
      {body.download}
    </div>
  );
}

interface DocumentViewProps {
  readonly userId: string;
  readonly document: InvestorDocument;
  /** Reads the library again (the document went). */
  readonly onGone: () => void;
}

function DocumentView({ userId, document, onGone }: DocumentViewProps) {
  const viewer = viewerFor(document.kind);
  const link = useViewerLink(userId, document.id, viewer !== null);
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
      <DocumentBody viewer={viewer} document={document} link={link} download={download} notice={action.message} />
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
  if (documents.isError && isStorageUnavailable(documents.error)) return <StorageUnavailable onRetry={onGone} />;
  if (documents.isError) return <ApiErrorPage screen={screenForError(documents.error)} onRetry={onGone} />;
  if (documents.isPending) return <PageLoading />;
  const document = documents.data.find((candidate) => candidate.id === documentId);
  if (!document) return <MissingDocument />;
  // Keyed: another document is another open, with its own link, position and milestones.
  return <DocumentView key={document.id} userId={userId} document={document} onGone={onGone} />;
}

/** /investors/documents/:id: a published PDF, read page by page (US-007), or a video, watched (US-008). */
export function Viewer() {
  const state = useAuthState();
  const { id = "" } = useParams();
  // PortalGate renders the pages only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <ViewerScreen userId={state.userId} documentId={id} />;
}
