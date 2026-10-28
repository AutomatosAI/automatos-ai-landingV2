/**
 * Present mode's motion (W3-02): a 150 ms fade as a slide appears and as the
 * bar comes and goes, and none at all when the investor asks the system for
 * reduced motion (every class sits behind motion-safe:). Each slide is a new
 * canvas (react-pdf mounts one per page), so the fade runs once per slide.
 */

export const FADE_MS = 150;

export const SLIDE_FADE =
  "motion-safe:[&_canvas]:animate-in motion-safe:[&_canvas]:fade-in motion-safe:[&_canvas]:duration-150";

export const BAR_FADE = "motion-safe:transition-opacity motion-safe:duration-150";
