import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * A colour read from a --ui-* variable (src/styles/tokens.css). color-mix
 * keeps Tailwind's opacity modifiers (bg-primary/90) working on a variable
 * that holds a hex or oklch value.
 */
const token = (name: string) => `color-mix(in oklab, var(--ui-${name}) calc(<alpha-value> * 100%), transparent)`;

const pair = (name: string) => ({ DEFAULT: token(name), foreground: token(`${name}-foreground`) });

// No darkMode: the mood is data-mood on <body> and the tokens follow it (KP13).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      fontFamily: {
        sans: "var(--sans)",
        serif: "var(--serif)",
        mono: "var(--mono)",
      },
      colors: {
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        background: token("background"),
        foreground: token("foreground"),
        primary: pair("primary"),
        secondary: pair("secondary"),
        destructive: pair("destructive"),
        muted: pair("muted"),
        accent: pair("accent"),
        brand: pair("brand"),
        popover: pair("popover"),
        card: pair("card"),
        // The brand orange (tokens.css --ship): the ship mark, the photo badge and the product icon squares only.
        ship: token("ship"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "calc(var(--radius) / 2)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
