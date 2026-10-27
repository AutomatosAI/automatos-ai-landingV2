/**
 * The investor portal app (investors/dist) at automatos.app/investors.
 *
 * server.js mounts appRouter at /investors, before the site's allow-list.
 * It serves the build's hashed assets at /investors/assets/* (cached a
 * year) and index.html for /investors and every other path under it, so the
 * app's router owns them (no-store: a deploy shows at once). The app is
 * served whatever the API's state; it shows the unavailable message itself
 * (KP4). Without a build, /investors answers 503 with one line of HTML and
 * the rest of the site is untouched.
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

export const APP_DIST_DIR = fileURLToPath(new URL("../../investors/dist/", import.meta.url));

const ASSET_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const UNAVAILABLE_HTML =
  '<!doctype html><meta charset="utf-8"><title>Investors · Automatos</title>' +
  '<p>The investor portal is temporarily unavailable. <a href="/contact">Contact us</a>.</p>';

/** @typedef {{warn: (...args: unknown[]) => void}} Logger */

/**
 * A dot-dot segment (raw or percent-encoded), a backslash separator or a
 * NUL: never a path the app serves, whatever the static server would do.
 * @param {string} path
 */
function isUnsafePath(path) {
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return true;
  }
  return decoded.includes("\0") || decoded.split(/[\\/]/).includes("..");
}

/** @type {import("express").RequestHandler} */
function rejectUnsafePaths(req, res, next) {
  if (!isUnsafePath(req.path)) return next();
  return res.status(400).type("text/plain").send("Bad request");
}

/** @type {import("express").RequestHandler} */
function assetNotFound(_req, res) {
  res.status(404).type("text/plain").send("Not found");
}

/**
 * index.html, or the 503 page when the build is missing (logged once).
 * @param {string} indexFile
 * @param {Logger} logger
 * @returns {import("express").RequestHandler}
 */
function serveIndex(indexFile, logger) {
  let warned = false;
  return function appIndex(_req, res) {
    res.set("Cache-Control", "no-store");
    res.sendFile(indexFile, (err) => {
      if (!err || res.headersSent || err.code === "ECONNABORTED") return;
      if (!warned) {
        warned = true;
        logger.warn(`[investors] app build unavailable (${err.code ?? err.name}): /investors answers 503`);
      }
      res.status(503).type("html").send(UNAVAILABLE_HTML);
    });
  };
}

/**
 * @param {{distDir?: string, logger?: Logger}} [options]
 */
export function createAppRouter({ distDir = APP_DIST_DIR, logger = console } = {}) {
  const router = express.Router();
  router.use(rejectUnsafePaths);
  router.use(
    "/assets",
    express.static(join(distDir, "assets"), {
      immutable: true,
      maxAge: ASSET_MAX_AGE_MS,
      index: false,
      redirect: false,
    }),
  );
  // A missing asset is a 404, never index.html served as script.
  router.use("/assets", assetNotFound);
  router.get("*", serveIndex(join(distDir, "index.html"), logger));
  return router;
}
