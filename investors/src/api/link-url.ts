import { z } from "zod";

/** A storage link: only http(s), so a bad answer can never become a javascript: URL. */
export const linkUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value));
