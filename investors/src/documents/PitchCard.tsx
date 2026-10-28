import { Play, Presentation } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import type { InvestorDocument } from "./documents-api";
import { documentFacts } from "./library-model";

const copy = strings.home.pitch;

/** The 16:9 box the deck's cover and the video's poster share, so the two cards line up side by side. */
const MEDIA_BOX = "aspect-video w-full rounded-lg border bg-secondary";

/** The ring a keyboard investor sees on the poster, and on the video's frame once play is pressed. */
export const FOCUS_RING =
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** The deck's cover: no page of it is drawn, since that would need a link, and a link is an open (KP20). */
export function DeckCover({ pageCount }: { readonly pageCount: number | null }) {
  return (
    <div className={cn(MEDIA_BOX, "relative grid place-items-center")}>
      <Presentation aria-hidden="true" strokeWidth={1.25} className="size-10 text-muted-foreground" />
      {pageCount !== null && (
        <p className="absolute bottom-3 left-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {copy.slides(pageCount)}
        </p>
      )}
    </div>
  );
}

/** The video before it plays: one press asks for its link and starts it (KP20). */
export function VideoPoster({ title, onPlay }: { readonly title: string; readonly onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={strings.library.actionLabel(copy.play, title)}
      className={cn(MEDIA_BOX, "group grid place-items-center", FOCUS_RING)}
    >
      <span
        className={cn(
          buttonVariants(),
          "group-hover:border-brand group-hover:bg-brand group-hover:text-brand-foreground",
        )}
      >
        <Play aria-hidden="true" />
        {copy.play}
      </span>
    </button>
  );
}

interface PitchCardProps {
  readonly document: InvestorDocument;
  /** The deck's cover, or the video's poster and then its player, above the words. */
  readonly media: ReactNode;
  readonly actions: ReactNode;
  /** Why the last download failed, in plain words; null otherwise. */
  readonly message: string | null;
}

/** One half of the pitch block: the media, then the title, description and facts as a library card says them. */
export function PitchCard({ document, media, actions, message }: PitchCardProps) {
  return (
    <Card className="flex h-full flex-col gap-5 p-4 sm:p-5">
      {media}
      <div className="min-w-0">
        <h3 className="font-serif text-2xl font-normal leading-tight tracking-tight">{document.title}</h3>
        {document.description && <p className="mt-2 text-sm text-muted-foreground">{document.description}</p>}
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {documentFacts(document).join(" · ")}
        </p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">{actions}</div>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </Card>
  );
}
