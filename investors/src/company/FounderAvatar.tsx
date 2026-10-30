import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { FOUNDER_PHOTO } from "./brand-images";
import { ShipMark } from "./ShipMark";

/** 112 px on the teaser's founder card, 64 px in Home's header (the mock). */
const AVATAR_SIZES = {
  card: { box: "size-28", badgeRing: "ring-[3px]" },
  header: { box: "size-16", badgeRing: "ring-2" },
} as const;

export type FounderAvatarSize = keyof typeof AVATAR_SIZES;

interface FounderAvatarProps {
  readonly size: FounderAvatarSize;
  readonly className?: string;
}

/**
 * The founder's round photo with our ship badge on its bottom-right.
 *
 * The photo is zoomed to 112 % about its centre, so the source's grey ring
 * (about 109 px from the centre of the 236 px file) falls outside the circle
 * and the old badge's visible part sits under ours. The badge is ringed in
 * the page's background so it reads in both moods, and it is decorative: the
 * photo's alt text and the name beside it say who this is.
 */
export function FounderAvatar({ size, className }: FounderAvatarProps) {
  const sizes = AVATAR_SIZES[size];
  return (
    <div className={cn("relative shrink-0", sizes.box, className)}>
      <span className="block size-full overflow-hidden rounded-full bg-secondary ring-1 ring-border">
        <img
          src={FOUNDER_PHOTO.src}
          width={FOUNDER_PHOTO.width}
          height={FOUNDER_PHOTO.height}
          alt={strings.company.founderPhotoAlt}
          loading="eager"
          decoding="async"
          className="ml-[-6%] mt-[-6%] block size-[112%] max-w-none"
        />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-[68%] top-[53%] grid size-[44%] place-items-center rounded-full bg-ship text-white ring-background",
          sizes.badgeRing,
        )}
      >
        <ShipMark className="size-[78%]" />
      </span>
    </div>
  );
}
