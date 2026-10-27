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
  /** The first-visit profile form (US-005), also reached later from the account menu. */
  profile: {
    firstTitle: "About you",
    firstIntro: "A few details so the team knows who is reading. It takes about 30 seconds.",
    editTitle: "Your profile",
    editIntro: "Change anything here at any time.",
    optional: "(optional)",
    fields: {
      name: { label: "Name" },
      firm: { label: "Firm", placeholder: "Firm or Independent" },
      title: { label: "Title" },
      investorType: { label: "Investor type", choose: "Choose one" },
      chequeSize: { label: "Typical cheque size", choose: "Prefer not to say" },
      linkedinUrl: { label: "LinkedIn", placeholder: "https://www.linkedin.com/in/your-name" },
      country: { label: "Country" },
      source: { label: "Where did you hear about us?", choose: "Choose one" },
      marketingOptIn: { label: "Send me Automatos investor updates (optional)" },
    },
    investorTypes: {
      vc: "Venture capital",
      angel: "Angel",
      family_office: "Family office",
      corporate: "Corporate",
      accelerator: "Accelerator",
      other: "Other",
    },
    chequeSizes: {
      lt_50k: "Under 50k",
      "50k_250k": "50k to 250k",
      "250k_1m": "250k to 1M",
      gt_1m: "Over 1M",
    },
    sources: {
      websummit: "Web Summit",
      intro: "An introduction",
      website: "The Automatos website",
      other: "Somewhere else",
    },
    errors: {
      required: "This is required.",
      tooLong: (max: number) => `Use ${max} characters or fewer.`,
      invalidOption: "Choose one of the options.",
      linkedinUrl: "Use a LinkedIn address starting with https://, such as https://www.linkedin.com/in/your-name.",
      invalid: "Check this field.",
    },
    checkFields: "Some fields need a look before saving.",
    saveFirst: "Save and continue",
    save: "Save",
    saving: "Saving…",
    saved: "Profile saved.",
    rateLimited: "Too many saves in a row. Wait a minute and try again.",
    failed: "Your profile could not be saved. Please try again in a moment.",
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
