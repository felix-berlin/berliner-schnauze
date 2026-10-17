import { redirectsPlugin } from "@payloadcms/plugin-redirects";

import { authenticatedOnly } from "./access";
import { ROUTES } from "./lib/routes";

/**
 * `redirects` collection: an old path -> a doc (follows its current slug) or a custom url. The site answers a 404
 * with a matching redirect (website/src/middleware); a slug change adds one itself (hooks/redirectOldSlug).
 */
export const redirects = redirectsPlugin({
  collections: Object.keys(ROUTES),
  redirectTypes: ["301", "302"],
  redirectTypeFieldOverride: { defaultValue: "301" },
  overrides: {
    // The plugin reads publicly by default; the site reads through the Local API.
    access: authenticatedOnly,
    admin: { description: "Alter Pfad, z. B. /wort/alter-slug → Dokument oder eigene URL." },
  },
});
