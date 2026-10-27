/**
 * Per-investor rate limits (KP16): express-rate-limit keyed by the investor
 * id the guard set from the verified token, so a limiter only ever runs
 * behind requireInvestor. Each limiter keeps its own in-memory count, per
 * process; a request over the limit is answered 429 {error:'rate_limited'}.
 */
import { rateLimit } from "express-rate-limit";

export const MINUTE_MS = 60_000;

/** @type {import("express").RequestHandler} */
function tooMany(_req, res) {
  res.status(429).json({ error: "rate_limited" });
}

/**
 * @param {{limit: number, windowMs?: number}} options
 * @returns {import("express").RequestHandler}
 */
export function perInvestorLimit({ limit, windowMs = MINUTE_MS }) {
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("perInvestorLimit: limit must be a positive integer");
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Never the IP: the guard ran first, so req.investor is always set here.
    keyGenerator: (req) => req.investor.id,
    handler: tooMany,
  });
}
