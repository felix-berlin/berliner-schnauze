import type { GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

/**
 * Time of the last change that alters a public page. The hooks in `hooks/cacheStamp.ts` set it in the transaction
 * of the change; every web container polls it and empties its caches when it moves.
 */
export const CacheStamp: GlobalConfig = {
  slug: "cache-stamp",
  access: authenticatedGlobal,
  admin: { hidden: true },
  fields: [{ name: "changedAt", type: "date" }],
};
