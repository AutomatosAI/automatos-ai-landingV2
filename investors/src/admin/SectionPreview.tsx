import { useDeferredValue } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { LazyMarkdown } from "@/sections/LazyMarkdown";
import { PAGE_SECTIONS, type PageSection, type SectionSlug } from "@/sections/sections-model";
import { strings } from "@/strings";

import type { SectionDraft } from "./section-editor-model";

const copy = strings.admin.sections.preview;
const PREVIEW_ID = "section-preview";

/** The overview sits on the home page without its title; the other sections are pages under their title. */
const isPageSection = (slug: SectionSlug): slug is PageSection => (PAGE_SECTIONS as readonly string[]).includes(slug);

function PreviewText({ bodyMd }: { readonly bodyMd: string }) {
  if (bodyMd.trim() === "") return <p className="text-muted-foreground">{strings.sections.comingSoon}</p>;
  return <LazyMarkdown source={bodyMd} fallback={<Skeleton className="h-4 w-2/3" />} />;
}

interface SectionPreviewProps {
  readonly slug: SectionSlug;
  readonly draft: SectionDraft;
}

/**
 * The draft as investors will read it, through the same renderer as their
 * pages (sections/Markdown.tsx: no raw HTML), updated as the admin types.
 */
export function SectionPreview({ slug, draft }: SectionPreviewProps) {
  // Typing stays quick on a long text: the preview catches up between keystrokes.
  const title = useDeferredValue(draft.title);
  const bodyMd = useDeferredValue(draft.bodyMd);
  return (
    <div className="grid min-w-0 content-start gap-2">
      <p id={`${PREVIEW_ID}-label`} className="font-mono text-[11px] uppercase leading-none tracking-[0.16em] text-muted-foreground">
        {copy.label}
      </p>
      <p className="text-sm text-muted-foreground">{copy.hint}</p>
      <section
        aria-labelledby={`${PREVIEW_ID}-label`}
        className="min-w-0 overflow-hidden rounded-md border border-border bg-background p-5 sm:p-6"
      >
        {isPageSection(slug) && (
          <p className="mb-6 font-serif text-3xl font-normal leading-tight tracking-[-0.01em] sm:text-4xl">
            {title.trim() || strings.sections.titles[slug]}
          </p>
        )}
        <PreviewText bodyMd={bodyMd} />
      </section>
    </div>
  );
}
