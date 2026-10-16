import type { Access } from "payload";

export const authenticated: Access = ({ req }) => Boolean(req.user);

/** Files are public (`/api/media/file/*` passes `isReadingStaticFile`); listing the media docs needs login. */
export const mediaRead: Access = ({ req, isReadingStaticFile }) => Boolean(req.user) || isReadingStaticFile === true;

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
