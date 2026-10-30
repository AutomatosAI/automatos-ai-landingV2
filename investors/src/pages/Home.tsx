import { useCallback } from "react";

import { isStorageUnavailable, screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { CompanyCard } from "@/company/CompanyCard";
import { FOUNDER } from "@/company/company-data";
import { FounderCard } from "@/company/FounderCard";
import { ProductLinks } from "@/company/ProductLinks";
import { TeamList } from "@/company/TeamList";
import { DocumentGroups } from "@/documents/DocumentGroups";
import type { InvestorDocument } from "@/documents/documents-api";
import { groupsBelowPitch, hasFeaturedPitch, pickFeaturedPitch } from "@/documents/library-model";
import { DocumentsUnavailable, EmptyLibrary, LibrarySkeleton } from "@/documents/LibraryStates";
import { PitchFeature } from "@/documents/PitchFeature";
import { useDocuments } from "@/documents/use-documents";
import { OverviewBlock } from "@/sections/OverviewBlock";
import { PageFrame } from "@/sections/PageFrame";
import { useSections } from "@/sections/use-sections";
import { strings } from "@/strings";

import { ApiErrorPage } from "./ApiErrorPage";
import { founderCardRows, quickAccessTiles } from "./home-model";
import { QuickAccess } from "./QuickAccess";

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

interface HomeLeadProps {
  readonly userId: string;
  /** Home's document list once read; null while it loads or when storage is down. */
  readonly documents: readonly InvestorDocument[] | null;
}

/**
 * Under the intro, above the rule (PRD-003 §3.2): the compact company and
 * founder header (the founder_card section's published rows after the work
 * email, the team along its foot), the quick-access tiles, the product
 * links, then the admins' overview as before. It reads only what the page
 * already has: the document list and the one cached sections answer that
 * the sidebar and the overview share. No request of its own, no link asked
 * for, no Book a call in the header (the tile is Home's one, Q7).
 */
function HomeLead({ userId, documents }: HomeLeadProps) {
  const sections = useSections(userId);
  // As the overview: nothing from the sections while they load or when they cannot be read.
  const published = sections.data ?? null;
  const tiles = quickAccessTiles({ documents, sections: published, bookingUrl: FOUNDER.bookingUrl });
  return (
    <>
      <div className="mt-7 grid gap-9 md:mt-8 md:gap-10">
        <CompanyCard
          compact
          aside={<FounderCard compact extraRows={founderCardRows(published)} />}
          footer={<TeamList variant="inline" />}
        />
        <QuickAccess tiles={tiles} />
        <ProductLinks />
      </div>
      <OverviewBlock userId={userId} />
    </>
  );
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
  // The deck, video and Documents tiles wait for the list, and stay hidden while storage is down.
  const listed = documents.isSuccess ? documents.data : null;
  return (
    <PageFrame
      title={strings.home.title}
      intro={strings.home.intro}
      lead={<HomeLead userId={userId} documents={listed} />}
    >
      <HomeDocuments userId={userId} documents={documents} onRefresh={refresh} />
    </PageFrame>
  );
}

/**
 * /investors: a short intro; the company, its founder and team, the quick
 * access tiles and the product links (PRD-003 §3.2); the admins' overview
 * once published (US-009); the pitch deck and video (W3-03); then every
 * other published document by category (US-006), as the library page lists
 * them.
 */
export function Home() {
  const state = useAuthState();
  // PortalGate renders the pages only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <HomeBody userId={state.userId} />;
}
