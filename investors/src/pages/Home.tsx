import { LibraryPage } from "@/documents/LibraryPage";
import { strings } from "@/strings";

/** /investors: a short intro, then every published document by category (US-006). */
export function Home() {
  return <LibraryPage title={strings.home.title} intro={strings.home.intro} />;
}
