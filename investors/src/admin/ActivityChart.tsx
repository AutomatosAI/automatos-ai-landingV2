import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/strings";

import { CHART_HEIGHT, RULE, TICK, TOOLTIP_STYLE } from "./chart-style";
import type { SeriesDay } from "./overview-api";
import { CHART_LINES, chartSummary, hasActivity, toChartRows } from "./overview-model";

const copy = strings.admin.overview.chart;

function Legend() {
  return (
    <ul
      aria-label={copy.legend}
      className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
    >
      {CHART_LINES.map((line) => (
        <li key={line.key} className="flex items-center gap-2">
          <svg aria-hidden="true" width="18" height="6" className="shrink-0">
            <line x1="0" y1="3" x2="18" y2="3" stroke={line.color} strokeWidth="2" strokeDasharray={line.dash} />
          </svg>
          {line.label}
        </li>
      ))}
    </ul>
  );
}

function Chart({ series }: { readonly series: readonly SeriesDay[] }) {
  return (
    <div role="img" aria-label={chartSummary(series)} style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={[...toChartRows(series)]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={RULE} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: RULE }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: RULE }} />
          {CHART_LINES.map((line) => (
            <Line
              key={line.key}
              type="linear"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={1.5}
              strokeDasharray={line.dash}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Daily sign-ups and active investors over the series' 30 UTC days (the reference AnalyticsManager's activity chart). */
export function ActivityChart({ series }: { readonly series: readonly SeriesDay[] }) {
  const active = hasActivity(series);
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{copy.caption}</p>
        {active ? <Legend /> : null}
      </CardHeader>
      <CardContent>
        {active ? (
          <Chart series={series} />
        ) : (
          <p className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT }}>
            {copy.empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
