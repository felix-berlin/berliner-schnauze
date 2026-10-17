import type { Access, PayloadRequest } from "payload";

export const authenticated: Access = ({ req }) => Boolean(req.user);

/** The default for content: the site reads it through the Local API, the REST/GraphQL API only for logged-in users. */
export const authenticatedOnly = { read: authenticated, create: authenticated, update: authenticated, delete: authenticated };

/**
 * `req.context` flag of the site's own Local API reads (`siteRead()` in website/src/services/payload.ts): "published",
 * or "all" with SHOW_TEST_DATA. A REST/GraphQL request starts with an empty context, so it can never set it.
 */
export type SiteRead = "all" | "published";
const siteRead = (req: PayloadRequest) => req.context?.siteRead as SiteRead | undefined;

/** Content without drafts: logged-in users and the site's reads. */
export const contentRead: Access = ({ req }) => Boolean(req.user) || siteRead(req) !== undefined;

/**
 * Content with drafts: the site reads published docs only (or all with SHOW_TEST_DATA), also where they are populated
 * into another doc, so a draft can never go public through a query or relation that forgot to filter.
 */
export const draftsRead: Access = ({ req }) => {
  if (req.user || siteRead(req) === "all") return true;
  return siteRead(req) === "published" ? { _status: { equals: "published" } } : false;
};

export const contentAccess = { ...authenticatedOnly, read: contentRead };
export const draftsAccess = { ...authenticatedOnly, read: draftsRead };

export const authenticatedGlobal = { read: authenticated, update: authenticated };

/** Files are public (`/api/media/file/*` passes `isReadingStaticFile`); listing the media docs needs login (or the site). */
export const mediaRead: Access = ({ req, isReadingStaticFile }) =>
  Boolean(req.user) || isReadingStaticFile === true || siteRead(req) !== undefined;

/**
 * Open only while no user exists, so the first admin can be created; in production only
 * with PAYLOAD_ALLOW_FIRST_USER=true. Payload's `/api/users/first-register` bypasses this
 * (it creates with overrideAccess), so it guards the plain `POST /api/users` only.
 */
export const usersCreate: Access = async ({ req }) => {
  if (req.user) return true;
  if (process.env.NODE_ENV === "production" && process.env.PAYLOAD_ALLOW_FIRST_USER !== "true") return false;
  const { totalDocs } = await req.payload.count({ collection: "users", overrideAccess: true });
  return totalDocs === 0;
};
