import { useQuery } from "@tanstack/react-query";

import { fetchOverview } from "./overview-api";

/** Keyed by the Clerk user, like /me: nothing is shown to the next person signed in. */
export function adminOverviewKey(userId: string) {
  return ["admin", "overview", userId] as const;
}

export function useAdminOverview(userId: string) {
  return useQuery({ queryKey: adminOverviewKey(userId), queryFn: ({ signal }) => fetchOverview(signal) });
}
