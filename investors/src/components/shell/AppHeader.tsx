import type { ReactNode } from "react";

import { AccountMenu } from "@/auth";
import { Separator } from "@/components/ui/separator";
import { strings } from "@/strings";

/**
 * The site's header, pared down: the wordmark (home), where you are, and the
 * account menu once signed in. `menu` is the phone menu's button, before the
 * wordmark (the portal's layout passes it).
 */
export function AppHeader({ menu }: { readonly menu?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {menu}
        <a
          href="/"
          aria-label={strings.shell.homeLabel}
          className="font-serif text-[22px] leading-none tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {strings.shell.wordmark}
        </a>
        <Separator orientation="vertical" className="h-5" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {strings.shell.section}
        </span>
        <div className="ml-auto">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
