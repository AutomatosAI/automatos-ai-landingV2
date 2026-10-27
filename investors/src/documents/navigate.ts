/**
 * Sends the browser to a storage link. A link served as an attachment saves
 * the file and leaves the page where it is. Its own module so page tests can
 * stand in for it (jsdom does not navigate).
 */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
