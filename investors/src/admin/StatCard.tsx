import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface StatCardProps {
  readonly label: string;
  readonly value: number | string;
  readonly detail: string;
  readonly icon: LucideIcon;
}

/** One headline number (ported from the reference AnalyticsManager's stat cards): the overview's and a document's. */
export function StatCard({ label, value, detail, icon: Icon }: StatCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="grid gap-3 p-4 pt-4 sm:p-5 sm:pt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <Icon aria-hidden="true" className="size-4 shrink-0 text-brand" />
        </div>
        <p className="font-serif text-4xl leading-none tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
