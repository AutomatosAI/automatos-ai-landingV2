import { isStorageUnavailable, screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { DocumentGroups } from "@/documents/DocumentGroups";
import { groupByCategory } from "@/documents/library-model";
import { DocumentsUnavailable, EmptyLibrary, LibrarySkeleton } from "@/documents/LibraryStates";
import { useDocuments } from "@/documents/use-documents";
import { OverviewBlock } from "@/sections/OverviewBlock";
import { PageFrame } from "@/sections/PageFrame";
import { strings } from "@/strings";

import { ApiErrorPage } from "./ApiErrorPage";

interface HomeDocumentsProps {
  readonly documents: ReturnType<typeof useDocuments>;
  /** Reads the list again: Retry, or a document that went. */
  readonly onRefresh: () => void;
}

/** Under the overview: loading, the storage note (the only error that gets here), empty, or the groups. */
function HomeDocuments({ documents, onRefresh }: HomeDocumentsProps) {
  if (documents.isError) return <DocumentsUnavailable onRetry={onRefresh} />;
  if (documents.isPending) return <LibrarySkeleton />;
  if (documents.data.length === 0) return <EmptyLibrary />;
  return <DocumentGroups groups={groupByCategory(documents.data)} onGone={onRefresh} />;
}

function HomeBody({ userId }: { readonly userId: string }) {
  const documents = useDocuments(userId);
  const refresh = () => void documents.refetch();
  // Storage down leaves the page up, with a note where the documents would be.
  if (documents.isError && !isStorageUnavailable(documents.error)) {
    return <ApiErrorPage screen={screenForError(documents.error)} onRetry={refresh} />;
  }
  return (
    <PageFrame title={strings.home.title} intro={strings.home.intro} lead={<OverviewBlock userId={userId} />}>
      <HomeDocuments documents={documents} onRefresh={refresh} />
    </PageFrame>
  );
}

/**
 * /investors: a short intro, the admins' overview once published (US-009),
 * then every published document by category (US-006), as the library page
 * lists them.
 */
export function Home() {
  const state = useAuthState();
  // PortalGate renders the pages only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <HomeBody userId={state.userId} />;
}
