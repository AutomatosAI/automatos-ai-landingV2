/**
 * Hands the browser a JSON file to save. The export is fetched with the
 * admin's Bearer token (KP9: no cookie), so a plain link to the API cannot
 * download it; the answer becomes a local blob: URL instead.
 */

/** The server's own name for it (Content-Disposition of GET /admin/investors/:id/export). */
export function exportFileName(investorId: string): string {
  return `investor-${investorId}.json`;
}

export function saveJson(fileName: string, body: unknown): void {
  const blob = new Blob([`${JSON.stringify(body, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // After the click has been handled: the browser has the file by then.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
