import type { PageSection } from "./sections-model";

/** The section pages (US-009), relative to the app's basename like lib/paths.ts. */
export const TEAM_PATH = "/team";
export const STORY_PATH = "/story";
export const FAQ_PATH = "/faq";
export const CONTACT_PATH = "/contact";

export const SECTION_PATHS: Readonly<Record<PageSection, string>> = Object.freeze({
  team: TEAM_PATH,
  story: STORY_PATH,
  faq: FAQ_PATH,
  contact: CONTACT_PATH,
});
