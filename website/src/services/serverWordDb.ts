import { ttl } from "@services/cache.ts";
import { buildWordDb } from "@services/wordSearchDb.ts";

import { getSearchIndexEntries } from "@/pages/api/search/index.json.ts";

/** Server-side Orama DB over the same entries the browser gets; rebuilt with the 60 s words window. */
export const getServerWordDb = ttl(60_000, async () => {
  const entries = await getSearchIndexEntries();
  return { db: await buildWordDb(entries), entries };
});
