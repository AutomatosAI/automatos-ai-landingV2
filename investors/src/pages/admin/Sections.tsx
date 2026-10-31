import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { LoadFailed } from "@/admin/LoadFailed";
import { SectionEditor } from "@/admin/SectionEditor";
import { SectionList } from "@/admin/SectionList";
import { ADMIN_SECTIONS_PATH, sectionSlugOf } from "@/admin/section-paths";
import { useAdminSections } from "@/admin/use-sections";
import { useAuthState } from "@/auth";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { SectionSlug } from "@/sections/sections-model";
import { strings } from "@/strings";

const copy = strings.admin.sections;

function Loading() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <span className="sr-only">{strings.status.loading}</span>
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-20 w-full" />
      ))}
    </div>
  );
}

function Heading({ title, intro }: { readonly title: string; readonly intro: string }) {
  return (
    <>
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-prose text-foreground/80">{intro}</p>
      <Separator className="my-6" />
    </>
  );
}

function BackLink() {
  return (
    <Link
      to={ADMIN_SECTIONS_PATH}
      className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {copy.back}
    </Link>
  );
}

function SectionsScreen({ userId }: { readonly userId: string }) {
  const sections = useAdminSections(userId);
  function body() {
    if (sections.isPending) return <Loading />;
    if (sections.isError) return <LoadFailed error={sections.error} onRetry={() => void sections.refetch()} />;
    return <SectionList sections={sections.data} />;
  }
  return (
    <section>
      <Heading title={copy.title} intro={copy.intro} />
      {body()}
    </section>
  );
}

/** No editor yet: the list is loading, could not be read, or has no such section. */
function NoEditor({ sections }: { readonly sections: ReturnType<typeof useAdminSections> }) {
  if (sections.isPending) return <Loading />;
  if (sections.isError) return <LoadFailed error={sections.error} onRetry={() => void sections.refetch()} />;
  return <p className="max-w-prose text-muted-foreground">{copy.missing}</p>;
}

function EditorScreen({ userId, slug }: { readonly userId: string; readonly slug: SectionSlug | null }) {
  const sections = useAdminSections(userId);
  const section = slug === null ? undefined : sections.data?.find((each) => each.slug === slug);
  if (slug === null || section === undefined) {
    return (
      <section>
        <BackLink />
        <NoEditor sections={sections} />
      </section>
    );
  }
  return (
    <section>
      <BackLink />
      <Heading title={copy.editTitle(section.title)} intro={copy.places[slug]} />
      <SectionEditor key={slug} userId={userId} slug={slug} section={section} />
    </section>
  );
}

/** /investors/admin/sections (US-016): the overview, team, story, FAQ and contact sections, and where each shows. */
export function AdminSections() {
  const state = useAuthState();
  // The admin gate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <SectionsScreen userId={state.userId} />;
}

/** /investors/admin/sections/:slug (US-016): one section's editor with its live preview. */
export function AdminSectionEditor() {
  const state = useAuthState();
  const { slug } = useParams();
  if (state.status !== "signed_in") return null;
  return <EditorScreen userId={state.userId} slug={sectionSlugOf(slug)} />;
}
