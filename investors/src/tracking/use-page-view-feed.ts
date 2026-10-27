import { useMemo } from "react";

import type { OnPageVisible } from "@/viewer/visibility-model";

import { useTracker } from "./context";
import { pageView } from "./events";

/** The viewer's onPageVisible for one document version: each page read becomes a page_view. */
export function usePageViewFeed(documentId: string, documentVersion: number): OnPageVisible | undefined {
  const tracker = useTracker();
  return useMemo(() => {
    if (tracker === null) return undefined;
    return (page: number, ms: number) => tracker.track(pageView(documentId, documentVersion, page, ms));
  }, [tracker, documentId, documentVersion]);
}
