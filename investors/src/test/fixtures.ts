import type { Me } from "@/api/me";

/** A new investor as GET /me answers before the profile is saved (KP5: invented). */
export const NEW_ADA: Me = {
  investor: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "ada@example.com",
    name: "Ada Example",
    firm: null,
    title: null,
    investorType: null,
    chequeSize: null,
    linkedinUrl: null,
    country: null,
    source: null,
    marketingOptIn: false,
  },
  isAdmin: false,
  profileComplete: false,
};

/** The same investor once the profile is saved. */
export const ADA_ME: Me = {
  ...NEW_ADA,
  investor: {
    ...NEW_ADA.investor,
    firm: "Example Ventures",
    title: "Partner",
    investorType: "vc",
    chequeSize: "250k_1m",
    linkedinUrl: "https://www.linkedin.com/in/ada-example",
    country: "Ireland",
    source: "websummit",
  },
  profileComplete: true,
};
