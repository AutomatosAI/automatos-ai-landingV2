import { useDeferredValue } from "react";

import { parseCardRows, type CardRows } from "@/company/card-rows";
import { FounderCard } from "@/company/FounderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyMarkdown } from "@/sections/LazyMarkdown";
import { FOUNDER_CARD_SECTION, PAGE_SECTIONS, type PageSection, type SectionSlug } from "@/sections/sections-model";
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

/** A markdown section as its page (under its title) or the home page (the overview) shows it. */
function MarkdownPreview({ slug, title, bodyMd }: { readonly slug: SectionSlug; readonly title: string; readonly bodyMd: string }) {
  return (
    <>
      {isPageSection(slug) && (
        <p className="mb-6 font-serif text-3xl font-normal leading-tight tracking-[-0.01em] sm:text-4xl">
          {title.trim() || strings.sections.titles[slug]}
        </p>
      )}
      <PreviewText bodyMd={bodyMd} />
    </>
  );
}

/** How many lines the founder card leaves out; nothing while every line is a row. */
function SkippedLines({ cardRows }: { readonly cardRows: CardRows | null }) {
  if (cardRows === null || cardRows.skipped === 0) return null;
  return <p className="text-sm text-muted-foreground">{strings.admin.sections.founderCard.skipped(cardRows.skipped)}</p>;
}

interface SectionPreviewProps {
  readonly slug: SectionSlug;
  readonly draft: SectionDraft;
}

/**
 * The draft as investors will read it, updated as the admin types: a
 * markdown section through the same renderer as their pages
 * (sections/Markdown.tsx: no raw HTML); the founder_card section as the rows
 * on Home's founder card (company/card-rows.ts), with how many lines the
 * card leaves out under it.
 */
export function SectionPreview({ slug, draft }: SectionPreviewProps) {
  // Typing stays quick on a long text: the preview catches up between keystrokes.
  const title = useDeferredValue(draft.title);
  const bodyMd = useDeferredValue(draft.bodyMd);
  const cardRows = slug === FOUNDER_CARD_SECTION ? parseCardRows(bodyMd) : null;
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
        {cardRows === null ? (
          <MarkdownPreview slug={slug} title={title} bodyMd={bodyMd} />
        ) : (
          <FounderCard compact extraRows={cardRows.rows} />
        )}
      </section>
      <SkippedLines cardRows={cardRows} />
    </div>
  );
}
