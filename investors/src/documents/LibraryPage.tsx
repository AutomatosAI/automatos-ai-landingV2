import { screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { Separator } from "@/components/ui/separator";
import { ApiErrorPage } from "@/pages/ApiErrorPage";

import type { InvestorDocument } from "./documents-api";
import { DocumentGroups } from "./DocumentGroups";
import { groupByCategory } from "./library-model";
import { EmptyLibrary, LibrarySkeleton } from "./LibraryStates";
import { SearchableLibrary } from "./SearchableLibrary";
import { useDocuments } from "./use-documents";

interface LibraryPageProps {
  readonly title: string;
  readonly intro: string;
  /** The Documents page adds the search box; the home page lists everything. */
  readonly searchable?: boolean;
}

interface LibraryBodyProps {
  readonly documents: readonly InvestorDocument[];
  readonly searchable: boolean;
  readonly onGone: () => void;
}

function LibraryBody({ documents, searchable, onGone }: LibraryBodyProps) {
  if (documents.length === 0) return <EmptyLibrary />;
  if (searchable) return <SearchableLibrary documents={documents} onGone={onGone} />;
  return <DocumentGroups groups={groupByCategory(documents)} onGone={onGone} />;
}

function Library({ userId, title, intro, searchable = false }: LibraryPageProps & { readonly userId: string }) {
  const documents = useDocuments(userId);
  const refresh = () => void documents.refetch();
  if (documents.isError) return <ApiErrorPage screen={screenForError(documents.error)} onRetry={refresh} />;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-prose text-foreground/80">{intro}</p>
      <Separator className="my-8" />
      {documents.isPending ? (
        <LibrarySkeleton />
      ) : (
        <LibraryBody documents={documents.data} searchable={searchable} onGone={refresh} />
      )}
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
