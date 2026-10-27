/**
 * PUTs a file to a presigned storage URL with XMLHttpRequest, the one browser
 * API that reports upload progress. The URL is a credential until it expires
 * (KP11): it is never logged and never part of an error message.
 */

export interface PutRequest {
  readonly url: string;
  /** Exactly the headers the server signed (Content-Type); the browser adds Content-Length. */
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Blob;
  readonly onProgress?: (loaded: number, total: number) => void;
  readonly signal?: AbortSignal;
}

export class PutError extends Error {
  /** Storage's HTTP status, or null when no answer came (network, abort). */
  readonly status: number | null;
  readonly aborted: boolean;

  constructor({ status = null, aborted = false }: { status?: number | null; aborted?: boolean }) {
    super(aborted ? "upload aborted" : `upload failed${status === null ? "" : ` (${status})`}`);
    this.name = "PutError";
    this.status = status;
    this.aborted = aborted;
  }
}

export function putWithProgress({ url, headers, body, onProgress, signal }: PutRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new PutError({ aborted: true }));
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const settle = (error: PutError | null) => {
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve();
    };
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
    };
    xhr.onload = () => settle(xhr.status >= 200 && xhr.status < 300 ? null : new PutError({ status: xhr.status }));
    xhr.onerror = () => settle(new PutError({}));
    xhr.onabort = () => settle(new PutError({ aborted: true }));
    signal?.addEventListener("abort", abort, { once: true });
    xhr.send(body);
  });
}
