import { cn } from "@/lib/utils";

import { STATUS_DOT_SHAPES, type StatusDotShape, type StatusLabel } from "./status";

/*
 * The dot's shape carries the status, in existing tokens only (PRD-003 D9):
 * LIVE filled in the accent; IN BETA half-filled and BUILDING NOW a ring,
 * both in --fg-2; NEXT, WITH THIS FUNDING a dashed ring in --muted.
 */
const DOT_CLASSES: Readonly<Record<StatusDotShape, string>> = {
  filled: "bg-brand",
  half: "border-[1.5px] border-[color:var(--fg-2)] bg-[linear-gradient(90deg,var(--fg-2)_50%,transparent_50%)]",
  ring: "border-[1.5px] border-[color:var(--fg-2)]",
  "dashed-ring": "border-[1.5px] border-dashed border-muted-foreground",
};

/**
 * A product's status as the register prints it: Geist Mono capitals in --fg-2
 * on --bg-2 with a thin rule (as the admin list's published state), and an
 * 8 px dot whose shape tells the statuses apart without a colour of its own.
 * Never orange: the brand colour is the ship's alone.
 */
export function StatusChip({ status }: { readonly status: StatusLabel }) {
  const shape = STATUS_DOT_SHAPES[status];
  return (
    <span
      data-status={status}
      className="inline-flex h-[22px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-md border border-border bg-secondary px-2 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[color:var(--fg-2)]"
    >
      <span aria-hidden="true" data-shape={shape} className={cn("size-2 shrink-0 rounded-full", DOT_CLASSES[shape])} />
      {status}
    </span>
  );
}
