import { Clock, Download, Eye, Users, type LucideIcon } from "lucide-react";

import { strings } from "@/strings";

import type { StatsCard, StatsKey } from "./document-stats-model";
import { StatCard } from "./StatCard";

const ICONS: Readonly<Record<StatsKey, LucideIcon>> = {
  readers: Users,
  opens: Eye,
  downloads: Download,
  avgTime: Clock,
};

/** A version's headline numbers, like the overview's: two across on a phone, four on a wide screen. */
export function DocumentStatsCards({ cards }: { readonly cards: readonly StatsCard[] }) {
  return (
    <ul aria-label={strings.admin.stats.kpis.label} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <li key={card.key}>
          <StatCard label={card.label} value={card.value} detail={card.detail} icon={ICONS[card.key]} />
        </li>
      ))}
    </ul>
  );
}
