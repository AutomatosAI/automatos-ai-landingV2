import { Activity, Download, Eye, Users, type LucideIcon } from "lucide-react";

import { strings } from "@/strings";

import type { KpiCard, KpiKey } from "./overview-model";
import { StatCard } from "./StatCard";

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
      {cards.map((card) => (
        <li key={card.key}>
          <StatCard label={card.label} value={card.value} detail={card.detail} icon={ICONS[card.key]} />
        </li>
      ))}
    </ul>
  );
}
