import coverShip from "@/assets/brand/cover-ship.jpg";
import founderPhoto from "@/assets/brand/gerard-avatar.png";

/*
 * The portal's two pictures, imported so that Vite emits them hashed under
 * /investors/assets/, which server/investors/static.js serves with a year's
 * cache and vite preview serves in e2e. Never /images/…: the e2e preview
 * server serves only /investors/. Width and height are the files' own, so
 * the browser keeps their room before they load.
 */

/** The cover band: the company site's default hero (images/ship.jpeg), re-encoded small. */
export const COVER_IMAGE = { src: coverShip, width: 1408, height: 768 } as const;

/** The founder's photo, approved for the public page and this public repo. */
export const FOUNDER_PHOTO = { src: founderPhoto, width: 236, height: 236 } as const;
