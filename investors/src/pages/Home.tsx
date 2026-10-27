import { screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import type { InvestorDocument } from "@/documents/documents-api";
import { DocumentGroups } from "@/documents/DocumentGroups";
import { groupByCategory } from "@/documents/library-model";
import { EmptyLibrary, LibrarySkeleton } from "@/documents/LibraryStates";
import { useDocuments } from "@/documents/use-documents";
import { OverviewBlock } from "@/sections/OverviewBlock";
import { PageFrame } from "@/sections/PageFrame";
import { strings } from "@/strings";

import { ApiErrorPage } from "./ApiErrorPage";

interface HomeDocumentsProps {
  readonly documents: readonly InvestorDocument[];
  readonly onGone: () => void;
}

function HomeDocuments({ documents, onGone }: HomeDocumentsProps) {
  if (documents.length === 0) return <EmptyLibrary />;
  return <DocumentGroups groups={groupByCategory(documents)} onGone={onGone} />;
}

function HomeBody({ userId }: { readonly userId: string }) {
  const documents = useDocuments(userId);
  const refresh = () => void documents.refetch();
  if (documents.isError) return <ApiErrorPage screen={screenForError(documents.error)} onRetry={refresh} />;
  return (
    <PageFrame title={strings.home.title} intro={strings.home.intro} lead={<OverviewBlock userId={userId} />}>
      {documents.isPending ? <LibrarySkeleton /> : <HomeDocuments documents={documents.data} onGone={refresh} />}
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
