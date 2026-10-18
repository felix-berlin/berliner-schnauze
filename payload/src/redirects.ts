import { redirectsPlugin } from "@payloadcms/plugin-redirects";

import { contentAccess } from "./access";
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
    // The plugin reads publicly by default; here only logged-in users and the site's Local API reads.
    access: contentAccess,
    admin: { description: "Alter Pfad, z. B. /wort/alter-slug → Dokument oder eigene URL." },
  },
});
