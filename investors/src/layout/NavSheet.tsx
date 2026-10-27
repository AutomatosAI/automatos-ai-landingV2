import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { strings } from "@/strings";

import { MoodToggle } from "./MoodToggle";
import type { NavItem } from "./nav";
import { NavList } from "./NavList";

/** Phones: the same links in a sheet from the left, opened from the header; following a link closes it. */
export function NavSheet({ items }: { readonly items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="-ml-2 md:hidden" aria-label={strings.nav.openMenu}>
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{strings.nav.menu}</SheetTitle>
        </SheetHeader>
        <NavList items={items} onNavigate={() => setOpen(false)} />
        <MoodToggle className="mt-auto self-start" />
      </SheetContent>
    </Sheet>
  );
}
