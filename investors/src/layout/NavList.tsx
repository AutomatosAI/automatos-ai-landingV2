import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import type { NavItem } from "./nav";

interface NavListProps {
  readonly items: readonly NavItem[];
  /** Called after a link is followed (the phone menu closes). */
  readonly onNavigate?: () => void;
}

/** The portal's links (ported from the reference InvestorSidebar, KP12); the current page is marked. */
export function NavList({ items, onNavigate }: NavListProps) {
  return (
    <nav aria-label={strings.nav.label}>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-border bg-secondary text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <item.icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
