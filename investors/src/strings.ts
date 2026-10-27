/**
 * Every string the investor portal shows (KP14): calm and factual.
 */

const HELLO_EMAIL = "hello@automatos.app";
const PRIVACY_EMAIL = "privacy@automatos.app";

export const strings = {
  shell: {
    wordmark: "Automatos",
    section: "Investors",
    homeLabel: "Automatos home",
  },
  contact: {
    helloEmail: HELLO_EMAIL,
    privacyEmail: PRIVACY_EMAIL,
  },
  placeholder: {
    title: "Investor portal",
    body: "The portal is being set up. Please check back soon.",
  },
  teaser: {
    title: "Investor portal",
    pitch: "Automatos is an open-source operating system for AI agents.",
    insideHeading: "What's inside",
    inside: ["Pitch deck", "One-pager", "Product demo", "Business model", "Team", "FAQ"],
    signInHeading: "Access",
    signInBody: "Create an account or sign in to read the documents.",
  },
  auth: {
    createAccount: "Create account",
    signIn: "Sign in",
    /** Clerk did not load: the teaser shows this instead of the buttons. */
    signInUnavailable: { before: "Sign-in is unavailable right now. Email ", after: "." },
    accountMenu: "Account",
    profile: "Profile",
    signOut: "Sign out",
  },
  /** KP14: under the teaser's sign-in and the profile form. */
  trackingNotice: {
    before:
      "When you sign in, we record which documents you open or download and how long you spend on each page, so the team can follow up with the right information. See our ",
    policyLink: "Privacy Policy",
    policyHref: "/privacy",
    middle: ". Ask ",
    after: " to see or delete your data.",
  },
  status: {
    loading: "Loading…",
    unavailable: {
      title: "Temporarily unavailable",
      body: "The investor portal is temporarily unavailable.",
      contactBefore: "Email ",
      contactAfter: " if you need anything in the meantime.",
    },
    blocked: {
      title: "Access paused",
      before: "Your access has been paused. Contact ",
      after: ".",
    },
    signIn: {
      title: "Please sign in again",
      body: "Your session has ended.",
    },
    emailRequired: {
      title: "A verified email is needed",
      body: "Your account has no verified email address. Sign in with an account whose email address is verified.",
    },
    notAvailable: {
      title: "Not available",
      body: "This page is not available to your account.",
    },
    error: {
      title: "Something went wrong",
      body: "Please try again in a moment.",
      retry: "Try again",
    },
  },
} as const;
