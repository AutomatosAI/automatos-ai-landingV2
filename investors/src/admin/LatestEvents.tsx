import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { adminInvestorPath } from "@/lib/paths";
import { strings } from "@/strings";

import type { LatestEvent } from "./overview-api";
import { eventText, investorLabel } from "./overview-model";

const copy = strings.admin.overview.latest;

function EventRow({ event }: { readonly event: LatestEvent }) {
  return (
    <li className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4">
      <div className="min-w-0">
        <p className="truncate">
          <Link to={adminInvestorPath(event.investorId)} className="font-medium underline-offset-4 hover:underline">
            {investorLabel(event)}
          </Link>
          {event.investorFirm ? <span className="text-muted-foreground"> · {event.investorFirm}</span> : null}
        </p>
        <p className="text-sm text-foreground/80">{eventText(event)}</p>
      </div>
      <time dateTime={event.createdAt} className="font-mono text-[11px] text-muted-foreground">
        {formatDateTime(event.createdAt)}
      </time>
    </li>
  );
}

/** The newest events, each linking to its investor's page (the reference AnalyticsManager's timeline rows). */
export function LatestEvents({ events }: { readonly events: readonly LatestEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <ol aria-label={copy.title} className="divide-y border-t">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
