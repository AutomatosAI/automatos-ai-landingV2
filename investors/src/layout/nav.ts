import { FolderOpen, House, Shield, UserRound, type LucideIcon } from "lucide-react";

import type { Me } from "@/api/me";
import { ADMIN_PATH, DOCUMENTS_PATH, HOME_PATH, PROFILE_PATH } from "@/lib/paths";
import { strings } from "@/strings";

/** One link of the portal's sidebar and phone menu. */
export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Active only on exactly this path (Home), not on the pages under it. */
  readonly end: boolean;
}

const INVESTOR_ITEMS: readonly NavItem[] = Object.freeze([
  { to: HOME_PATH, label: strings.nav.home, icon: House, end: true },
  { to: DOCUMENTS_PATH, label: strings.nav.documents, icon: FolderOpen, end: false },
  { to: PROFILE_PATH, label: strings.nav.profile, icon: UserRound, end: true },
]);

const ADMIN_ITEM: NavItem = Object.freeze({ to: ADMIN_PATH, label: strings.nav.admin, icon: Shield, end: false });

/**
 * The links an investor sees: none until the profile is done (every page
 * leads to the form until then), Admin only for admins. Showing Admin is
 * manners: the server checks the allowlist on every /admin call (KP3).
 */
export function portalNav({ isAdmin, profileComplete }: Pick<Me, "isAdmin" | "profileComplete">): readonly NavItem[] {
  if (!profileComplete) return [];
  return isAdmin ? [...INVESTOR_ITEMS, ADMIN_ITEM] : INVESTOR_ITEMS;
}
