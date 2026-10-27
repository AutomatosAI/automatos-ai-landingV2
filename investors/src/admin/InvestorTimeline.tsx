import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import type { TimelineEvent } from "./investors-api";
import { LoadFailed } from "./LoadFailed";
import { Pager } from "./Pager";
import { eventDetails, timelineText } from "./timeline-model";
import { useTimeline } from "./use-investors";

const copy = strings.admin.investor.timeline;

/** One event; opened, every fact it carries (the reference AnalyticsManager's expandable row). */
function TimelineRow({ event }: { readonly event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  const detailsId = `timeline-event-${event.id}`;
  const text = timelineText(event);

  return (
    <li className="relative py-2">
      <span aria-hidden className="absolute -left-[1.3rem] top-[1.05rem] size-2 rounded-full bg-brand/70" />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={copy.showDetails(text)}
        onClick={() => setOpen((was) => !was)}
        className="flex w-full items-start justify-between gap-3 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 text-sm">{text}</span>
        <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <dl id={detailsId} className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
          {eventDetails(event).map((detail) => (
            <div key={detail.label} className="grid gap-0.5 sm:contents">
              <dt className="font-mono uppercase tracking-[0.16em] text-muted-foreground">{detail.label}</dt>
              <dd className="break-all">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

interface InvestorTimelineProps {
  readonly userId: string;
  readonly investorId: string;
  readonly page: number;
  readonly onPage: (page: number) => void;
}

function TimelineBody({ userId, investorId, page, onPage }: InvestorTimelineProps) {
  const timeline = useTimeline(userId, investorId, page);
  if (timeline.isPending) return <Skeleton className="h-40" aria-busy="true" />;
  if (timeline.isError) return <LoadFailed error={timeline.error} onRetry={() => void timeline.refetch()} />;
  const { events, total, pageSize } = timeline.data;
  if (total === 0) return <p className="text-sm text-muted-foreground">{copy.empty}</p>;
  return (
    <div className={cn("grid gap-4", timeline.isPlaceholderData && "opacity-60")} aria-busy={timeline.isPlaceholderData}>
      <ol aria-label={copy.label} className="ml-1 border-l-2 border-brand/25 pl-4">
        {events.map((event) => (
          <TimelineRow key={event.id} event={event} />
        ))}
      </ol>
      <Pager
        page={page}
        pageSize={pageSize}
        total={total}
        shown={events.length}
        busy={timeline.isPlaceholderData}
        onPage={onPage}
      />
    </div>
  );
}

/** Every event of one investor, newest first, 50 a page. */
export function InvestorTimeline(props: InvestorTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.intro}</CardDescription>
      </CardHeader>
      <CardContent>
        <TimelineBody {...props} />
      </CardContent>
    </Card>
  );
}
