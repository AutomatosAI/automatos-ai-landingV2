/**
 * Opens a document's preview link in a new tab. The tab is opened during the
 * click, before the link is fetched: a tab opened after an await counts as a
 * pop-up and is blocked. It loses its opener first, so the storage page can
 * never reach back into the portal.
 */

export type PreviewResult = "opened" | "blocked" | "failed";

type OpenTab = (url: string, target: string) => Pick<Window, "opener" | "location" | "close"> | null;

const openTab: OpenTab = (url, target) => window.open(url, target);

export async function openPreview(getUrl: () => Promise<string>, open: OpenTab = openTab): Promise<PreviewResult> {
  const tab = open("about:blank", "_blank");
  if (!tab) return "blocked";
  tab.opener = null;
  try {
    tab.location.replace(await getUrl());
    return "opened";
  } catch {
    tab.close();
    return "failed";
  }
}
