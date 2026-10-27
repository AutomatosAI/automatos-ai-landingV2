import { cn } from "@/lib/utils";
import { strings } from "@/strings";
import { saveMood } from "@/theme/apply-mood";
import { useMood } from "@/theme/use-mood";

const copy = strings.mood;

/** The site's bone/pitch switch (_theme.js), in the portal's menu: same storage key, same two moods. */
export function MoodToggle({ className }: { readonly className?: string }) {
  const mood = useMood();
  const next = mood === "pitch" ? "bone" : "pitch";
  return (
    <button
      type="button"
      onClick={() => saveMood(next)}
      aria-label={next === "pitch" ? copy.toPitch : copy.toBone}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border border-input bg-secondary px-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", mood === "pitch" ? "bg-brand" : "bg-foreground")} />
      {mood === "pitch" ? copy.pitch : copy.bone}
    </button>
  );
}
