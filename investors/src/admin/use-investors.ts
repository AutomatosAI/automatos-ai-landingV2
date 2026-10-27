import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteInvestor,
  fetchInvestor,
  fetchInvestors,
  fetchTimeline,
  setInvestorBlocked,
} from "./investors-api";

/** Keyed by the Clerk user, like /me: nothing is shown to the next person signed in. */
export function adminInvestorsKey(userId: string) {
  return ["admin", "investors", userId] as const;
}

/** search: investors-query.ts apiSearch, so each view of the table is cached on its own. */
export function useInvestorList(userId: string, search: string) {
  return useQuery({
    queryKey: [...adminInvestorsKey(userId), "list", search],
    queryFn: ({ signal }) => fetchInvestors(search, signal),
    // The table stays on screen while the next page, sort or search loads.
    placeholderData: keepPreviousData,
  });
}

export function useInvestorDetail(userId: string, id: string) {
  return useQuery({
    queryKey: [...adminInvestorsKey(userId), "detail", id],
    queryFn: ({ signal }) => fetchInvestor(id, signal),
  });
}

export function useTimeline(userId: string, id: string, page: number) {
  return useQuery({
    queryKey: [...adminInvestorsKey(userId), "timeline", id, page],
    queryFn: ({ signal }) => fetchTimeline(id, page, signal),
    placeholderData: keepPreviousData,
  });
}

/** Block or unblock; every cached list and page of investors is read again after. */
export function useSetBlocked(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }: { readonly id: string; readonly blocked: boolean }) => setInvestorBlocked(id, blocked),
    // Not awaited: the dialog closes on the answer, and the pages catch up behind it.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminInvestorsKey(userId) });
    },
  });
}

/** Delete; the investor's own cached pages are dropped and the lists read again. */
export function useDeleteInvestor(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInvestor,
    onSuccess: (_answer, id) => {
      const key = adminInvestorsKey(userId);
      queryClient.removeQueries({ queryKey: [...key, "detail", id] });
      queryClient.removeQueries({ queryKey: [...key, "timeline", id] });
      void queryClient.invalidateQueries({ queryKey: [...key, "list"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview", userId] });
    },
  });
}
