import { Presentation } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { strings } from "@/strings";
import { presentPath } from "@/viewer/present-route";
import { VideoPlayer } from "@/viewer/VideoPlayer";
import { ViewerPending } from "@/viewer/ViewerStates";

import { DownloadButton } from "./DocumentCard";
import type { InvestorDocument } from "./documents-api";
import type { FeaturedPitch } from "./library-model";
import { DeckCover, PitchCard, VideoPoster } from "./PitchCard";
import { useDownload } from "./use-download";
import { usePitchVideo, type PitchVideo } from "./use-pitch-video";

const copy = strings.home.pitch;

interface CardProps {
  readonly document: InvestorDocument;
  /** Reads the list again (the document went). */
  readonly onGone: () => void;
}

/** The deck: View the deck opens the viewer in present mode, which asks for the link (KP20); Download PDF saves it. */
function DeckCard({ document, onGone }: CardProps) {
  const action = useDownload(document.id, onGone);
  const actions = (
    <>
      <Button asChild size="sm">
        <Link to={presentPath(document.id)}>
          <Presentation aria-hidden="true" />
          {copy.viewDeck}
        </Link>
      </Button>
      <DownloadButton document={document} action={action} label={copy.downloadDeck} />
    </>
  );
  return (
    <PitchCard
      document={document}
      media={<DeckCover pageCount={document.pageCount} />}
      actions={actions}
      message={action.message}
    />
  );
}

/** The poster until play is pressed; then the link's states and the player, as on the video's page. */
function VideoMedia({ title, video }: { readonly title: string; readonly video: PitchVideo }) {
  const { started, start, link, resume, onFailure, onProgress } = video;
  if (!started) return <VideoPoster title={title} onPlay={start} />;
  const { phase } = link;
  // The card's own Download sits under it, so the failure shows none of its own.
  if (phase.kind !== "ready") {
    return <ViewerPending phase={phase} onRetry={link.retry} download={null} loadFailedBody={strings.viewer.video.failed} />;
  }
  return (
    <VideoPlayer
      key={phase.url}
      url={phase.url}
      title={title}
      resume={resume}
      onFailure={onFailure}
      onPlaying={link.onPlayed}
      onProgress={onProgress}
    />
  );
}

function VideoCard({ userId, document, onGone }: CardProps & { readonly userId: string }) {
  const video = usePitchVideo(userId, document.id, onGone);
  const action = useDownload(document.id, onGone);
  const actions = <DownloadButton document={document} action={action} label={copy.downloadVideo} />;
  return (
    <PitchCard
      document={document}
      media={<VideoMedia title={document.title} video={video} />}
      actions={actions}
      message={action.message}
    />
  );
}

interface PitchFeatureProps {
  readonly userId: string;
  readonly pitch: FeaturedPitch;
  /** Reads the list again (a document went). */
  readonly onGone: () => void;
}

/**
 * The top of the home page (W3-03): the 'Pitch' deck and video, each with
 * its download. One column on a phone, side by side from tablets up, like
 * the library's cards. Nothing here asks for a link until a button is pressed.
 */
export function PitchFeature({ userId, pitch, onGone }: PitchFeatureProps) {
  // A headed section like the library's groups, not a landmark: the overview is the page's one region.
  return (
    <section>
      <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {strings.home.pitchTitle}
      </h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {pitch.deck && (
          <li>
            <DeckCard key={pitch.deck.id} document={pitch.deck} onGone={onGone} />
          </li>
        )}
        {pitch.video && (
          <li>
            {/* Keyed: another video is another open, with its own link and milestones. */}
            <VideoCard key={pitch.video.id} userId={userId} document={pitch.video} onGone={onGone} />
          </li>
        )}
      </ul>
    </section>
  );
}
