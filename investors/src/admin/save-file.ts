/**
 * Hands the browser a file to save. The admin exports are fetched with the
 * admin's Bearer token (KP9: no cookie), so a plain link to the API cannot
 * download them; the answer becomes a local blob: URL instead.
 */
export function saveBlob(fileName: string, blob: Blob): void {
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
