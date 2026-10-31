import { BookOpen, CircleHelp, FolderOpen, House, Mail, Shield, UserRound, Users, type LucideIcon } from "lucide-react";

import type { Me } from "@/api/me";
import { ADMIN_PATH, DOCUMENTS_PATH, HOME_PATH, PROFILE_PATH } from "@/lib/paths";
import { SECTION_PATHS } from "@/sections/paths";
import { PAGE_SECTIONS, type PageSection } from "@/sections/sections-model";
import { strings } from "@/strings";

/** One link of the portal's sidebar and phone menu. */
export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Active only on exactly this path (Home), not on the pages under it. */
  readonly end: boolean;
}

const HOME_ITEM: NavItem = Object.freeze({ to: HOME_PATH, label: strings.nav.home, icon: House, end: true });
const DOCUMENTS_ITEM: NavItem = Object.freeze({
  to: DOCUMENTS_PATH,
  label: strings.nav.documents,
  icon: FolderOpen,
  end: false,
});
const PROFILE_ITEM: NavItem = Object.freeze({ to: PROFILE_PATH, label: strings.nav.profile, icon: UserRound, end: true });
const ADMIN_ITEM: NavItem = Object.freeze({ to: ADMIN_PATH, label: strings.nav.admin, icon: Shield, end: false });

const SECTION_ICONS: Readonly<Record<PageSection, LucideIcon>> = Object.freeze({
  team: Users,
  story: BookOpen,
  faq: CircleHelp,
  contact: Mail,
});

const sectionItem = (slug: PageSection): NavItem =>
  Object.freeze({ to: SECTION_PATHS[slug], label: strings.nav[slug], icon: SECTION_ICONS[slug], end: true });

/**
 * The links an investor sees: none until the profile is done (every page
 * leads to the form until then); Team, Story, FAQ and Contact only once an
 * admin has published them (US-009), always in that order; Admin only for
 * admins.
 * Showing Admin is manners: the server checks the allowlist on every /admin
 * call (KP3).
 */
export function portalNav(
  { isAdmin, profileComplete }: Pick<Me, "isAdmin" | "profileComplete">,
  publishedSections: readonly PageSection[] = [],
): readonly NavItem[] {
  if (!profileComplete) return [];
  const sections = PAGE_SECTIONS.filter((slug) => publishedSections.includes(slug)).map(sectionItem);
  const items = [HOME_ITEM, DOCUMENTS_ITEM, ...sections, PROFILE_ITEM];
  return isAdmin ? [...items, ADMIN_ITEM] : items;
}
