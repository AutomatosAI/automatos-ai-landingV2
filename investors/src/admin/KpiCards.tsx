import { Activity, Download, Eye, Users, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { strings } from "@/strings";

import type { KpiCard, KpiKey } from "./overview-model";

const ICONS: Readonly<Record<KpiKey, LucideIcon>> = {
  investors: Users,
  active: Activity,
  deckOpens: Eye,
  downloads: Download,
};

/**
 * The overview's headline numbers (ported from the reference AnalyticsManager's
 * stat cards): two across on a phone, four on a wide screen.
 */
export function KpiCards({ cards }: { readonly cards: readonly KpiCard[] }) {
  return (
    <ul aria-label={strings.admin.overview.kpis.label} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = ICONS[card.key];
        return (
          <li key={card.key}>
            <Card className="h-full">
              <CardContent className="grid gap-3 p-4 pt-4 sm:p-5 sm:pt-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-brand" />
                </div>
                <p className="font-serif text-4xl leading-none tracking-tight tabular-nums">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.detail}</p>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
