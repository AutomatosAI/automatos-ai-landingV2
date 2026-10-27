import { useQuery } from "@tanstack/react-query";

import { fetchSections } from "./sections-api";

/** Keyed by the Clerk user, like /me: nothing is shown to the next person signed in. */
export function sectionsKey(userId: string) {
  return ["sections", userId] as const;
}

/**
 * The published sections: the sidebar's links, the home page's overview and
 * the section pages share one answer. `enabled` holds the call back until
 * the profile is done (the first-visit form shows no links).
 */
export function useSections(userId: string, enabled = true) {
  return useQuery({ queryKey: sectionsKey(userId), queryFn: ({ signal }) => fetchSections(signal), enabled });
}
