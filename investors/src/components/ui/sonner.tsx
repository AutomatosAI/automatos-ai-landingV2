import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { strings } from "@/strings";
import { useMood } from "@/theme/use-mood";

// Sonner reads its colours from these variables on the toaster: the site's tokens (KP13), in either mood.
const SITE_TOKENS = {
  "--normal-bg": "var(--bg-2)",
  "--normal-text": "var(--fg)",
  "--normal-border": "var(--rule-strong)",
  "--border-radius": "var(--radius)",
  fontFamily: "var(--sans)",
} as CSSProperties;

/** Toasts in the site's look: square-ish, thin rule, no shadow. Call `toast` from "sonner" to show one. */
function Toaster(props: ToasterProps) {
  const mood = useMood();
  return (
    <Sonner
      theme={mood === "pitch" ? "dark" : "light"}
      style={SITE_TOKENS}
      containerAriaLabel={strings.ui.notifications}
      toastOptions={{
        classNames: {
          toast: "!shadow-none",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
