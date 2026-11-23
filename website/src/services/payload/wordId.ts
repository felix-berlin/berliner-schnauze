import { getPayloadClient, siteRead } from "@services/payload.ts";

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
