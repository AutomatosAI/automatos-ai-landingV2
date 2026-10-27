import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sectionsKey } from "@/sections/use-sections";
import type { SectionSlug } from "@/sections/sections-model";

import { fetchAdminSections, saveSection, type AdminSection, type SectionBody } from "./sections-api";

/** Keyed by the Clerk user, like /me: nothing is shown to the next person signed in. */
export function adminSectionsKey(userId: string) {
  return ["admin", "sections", userId] as const;
}

export function useAdminSections(userId: string) {
  return useQuery({ queryKey: adminSectionsKey(userId), queryFn: ({ signal }) => fetchAdminSections(signal) });
}

const replaceSection = (list: readonly AdminSection[], section: AdminSection) =>
  list.map((each) => (each.slug === section.slug ? section : each));

/**
 * PUT one section. The answer goes into the admin list at once; the
 * investor-side list (the sidebar's links, the home page's overview and the
 * section pages) is read again, so the admin's own portal shows the change.
 */
export function useSaveSection(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, body }: { readonly slug: SectionSlug; readonly body: SectionBody }) => saveSection(slug, body),
    onSuccess: (section) => {
      queryClient.setQueryData<readonly AdminSection[]>(adminSectionsKey(userId), (list) =>
        list ? replaceSection(list, section) : list,
      );
      void queryClient.invalidateQueries({ queryKey: sectionsKey(userId) });
    },
  });
}
