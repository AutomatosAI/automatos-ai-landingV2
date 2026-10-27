import { z } from "zod";

/**
 * The runtime config the site server writes into /_config.js
 * (window.AUTOMATOS_CONFIG, hydrated by server.js from its env): never a
 * build-time value, so one build serves every environment (KP9).
 */

declare global {
  interface Window {
    AUTOMATOS_CONFIG?: unknown;
  }
}

export interface AppConfig {
  /** null: no usable key, so the app runs signed-out only and says sign-in is unavailable. */
  readonly clerkPublishableKey: string | null;
}

const KEY_PREFIXES = ["pk_test_", "pk_live_"] as const;

function decodeBase64(value: string): string | null {
  try {
    return atob(value);
  } catch {
    return null;
  }
}

/**
 * The same test as Clerk's isPublishableKey: a pk_test_ or pk_live_
 * prefix, then the base64 of '<frontend api host>$'. ClerkProvider throws on
 * anything else, so a key that fails here is treated as missing.
 */
export function isClerkPublishableKey(value: string): boolean {
  if (!KEY_PREFIXES.some((prefix) => value.startsWith(prefix))) return false;
  const parts = value.split("_");
  const encoded = parts[2];
  if (parts.length !== 3 || !encoded) return false;
  const decoded = decodeBase64(encoded);
  if (decoded === null || !decoded.endsWith("$")) return false;
  const host = decoded.slice(0, -1);
  return !host.includes("$") && host.includes(".");
}

const runtimeConfigSchema = z.object({
  clerkPublishableKey: z.string().trim().optional().catch(undefined),
});

/** Anything unexpected (no config, a placeholder left unhydrated, a malformed key) means no key. */
export function parseAppConfig(raw: unknown): AppConfig {
  const parsed = runtimeConfigSchema.safeParse(raw);
  const key = parsed.success ? parsed.data.clerkPublishableKey : undefined;
  return Object.freeze({ clerkPublishableKey: key && isClerkPublishableKey(key) ? key : null });
}

export function readAppConfig(): AppConfig {
  return parseAppConfig(window.AUTOMATOS_CONFIG);
}
