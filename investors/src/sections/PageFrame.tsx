import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";

interface PageFrameProps {
  readonly title: string;
  readonly intro?: string;
  /** Under the intro, above the rule (the home page's overview). */
  readonly lead?: ReactNode;
  readonly children: ReactNode;
}

/** An investor page: the serif title, an optional intro, a thin rule, the page's body (as the library pages). */
export function PageFrame({ title, intro, lead, children }: PageFrameProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 max-w-prose text-foreground/80">{intro}</p>}
      {lead}
      <Separator className="my-8" />
      {children}
    </section>
  );
}
