import { Pencil } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { adminSectionPath, sectionSlugOf } from "./section-paths";
import type { AdminSection } from "./sections-api";

const copy = strings.admin.sections;

function PublishedState({ published }: { readonly published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]",
        published ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-sm", published ? "bg-brand" : "border border-input")} />
      {published ? copy.published : copy.notPublished}
    </span>
  );
}

function SectionRow({ section }: { readonly section: AdminSection }) {
  const slug = sectionSlugOf(section.slug);
  // The five seeded slugs only; a row the app does not know has nowhere to show.
  if (slug === null) return null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border py-5 first:border-t">
      <div className="grid min-w-0 gap-1.5">
        <p className="font-serif text-2xl leading-tight">{section.title}</p>
        <p className="text-sm text-muted-foreground">{copy.places[slug]}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <PublishedState published={section.published} />
          <span className="text-xs text-muted-foreground">
            {section.updatedBy === null ? copy.neverSaved : copy.lastSaved(formatDateTime(section.updatedAt))}
          </span>
        </div>
      </div>
      <Button asChild variant="outline">
        <Link to={adminSectionPath(slug)} aria-label={copy.editLabel(section.title)}>
          <Pencil />
          {copy.edit}
        </Link>
      </Button>
    </li>
  );
}

/** The five sections, in the admins' order, with where each shows and whether investors see it. */
export function SectionList({ sections }: { readonly sections: readonly AdminSection[] }) {
  return (
    <ul aria-label={copy.listLabel} className="grid">
      {sections.map((section) => (
        <SectionRow key={section.slug} section={section} />
      ))}
    </ul>
  );
}
