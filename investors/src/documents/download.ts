import { requestDocumentLink } from "./documents-api";
import { navigateTo } from "./navigate";

/**
 * Asks the server for a download link (it records the download, KP16), then
 * goes to it: S3 answers with Content-Disposition attachment and the file's
 * name, so the browser saves it.
 */
export async function downloadDocument(id: string, go: (url: string) => void = navigateTo): Promise<void> {
  const link = await requestDocumentLink(id, "download");
  go(link.url);
}
