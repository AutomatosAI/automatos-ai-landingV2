import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/strings";

import { CHART_HEIGHT, RULE, TICK, TOOLTIP_STYLE } from "./chart-style";
import type { DocumentStats } from "./document-stats-api";
import {
  chartEmptyText,
  chartState,
  dwellSummary,
  dwellText,
  reachSummary,
  reachText,
  toPageRows,
  type PageRow,
} from "./document-stats-model";

const copy = strings.admin.stats;

// Site tokens (KP13): the bars in the accent, the line in the second ink, so both follow the mood.
const BAR_COLOR = "var(--accent)";
const LINE_COLOR = "var(--fg-2)";
/** Each page gets a dot on the line until there are too many to tell apart. */
const DOT_LIMIT = 40;
const BAR_MAX_WIDTH = 32;
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 } as const;
const Y_WIDTH = 40;
const PERCENT_TICKS = [0, 25, 50, 75, 100];

// The same page axis on both charts, so a page's bar sits above its point on the line.
const PAGE_AXIS = {
  dataKey: "label",
  tick: TICK,
  tickLine: false,
  axisLine: { stroke: RULE },
  interval: "preserveStartEnd",
  minTickGap: 8,
} as const;

const pageTitle = (label: unknown) => copy.pageLabel(Number(label));

function ChartCard({ title, caption, children }: { readonly title: string; readonly caption?: string; readonly children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">{title}</CardTitle>
        {caption && <p className="text-sm text-muted-foreground">{caption}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DwellChart({ rows, summary }: { readonly rows: readonly PageRow[]; readonly summary: string }) {
  return (
    <ChartCard title={copy.dwell.title} caption={copy.dwell.caption}>
      <div role="img" aria-label={summary} style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={[...rows]} margin={MARGIN}>
            <CartesianGrid stroke={RULE} strokeDasharray="3 3" vertical={false} />
            <XAxis {...PAGE_AXIS} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} width={Y_WIDTH} tickFormatter={copy.dwell.tick} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: RULE }}
              labelFormatter={pageTitle}
              formatter={(value) => dwellText(Number(value))}
            />
            <Bar
              dataKey="dwellSeconds"
              name={copy.dwell.series}
              fill={BAR_COLOR}
              maxBarSize={BAR_MAX_WIDTH}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function ReachChart({ rows, summary }: { readonly rows: readonly PageRow[]; readonly summary: string }) {
  const dot = rows.length <= DOT_LIMIT ? { r: 2, fill: LINE_COLOR, strokeWidth: 0 } : false;
  return (
    <ChartCard title={copy.reach.title} caption={copy.reach.caption}>
      <div role="img" aria-label={summary} style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={[...rows]} margin={MARGIN}>
            <CartesianGrid stroke={RULE} strokeDasharray="3 3" vertical={false} />
            <XAxis {...PAGE_AXIS} />
            <YAxis
              tick={TICK}
              tickLine={false}
              axisLine={false}
              width={Y_WIDTH}
              domain={[0, 100]}
              ticks={PERCENT_TICKS}
              tickFormatter={copy.reach.tick}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ stroke: RULE }}
              labelFormatter={pageTitle}
              formatter={(value, _name, item) => reachText(Number(value), item.payload)}
            />
            <Line
              type="linear"
              dataKey="pctReached"
              name={copy.reach.series}
              stroke={LINE_COLOR}
              strokeWidth={1.5}
              dot={dot}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/**
 * Where readers drop off: average time on each page (bars) and the share of
 * readers reaching it (a line), page by page; words in their place when the
 * pages cannot be charted.
 */
export function PageCharts({ stats }: { readonly stats: DocumentStats }) {
  const empty = chartEmptyText(chartState(stats));
  if (empty !== null) {
    return (
      <ChartCard title={copy.pages.title}>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </ChartCard>
    );
  }
  const rows = toPageRows(stats.pages);
  return (
    <div className="grid gap-6">
      <DwellChart rows={rows} summary={dwellSummary(stats.pages)} />
      <ReachChart rows={rows} summary={reachSummary(stats.pages)} />
    </div>
  );
}
