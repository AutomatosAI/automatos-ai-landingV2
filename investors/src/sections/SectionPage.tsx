import type { ReactNode } from "react";

import { screenForError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorPage } from "@/pages/ApiErrorPage";
import { strings } from "@/strings";
import { useSectionTime } from "@/tracking/use-section-time";

import { LazyMarkdown } from "./LazyMarkdown";
import { PageFrame } from "./PageFrame";
import type { Section } from "./sections-api";
import { findSection, readableSection, type PageSection } from "./sections-model";
import { useSections } from "./use-sections";

const copy = strings.sections;

interface SectionPageProps {
  readonly slug: PageSection;
  /** Shown under the section's text, whatever its state (Contact's email line). */
  readonly children?: ReactNode;
}

function SectionSkeleton() {
  return (
    <div aria-busy="true" className="max-w-prose space-y-3">
      <span className="sr-only">{strings.status.loading}</span>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function SectionText({ sections, slug }: { readonly sections: readonly Section[]; readonly slug: PageSection }) {
  const section = readableSection(sections, slug);
  if (section === null) return <p className="text-muted-foreground">{copy.comingSoon}</p>;
  return <LazyMarkdown source={section.bodyMd} fallback={<SectionSkeleton />} />;
}

function SectionBody({ userId, slug, children }: SectionPageProps & { readonly userId: string }) {
  const sections = useSections(userId);
  useSectionTime(slug);
  if (sections.isError) {
    return <ApiErrorPage screen={screenForError(sections.error)} onRetry={() => void sections.refetch()} />;
  }
  const published = sections.data ? findSection(sections.data, slug) : null;
  return (
    <PageFrame title={published?.title ?? copy.titles[slug]}>
      {sections.isPending ? <SectionSkeleton /> : <SectionText sections={sections.data} slug={slug} />}
      {children}
    </PageFrame>
  );
}

/**
 * A section page (US-009): the admins' markdown under the section's title,
 * or "Coming soon." while it is unpublished or empty. The visible time on
 * the page goes to the tracker as section_view.
 */
export function SectionPage(props: SectionPageProps) {
  const state = useAuthState();
  // PortalGate renders the pages only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <SectionBody userId={state.userId} {...props} />;
}
