import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";

interface StatusPageProps {
  readonly title: string;
  readonly children: ReactNode;
  /** Buttons under the message. */
  readonly actions?: ReactNode;
}

/** A one-message page: unavailable, blocked, sign in again, errors. */
export function StatusPage({ title, children, actions }: StatusPageProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{title}</h1>
      <Separator className="my-6" />
      <div className="max-w-prose space-y-3 text-muted-foreground">{children}</div>
      {actions && <div className="mt-8">{actions}</div>}
    </section>
  );
}
