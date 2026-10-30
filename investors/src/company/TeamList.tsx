import { Fragment, useId } from "react";

import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { TEAM, type TeamMember } from "./company-data";

const copy = strings.company;

const LABEL = "font-mono uppercase tracking-[0.18em] text-muted-foreground";

interface TeamListProps {
  /** `list`: the signed-out page's card, name over role. `inline`: Home's one line after a "Team" label. */
  readonly variant: "list" | "inline";
  /** The team; slide 11's public row (company-data.ts) unless a test passes its own. */
  readonly team?: readonly TeamMember[];
  readonly className?: string;
}

function TeamCard({ team, className }: { readonly team: readonly TeamMember[]; readonly className?: string }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn("rounded-md border border-border bg-background px-5 pb-1.5 pt-[18px]", className)}
    >
      <h2 id={headingId} className={cn(LABEL, "text-[11px] leading-tight")}>
        {copy.team}
      </h2>
      <ul className="mt-1.5 divide-y divide-border">
        {team.map((member) => (
          <li key={member.name} className="flex flex-col gap-px py-[11px]">
            <span className="text-[15px] font-medium">{member.name}</span>
            <span className="text-sm text-muted-foreground">{member.role}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamLine({ team, className }: { readonly team: readonly TeamMember[]; readonly className?: string }) {
  return (
    <p
      className={cn(
        "flex flex-col gap-1.5 text-sm text-[color:var(--fg-2)] md:flex-row md:items-baseline md:gap-3.5",
        className,
      )}
    >
      <span className={cn(LABEL, "shrink-0 text-[10.5px] leading-tight")}>{copy.team}</span>
      <span>
        {team.map((member, index) => (
          <Fragment key={member.name}>
            {index > 0 ? copy.teamSeparator : null}
            <span className="whitespace-nowrap">{copy.teamEntry(member.name, member.role)}</span>
          </Fragment>
        ))}
      </span>
    </p>
  );
}

/**
 * The team, so the portal never reads as a solo founder (PRD-003 D1): names
 * and roles exactly as the deck's public upload gives them, nothing more.
 */
export function TeamList({ variant, team = TEAM, className }: TeamListProps) {
  return variant === "list" ? (
    <TeamCard team={team} className={className} />
  ) : (
    <TeamLine team={team} className={className} />
  );
}
