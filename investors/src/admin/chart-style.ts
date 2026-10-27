/**
 * How the admin charts look (recharts props): the site's tokens (KP13), so
 * they follow the mood. Thin rules, mono ticks, square corners, no glow.
 */

export const CHART_HEIGHT = 220;

export const TICK = { fontSize: 10, fill: "var(--muted)", fontFamily: "var(--mono)" } as const;

export const RULE = "var(--rule-c)";

export const TOOLTIP_STYLE = {
  backgroundColor: "var(--bg-2)",
  border: `1px solid ${RULE}`,
  borderRadius: "var(--radius)",
  color: "var(--fg)",
  fontSize: 12,
} as const;
