import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PutError, putWithProgress } from "../xhr-put";

/** Just enough XMLHttpRequest to drive putWithProgress; the test plays storage's part. */
class FakeXhr {
  static last: FakeXhr | null = null;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown = undefined;
  status = 0;
  withCredentials = false;
  aborted = false;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXhr.last = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers = { ...this.headers, [name]: value };
  }

  send(body: unknown) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
    this.onabort?.();
  }

  answer(status: number) {
    this.status = status;
    this.onload?.();
  }
}

const URL = "https://storage.example.com/signed";
const body = new Blob(["%PDF-1.4"], { type: "application/pdf" });
const xhr = () => {
  if (!FakeXhr.last) throw new Error("no request was made");
  return FakeXhr.last;
};

beforeEach(() => {
  FakeXhr.last = null;
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("putWithProgress", () => {
  it("PUTs the file with the signed headers, without credentials, reporting progress", async () => {
    const onProgress = vi.fn();
    const done = putWithProgress({ url: URL, headers: { "Content-Type": "application/pdf" }, body, onProgress });
    const request = xhr();
    expect(request.method).toBe("PUT");
    expect(request.url).toBe(URL);
    expect(request.headers).toEqual({ "Content-Type": "application/pdf" });
    expect(request.body).toBe(body);
    expect(request.withCredentials).toBe(false);
    request.upload.onprogress?.({ lengthComputable: true, loaded: 4, total: 8 });
    request.upload.onprogress?.({ lengthComputable: false, loaded: 6, total: 0 });
    request.answer(200);
    await expect(done).resolves.toBeUndefined();
    expect(onProgress.mock.calls).toEqual([[4, 8]]);
  });

  it("rejects with storage's status, and no URL in the message", async () => {
    const done = putWithProgress({ url: URL, headers: {}, body });
    xhr().answer(403);
    const error = await done.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PutError);
    expect(error).toMatchObject({ status: 403, aborted: false });
    expect(String((error as Error).message)).not.toContain("storage.example.com");
  });

  it("rejects with no status when the connection drops", async () => {
    const done = putWithProgress({ url: URL, headers: {}, body });
    xhr().onerror?.();
    await expect(done).rejects.toMatchObject({ status: null, aborted: false });
  });

  it("aborts the request when the signal fires", async () => {
    const controller = new AbortController();
    const done = putWithProgress({ url: URL, headers: {}, body, signal: controller.signal });
    controller.abort();
    await expect(done).rejects.toMatchObject({ aborted: true });
    expect(xhr().aborted).toBe(true);
  });

  it("never starts when the signal has already fired", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(putWithProgress({ url: URL, headers: {}, body, signal: controller.signal })).rejects.toMatchObject({
      aborted: true,
    });
    expect(FakeXhr.last).toBeNull();
  });
});
