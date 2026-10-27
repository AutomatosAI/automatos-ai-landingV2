/**
 * Investor document storage (KP11): a private S3 bucket reached only through
 * short-lived presigned URLs. Uploads are a presigned PUT whose signature
 * binds the content type and the exact size; reads are a presigned GET with
 * the Content-Disposition S3 should answer with. Keys are always
 * documents/<documentId>/v<version>/<safeFileName>: the store refuses any
 * other key, so it can never read or delete outside that prefix.
 *
 * The AWS SDK is imported lazily, on first use (academy server/media/s3.js
 * pattern), and the client is injectable so tests drive head/remove with a
 * fake. Nothing here logs: a presigned URL is a credential until it expires.
 */

export const PUT_EXPIRES_SEC = 15 * 60;
export const GET_EXPIRES_SEC = 5 * 60;
export const MAX_UPLOAD_BYTES = 262_144_000;
export const MAX_FILE_NAME_LENGTH = 120;

export const ALLOWED_CONTENT_TYPES = Object.freeze([
  "application/pdf",
  "video/mp4",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const DISPOSITIONS = Object.freeze(["inline", "attachment"]);

/** Postgres integer: documents.version never exceeds it. */
const MAX_VERSION = 2_147_483_647;
const DOCUMENT_ID = /^[A-Za-z0-9-]{1,64}$/;
const DOCUMENT_KEY = /^documents\/[A-Za-z0-9-]{1,64}\/v[1-9]\d{0,9}\/[A-Za-z0-9_][A-Za-z0-9._-]{0,119}$/;

const UNSAFE_RUN = /[^A-Za-z0-9._-]+/g;
const EXTENSION = /\.[A-Za-z0-9]{1,10}$/;
const FALLBACK_STEM = "file";
/** The display name a GET's Content-Disposition carries is cut to this many characters. */
const MAX_DISPLAY_NAME_LENGTH = 200;

/** S3's presigner leaves content-type unsigned unless told otherwise. */
const SIGNED_PUT_HEADERS = Object.freeze(["content-type", "content-length"]);

/**
 * @typedef {NonNullable<import("./config.js").PortalConfig["s3"]>} DocStoreConfig
 * @typedef {{send: (command: object) => Promise<Record<string, unknown>>}} S3Like
 *   an S3Client; presigning needs a real one, head and remove only send()
 * @typedef {"content_type_not_allowed" | "invalid_size" | "file_too_large"} UploadRejection
 */

/** An upload outside KP11's limits. The routes answer 400 {error: code}. */
export class UploadRejectedError extends Error {
  /** @param {UploadRejection} code */
  constructor(code) {
    super(`upload rejected: ${code}`);
    this.name = "UploadRejectedError";
    this.code = code;
    this.status = 400;
  }
}

/** @param {string} text */
const trimEdges = (text) => text.replace(/^[.-]+|[.-]+$/g, "");

/**
 * A file name safe for an S3 key and a header: the last path segment, accents
 * folded, every run of other characters turned into one '-', at most 120
 * characters with the extension kept. Never empty.
 * @param {unknown} name
 * @returns {string}
 */
export function safeFileName(name) {
  const base = String(name ?? "").split(/[\\/]/).at(-1) ?? "";
  const cleaned = base
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(UNSAFE_RUN, "-")
    .replace(/-*\.-*/g, ".");
  const extension = EXTENSION.exec(cleaned)?.[0] ?? "";
  const stem = trimEdges(cleaned.slice(0, cleaned.length - extension.length)) || FALLBACK_STEM;
  return trimEdges(stem.slice(0, MAX_FILE_NAME_LENGTH - extension.length)) + extension;
}

/**
 * @param {string} documentId the document's uuid
 * @param {number} version
 * @param {unknown} fileName the uploaded file's name, made safe here
 * @returns {string}
 */
export function documentKey(documentId, version, fileName) {
  if (typeof documentId !== "string" || !DOCUMENT_ID.test(documentId)) {
    throw new TypeError("documentKey: documentId must be a document uuid");
  }
  if (!Number.isInteger(version) || version < 1 || version > MAX_VERSION) {
    throw new TypeError("documentKey: version must be a positive integer");
  }
  return `documents/${documentId}/v${version}/${safeFileName(fileName)}`;
}

/** @param {unknown} key */
function assertKey(key) {
  if (typeof key !== "string" || !DOCUMENT_KEY.test(key)) {
    throw new TypeError("investor doc store: not a document key");
  }
}

/**
 * KP11's limits, checked before a PUT is presigned and again when an upload
 * is finalized (against head()).
 * @param {{contentType: unknown, contentLength: unknown}} upload
 * @returns {Readonly<{contentType: string, contentLength: number}>}
 * @throws {UploadRejectedError}
 */
export function checkUpload({ contentType, contentLength }) {
  if (typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new UploadRejectedError("content_type_not_allowed");
  }
  if (typeof contentLength !== "number" || !Number.isSafeInteger(contentLength) || contentLength < 1) {
    throw new UploadRejectedError("invalid_size");
  }
  if (contentLength > MAX_UPLOAD_BYTES) throw new UploadRejectedError("file_too_large");
  return Object.freeze({ contentType, contentLength });
}

/**
 * RFC 5987 ext-value encoding: encodeURIComponent leaves ' ( ) * bare, which
 * attr-char does not allow.
 * @param {string} text
 */
function encodeRfc5987(text) {
  return encodeURIComponent(text).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * The Content-Disposition a presigned GET asks S3 to answer with: an ASCII
 * filename for old clients and filename* (RFC 6266/5987) with the real name.
 * @param {"inline" | "attachment"} disposition
 * @param {unknown} fileName
 * @returns {string}
 */
export function contentDisposition(disposition, fileName) {
  if (!DISPOSITIONS.includes(disposition)) {
    throw new TypeError("contentDisposition: disposition must be inline or attachment");
  }
  const display = (String(fileName ?? "").split(/[\\/]/).at(-1) ?? "")
    .replace(/\p{Cc}+/gu, " ")
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH)
    .toWellFormed();
  const fallback = safeFileName(display);
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeRfc5987(display || fallback)}`;
}

/** @param {number} seconds */
const expiresAt = (seconds) => new Date(Date.now() + seconds * 1000).toISOString();

const loadS3 = () => import("@aws-sdk/client-s3");
const loadPresigner = () => import("@aws-sdk/s3-request-presigner");

/**
 * One S3Client per store, built on first use; a failed load is retried on the
 * next call. Checksums only when S3 requires them: the SDK's default puts the
 * CRC32 of an empty body into a presigned PUT, which S3 then holds the
 * uploaded file to.
 * @param {DocStoreConfig} config
 * @returns {() => Promise<S3Like>}
 */
function lazyS3Client({ region, accessKeyId, secretAccessKey }) {
  /** @type {Promise<S3Like> | null} */
  let client = null;
  return () => {
    client =
      client ??
      loadS3()
        .then(
          ({ S3Client }) =>
            new S3Client({
              region,
              credentials: { accessKeyId, secretAccessKey },
              requestChecksumCalculation: "WHEN_REQUIRED",
              responseChecksumValidation: "WHEN_REQUIRED",
            }),
        )
        .catch((err) => {
          client = null;
          throw err;
        });
    return client;
  };
}

/** @param {unknown} err */
function isNotFound(err) {
  const name = /** @type {{name?: unknown}} */ (err)?.name;
  const status = /** @type {{$metadata?: {httpStatusCode?: unknown}}} */ (err)?.$metadata?.httpStatusCode;
  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}

/**
 * @typedef {{bucket: string, getClient: () => Promise<S3Like>}} Bucket
 * @typedef {{key: string, contentType: string, contentLength: number}} PutRequest
 * @typedef {{key: string, fileName: string, disposition: "inline" | "attachment"}} GetRequest
 * @typedef {Readonly<{size: number | null, contentType: string | null}>} ObjectInfo
 */

/**
 * @param {Bucket} store
 * @param {PutRequest} upload
 * @returns {Promise<Readonly<{url: string, headers: Readonly<Record<string, string>>, expiresAt: string}>>}
 *   the browser PUTs the file to url with exactly these headers
 */
async function presignPut({ bucket, getClient }, { key, contentType, contentLength }) {
  const upload = checkUpload({ contentType, contentLength });
  assertKey(key);
  const [{ PutObjectCommand }, { getSignedUrl }] = await Promise.all([loadS3(), loadPresigner()]);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: upload.contentType,
    ContentLength: upload.contentLength,
  });
  const url = await getSignedUrl(await getClient(), command, {
    expiresIn: PUT_EXPIRES_SEC,
    signableHeaders: new Set(SIGNED_PUT_HEADERS),
  });
  return Object.freeze({
    url,
    headers: Object.freeze({ "Content-Type": upload.contentType }),
    expiresAt: expiresAt(PUT_EXPIRES_SEC),
  });
}

/**
 * @param {Bucket} store
 * @param {GetRequest} read
 * @returns {Promise<Readonly<{url: string, expiresAt: string}>>}
 */
async function presignGet({ bucket, getClient }, { key, fileName, disposition }) {
  const header = contentDisposition(disposition, fileName);
  assertKey(key);
  const [{ GetObjectCommand }, { getSignedUrl }] = await Promise.all([loadS3(), loadPresigner()]);
  const command = new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: header });
  const url = await getSignedUrl(await getClient(), command, { expiresIn: GET_EXPIRES_SEC });
  return Object.freeze({ url, expiresAt: expiresAt(GET_EXPIRES_SEC) });
}

/**
 * Absent is S3's 404. Without s3:ListBucket S3 answers 403 for a missing key
 * instead: that throws, as a misconfigured bucket should.
 * @param {Bucket} store
 * @param {string} key
 * @returns {Promise<ObjectInfo | null>} null when absent
 */
async function headObject({ bucket, getClient }, key) {
  assertKey(key);
  const { HeadObjectCommand } = await loadS3();
  const s3 = await getClient();
  try {
    const out = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const size = typeof out.ContentLength === "number" ? out.ContentLength : null;
    const contentType = typeof out.ContentType === "string" ? out.ContentType : null;
    return Object.freeze({ size, contentType });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/**
 * Deletes the object; S3 answers the same whether or not it existed.
 * @param {Bucket} store
 * @param {string} key
 * @returns {Promise<void>}
 */
async function removeObject({ bucket, getClient }, key) {
  assertKey(key);
  const { DeleteObjectCommand } = await loadS3();
  const s3 = await getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * @typedef {Readonly<{
 *   presignPut: (upload: PutRequest) => ReturnType<typeof presignPut>,
 *   presignGet: (read: GetRequest) => ReturnType<typeof presignGet>,
 *   head: (key: string) => Promise<ObjectInfo | null>,
 *   remove: (key: string) => Promise<void>,
 * }>} DocStore
 */

/**
 * @param {{config: DocStoreConfig | null, client?: S3Like}} options config is the portal's config.s3
 * @returns {DocStore}
 */
export function createDocStore({ config, client }) {
  if (!config || typeof config.bucket !== "string" || typeof config.region !== "string") {
    throw new TypeError("createDocStore: config needs bucket and region (config.s3)");
  }
  /** @type {Bucket} */
  const store = Object.freeze({
    bucket: config.bucket,
    getClient: client ? () => Promise.resolve(client) : lazyS3Client(config),
  });
  return Object.freeze({
    presignPut: (upload) => presignPut(store, upload),
    presignGet: (read) => presignGet(store, read),
    head: (key) => headObject(store, key),
    remove: (key) => removeObject(store, key),
  });
}
