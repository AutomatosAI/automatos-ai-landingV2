/** Where the site's Express server serves the app (server/investors/static.js). */
export const APP_BASENAME = "/investors";

/** react-router v6 opt-ins to its v7 behaviour, which also silences its upgrade warnings. */
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

/** App routes, relative to the basename. */
export const HOME_PATH = "/";
export const PROFILE_PATH = "/profile";
export const ADMIN_PATH = "/admin";
export const ADMIN_DOCUMENTS_PATH = "/admin/documents";
