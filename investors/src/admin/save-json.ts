import { saveBlob } from "./save-file";

/** The GDPR export as a JSON file (save-file.ts says why it is a blob). */

/** The server's own name for it (Content-Disposition of GET /admin/investors/:id/export). */
export function exportFileName(investorId: string): string {
  return `investor-${investorId}.json`;
}

export function saveJson(fileName: string, body: unknown): void {
  saveBlob(fileName, new Blob([`${JSON.stringify(body, null, 2)}\n`], { type: "application/json" }));
}
