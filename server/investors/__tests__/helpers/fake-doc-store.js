/**
 * A doc store with s3.js's interface over a Map, for route tests (KP11).
 * presignPut applies the real KP11 checks; putObject() stands in for the
 * browser's upload; the URLs are invented and point nowhere.
 */
import { vi } from "vitest";
import { checkUpload } from "../../s3.js";

const EXPIRES_AT = "2026-10-27T10:15:00.000Z";

export function fakeDocStore() {
  /** @type {Map<string, Readonly<{size: number | null, contentType: string | null}>>} */
  const objects = new Map();
  const store = Object.freeze({
    presignPut: vi.fn(async ({ key, contentType, contentLength }) => {
      checkUpload({ contentType, contentLength });
      return Object.freeze({
        url: `https://uploads.example.test/${key}?signature=fake-put`,
        headers: Object.freeze({ "Content-Type": contentType }),
        expiresAt: EXPIRES_AT,
      });
    }),
    presignGet: vi.fn(async ({ key, disposition }) =>
      Object.freeze({ url: `https://files.example.test/${key}?disposition=${disposition}&signature=fake-get`, expiresAt: EXPIRES_AT }),
    ),
    head: vi.fn(async (key) => objects.get(key) ?? null),
    remove: vi.fn(async (key) => {
      objects.delete(key);
    }),
  });
  return Object.freeze({
    store,
    /** What the browser's PUT would leave in the bucket. */
    putObject: (key, { size, contentType }) => objects.set(key, Object.freeze({ size, contentType })),
    has: (key) => objects.has(key),
  });
}
