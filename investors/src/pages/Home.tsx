import { useCallback } from "react";

import { isStorageUnavailable, screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { DocumentGroups } from "@/documents/DocumentGroups";
import type { InvestorDocument } from "@/documents/documents-api";
import { groupsBelowPitch, hasFeaturedPitch, pickFeaturedPitch } from "@/documents/library-model";
import { DocumentsUnavailable, EmptyLibrary, LibrarySkeleton } from "@/documents/LibraryStates";
import { PitchFeature } from "@/documents/PitchFeature";
import { useDocuments } from "@/documents/use-documents";
import { OverviewBlock } from "@/sections/OverviewBlock";
import { PageFrame } from "@/sections/PageFrame";
import { strings } from "@/strings";

import { ApiErrorPage } from "./ApiErrorPage";

interface HomeLibraryProps {
  readonly userId: string;
  readonly documents: readonly InvestorDocument[];
  readonly onGone: () => void;
}

/** The pitch block when there is a 'Pitch' deck or video (W3-03), then every other document by category. */
function HomeLibrary({ userId, documents, onGone }: HomeLibraryProps) {
  const pitch = pickFeaturedPitch(documents);
  const groups = groupsBelowPitch(documents, pitch);
  return (
    <div className="space-y-10">
      {hasFeaturedPitch(pitch) && <PitchFeature userId={userId} pitch={pitch} onGone={onGone} />}
      {groups.length > 0 && <DocumentGroups groups={groups} onGone={onGone} />}
    </div>
  );
}

interface HomeDocumentsProps {
  readonly userId: string;
  readonly documents: ReturnType<typeof useDocuments>;
  /** Reads the list again: Retry, or a document that went. */
  readonly onRefresh: () => void;
}

/** Under the overview: loading, the storage note (the only error that gets here), empty, or the pitch and the groups. */
function HomeDocuments({ userId, documents, onRefresh }: HomeDocumentsProps) {
  if (documents.isError) return <DocumentsUnavailable onRetry={onRefresh} />;
  if (documents.isPending) return <LibrarySkeleton />;
  if (documents.data.length === 0) return <EmptyLibrary />;
  return <HomeLibrary userId={userId} documents={documents.data} onGone={onRefresh} />;
}

function HomeBody({ userId }: { readonly userId: string }) {
  const documents = useDocuments(userId);
  const { refetch } = documents;
  // Stable: the pitch video reads the list again from an effect when its link answers 404.
  const refresh = useCallback(() => void refetch(), [refetch]);
  // Storage down leaves the page up, with a note where the documents would be.
  if (documents.isError && !isStorageUnavailable(documents.error)) {
    return <ApiErrorPage screen={screenForError(documents.error)} onRetry={refresh} />;
  }
  return (
    <PageFrame title={strings.home.title} intro={strings.home.intro} lead={<OverviewBlock userId={userId} />}>
      <HomeDocuments userId={userId} documents={documents} onRefresh={refresh} />
    </PageFrame>
  );
}

/**
 * /investors: a short intro, the admins' overview once published (US-009),
 * the pitch deck and video (W3-03), then every other published document by
 * category (US-006), as the library page lists them.
 */
export function Home() {
  const state = useAuthState();
  // PortalGate renders the pages only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <HomeBody userId={state.userId} />;
}
