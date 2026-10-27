import { LibraryPage } from "@/documents/LibraryPage";
import { strings } from "@/strings";

/** /investors/documents: the same list with a search box (US-006). */
export function Documents() {
  return <LibraryPage title={strings.library.title} intro={strings.library.intro} searchable />;
}
