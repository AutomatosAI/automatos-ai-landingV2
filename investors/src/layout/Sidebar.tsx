import { MoodToggle } from "./MoodToggle";
import type { NavItem } from "./nav";
import { NavList } from "./NavList";

/** Desktop and tablet: the links beside the page, held in view while it scrolls. */
export function Sidebar({ items }: { readonly items: readonly NavItem[] }) {
  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 flex-col justify-between overflow-y-auto border-r py-8 pl-4 pr-3 md:flex">
      <NavList items={items} />
      <MoodToggle className="self-start" />
    </aside>
  );
}
