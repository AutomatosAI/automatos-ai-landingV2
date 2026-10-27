import { isStorageUnavailable, screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { Separator } from "@/components/ui/separator";
import { ApiErrorPage } from "@/pages/ApiErrorPage";

import { DocumentGroups } from "./DocumentGroups";
import { groupByCategory } from "./library-model";
import { DocumentsUnavailable, EmptyLibrary, LibrarySkeleton } from "./LibraryStates";
import { SearchableLibrary } from "./SearchableLibrary";
import { useDocuments } from "./use-documents";

interface LibraryPageProps {
  readonly title: string;
  readonly intro: string;
  /** The Documents page adds the search box; the home page lists everything. */
  readonly searchable?: boolean;
}

interface LibraryBodyProps {
  readonly documents: ReturnType<typeof useDocuments>;
  readonly searchable: boolean;
  /** Reads the list again: Retry, or a document that went. */
  readonly onRefresh: () => void;
}

/** Under the heading: loading, the storage note (the only error that gets here), empty, or the list. */
function LibraryBody({ documents, searchable, onRefresh }: LibraryBodyProps) {
  if (documents.isError) return <DocumentsUnavailable onRetry={onRefresh} />;
  if (documents.isPending) return <LibrarySkeleton />;
  if (documents.data.length === 0) return <EmptyLibrary />;
  if (searchable) return <SearchableLibrary documents={documents.data} onGone={onRefresh} />;
  return <DocumentGroups groups={groupByCategory(documents.data)} onGone={onRefresh} />;
}

function Library({ userId, title, intro, searchable = false }: LibraryPageProps & { readonly userId: string }) {
  const documents = useDocuments(userId);
  const refresh = () => void documents.refetch();
  // Storage down leaves the page up, with a note where the documents would be.
  if (documents.isError && !isStorageUnavailable(documents.error)) {
    return <ApiErrorPage screen={screenForError(documents.error)} onRetry={refresh} />;
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-prose text-foreground/80">{intro}</p>
      <Separator className="my-8" />
      <LibraryBody documents={documents} searchable={searchable} onRefresh={refresh} />
    </section>
  );
}

/** The published documents under a page heading: loading, empty, error and the list. */
export function LibraryPage(props: LibraryPageProps) {
  const state = useAuthState();
  // PortalGate renders the pages only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <Library userId={state.userId} {...props} />;
}
