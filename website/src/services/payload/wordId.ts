import { getPayloadClient, siteRead } from "@services/payload.ts";
import { fetchWordBySlug } from "@services/payload/words.ts";

/** Only published words resolve (siteRead hides drafts and trashed words); null for an unknown slug. */
export const wordIdBySlug = async (slug: string) =>
  (
    await (
      await getPayloadClient()
    ).find({
      collection: "words",
      depth: 0,
      limit: 1,
      pagination: false,
      select: {},
      where: { slug: { equals: slug } },
      ...siteRead(),
    })
  ).docs[0]?.id ?? null;

/**
 * The id from the in-memory slug index of the public words (no query; up to a minute behind the CMS, and with
 * SHOW_TEST_DATA drafts resolve too). For read-only routes: the writes keep `wordIdBySlug`, which never rejects a
 * word that was just published.
 */
export const cachedWordIdBySlug = async (slug: string) => (await fetchWordBySlug(slug))?.id ?? null;
