import { LazyMarkdown } from "./LazyMarkdown";
import { readableSection } from "./sections-model";
import { useSections } from "./use-sections";

/**
 * The home page's overview (US-009), above the documents: shown once it is
 * published with some text. While the sections load, or when they cannot be
 * read, the home page simply goes without it; the documents still show.
 */
export function OverviewBlock({ userId }: { readonly userId: string }) {
  const sections = useSections(userId);
  const overview = sections.data ? readableSection(sections.data, "overview") : null;
  if (overview === null) return null;
  return (
    <section aria-label={overview.title} className="mt-8">
      <LazyMarkdown source={overview.bodyMd} />
    </section>
  );
}
