# Handoff: Analytics Dashboard — Six UI Fixes

## Overview
This handoff covers six targeted UI/UX fixes for the **Analytics** dashboard of Automatos A.I. The fixes address specific issues spotted in the live UI: a truncated KPI tile, a chart with no proper axis, plain-div stat tiles, repetitive log rows in Heartbeat, a flat Cost-by-Agent table, and recommendation CTAs that read as tags rather than buttons. A bonus 7th item sketches a 6-column grid system that would let widgets declare their own size.

The handoff is presented as **before / after pairs** so the developer can clearly see what the current state is and what each fix changes.

## About the Design Files
The HTML in this bundle is a **design reference**, not production code to ship. It is a static prototype showing the intended look, layout, and visual language of each fix.

The task is to **recreate these designs inside the existing Automatos A.I. codebase**, using its established framework (React, Vue, etc.), component library, design tokens, and routing — *not* to drop this HTML in directly. Match the visual outcome; use the codebase's idiomatic patterns to get there.

## Fidelity
**High-fidelity.** Colors, typography (Geist / Geist Mono), spacing, border radii, and the Automatos orange accent are all final. The developer should recreate pixel-perfectly, swapping in the codebase's existing component primitives (Card, KPI, Button, Table, etc.) where they exist.

## Files in this handoff
- `Analytics Fixes.html` — the full mockup, six before/after sections plus the optional grid sketch
- `README.md` — this document

To view the mockup locally, open `Analytics Fixes.html` directly in a browser.

---

## Fixes

### Fix 1 — Top KPI tile no longer truncates

**Problem:** The "Top Spender" tile shows `G…` because `GA ANALYST` is too long for the value slot.

**Solution:** Lead with the **dollar amount** ($76.01), put the model name in the meta slot, and put the agent name in the label as a suffix: `Top Spender · GA ANALYST`. Same information, no truncation, scans faster because the dollar amount is the actionable number.

**Layout:** 4-column grid of KPI tiles, each ~92px tall, 14px gap. Each tile has:
- 36×36 rounded icon container (`border-radius: 10px`) on the left, tinted background per category
- Stacked text on the right: large value + small meta on one row, smaller label below

**Tile structure (per tile):**
```
.kpi {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  min-height: 92px;
}
```

**Typography:**
- Value: 26px, weight 600, letter-spacing -0.01em
- Meta (right of value): 11px, color `--muted`, no wrap
- Label (below): 12px, color `--muted`

---

### Fix 2 — Chart axis labels make sense

**Problem:** The "Cost by Model Over Time" chart shows a row of unsorted dollar values floating at the top-left (`$0.895 $0.113 $1.09 …`). They appear to be Y-axis ticks but are unsorted, unlabelled, and crammed horizontally.

**Solution:**
- 5 evenly-spaced Y-ticks on the left (`$0`, `$0.5`, `$1.0`, `$1.5`, `$2.0`), right-aligned in a 56px gutter
- Horizontal grid lines at each tick (`background: var(--border)`)
- X-axis with 5 date labels along the bottom
- Trim the legend from 22 model dots to **top-4 + "+18 more"** chip — most series are noise on a glance view

**Chart wrapper structure:**
```
.chartwrap   (relative, height 280px)
  .y-axis    (absolute left, 56px wide, column-reverse flex)
    .tick    (right-aligned mono 10px, color --dim)
  .plot      (absolute, left: 56px to right: 0, border-left: 1px solid --border)
    .grid    (horizontal divider lines at 0/25/50/75/100%)
    svg      (line chart, viewBox 0 0 600 220, preserveAspectRatio none)
  .x-axis    (absolute bottom, flex space-between)
    .xt      (mono 10px, color --dim)
```

**Line styles:** 1.5px stroke, no fill, opacity 0.65–0.85.

---

### Fix 3 — Heartbeat KPIs match the rest of the dashboard

**Problem 1:** The 4 stat tiles (16 / 16 / 0 / 35,500) are plain divs with no border, while every other KPI on the page sits in a bordered card.

**Problem 2:** The body of Heartbeat shows `agent 89` repeated four times, which reads like a log dump.

**Solution:**
- Wrap the 4 stats in `.hbstat.after` containers: `background: var(--surface-2)`, 1px `--border`, `border-radius: 10px`, padding `14px 16px`
- Color the "Successes" value green when non-zero, dim the "Errors" value when zero (visual reinforcement)
- **Group repeated pings into one row** with a frequency pill ("4 pings · hourly") and a 6-segment sparkline showing recency. The full timeline is implicit — no need for 4 identical rows.

**Heartbeat row structure (grouped):**
```
.hbrow {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 0; border-top: 1px solid var(--border);
  font-size: 13px;
}
```
Children: `.ping` (8px green dot with `box-shadow: 0 0 0 4px rgba(34,197,94,0.10)`), `.name`, `.freq` pill (border-radius 999px, font-size 11px), spacer, `.spark` (6 × 3×12px segments, gap 2px), `.ts`.

---

### Fix 4 — Cost by Agent gets a magnitude bar

**Problem:** Every row in the Cost by Agent table looks identical — eye has to read every number to compare agents.

**Solution:** Add a 4px-tall bar under each cost value, width proportional to that agent's share. **Color the bar to match the model's dot in the chart above** (claude-sonnet-4.6 → purple, glm-5 → pink, claude-haiku-4.5 → green) so the visual language is consistent across the page.

**Row grid:** `grid-template-columns: 1.4fr 1.2fr 1fr 0.9fr; gap: 16px; padding: 14px 0; border-top: 1px solid --border`.

**Cost cell:**
```
.cost-cell { display: flex; flex-direction: column; gap: 6px; }
  .v   { font-size: 14px; weight 500; mono }
  .bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.04); position: relative; overflow: hidden; }
    i  { position: absolute; left:0; top:0; bottom:0; border-radius: 2px; width: <share%>; background: <model color> }
```

---

### Fix 5 — Recommendations get real CTAs

**Problem:** The action buttons in recommendation cards ("Cost overview", "Better agent routing", "Enable tool usage") render as small thin pills that look more like tags than clickable actions. Copy is also descriptive ("Better agent routing") rather than verb-led.

**Solution:**
- Change copy to verb-led commands: `View cost overview`, `Assign skills`, `Connect tools`
- Add a trailing arrow icon that animates 2px to the right on hover
- Filled background tinted to match the recommendation's severity color (green / amber / red)
- Stronger border, slightly larger padding, weight 500

**Button (after):**
```
.btn-after {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  font-size: 12px; font-weight: 500;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  transition: all .15s;
}
.btn-after.green { background: rgba(34,197,94,0.10); border-color: rgba(34,197,94,0.30); color: #86efac; }
.btn-after.amber { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.30); color: #fcd34d; }
.btn-after .arr { width: 11px; height: 11px; transition: transform .15s; }
.btn-after:hover .arr { transform: translateX(2px); }
```

---

### Fix 6 — Optional: Six-column grid for widget variety

Today the dashboard alternates between full-width and 50/50. With a 6-column grid, widgets can declare a size: `third` (2 cols), `half` (3 cols), `two-thirds` (4 cols), `full` (6 cols). This is what gives a dashboard rhythm and lets KPI strips, hero charts, and split widgets all coexist without forcing every section into the same shape.

The `Customize` button already on the page becomes considerably more powerful with this in place.

---

## Design Tokens

```css
--bg:            #0a0a0b;        /* page background */
--surface:       #111114;        /* card background */
--surface-2:     #15151a;        /* nested / inset surfaces */
--border:        rgba(255,255,255,0.06);
--border-strong: rgba(255,255,255,0.10);

--text:          #f5f5f7;
--muted:         #8a8a93;
--dim:           #5a5a63;

--orange:        #f97316;        /* primary accent (Automatos) */
--orange-2:      #fb923c;
--green:         #22c55e;
--amber:         #f59e0b;
--blue:          #38bdf8;
--purple:        #a78bfa;
--pink:          #f472b6;
--red:           #ef4444;
```

**Typography:**
- Sans: `Geist`, weights 400/500/600/700
- Mono: `Geist Mono`, weights 400/500
- Both via Google Fonts

**Spacing & radii:**
- Card padding: 22–26px
- Card border-radius: 14px
- KPI tile border-radius: 14px, icon container 10px, button 8px, pill/freq 999px
- Section spacing: 80px between sections
- Inline gaps: 10–16px

**Model dot palette** (used in chart, legend, and Cost-by-Agent bars):
- claude-sonnet-4.6 → `#a78bfa`
- gpt-5.5 → `#22c55e`
- glm-5 → `#f472b6`
- gemini-2.5-pro → `#38bdf8`
- claude-haiku-4.5 → `#22c55e` (or use a distinct green variant)

## Interactions
- **Recommendation CTA hover:** background lightens by 4%, arrow slides 2px right (transition 150ms)
- **Recommendation dismiss (×):** removes the card with a 200ms fade + height collapse
- **KPI tiles, agent rows:** static (no hover state needed)
- **Chart legend item:** hover dims other series to 0.2 opacity (recommended; not implemented in mock)

## State Management
None of these fixes introduce new state. They are presentational changes to existing data:
- KPI tiles read the same fields, just reformatted
- Chart needs `yMax` derivation for the axis (`Math.ceil(max / 0.5) * 0.5` or similar nice-round)
- Heartbeat needs to **group consecutive pings from the same agent** before render — group key is agent ID, aggregate count and last timestamp
- Cost-by-Agent needs each agent's `costShare = cost / maxCost` for the bar width

## Recreation checklist
1. Find the existing `KpiTile`, `Card`, `Button`, `Table` primitives in the codebase — use those, don't introduce a parallel set
2. Find or add a `models[modelName].color` lookup so the bar/dot colors stay consistent across the page
3. Apply Fix 1 to the LLM & Costs tab KPI row
4. Refactor the line chart's axis rendering — most chart libraries (Recharts, Visx, Chart.js) have an axis prop that's been disabled or misconfigured
5. Apply Fix 3's grouping in the Heartbeat data layer, not the view
6. The bar in Fix 4 is the same primitive used in the Token Usage table's `share` column — extract it to a shared component
7. Replace the recommendation pill with the existing `Button` component, sized small with the severity variant
