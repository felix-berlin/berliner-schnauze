import type { DealtCard } from "@utils/bonDeck.ts";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, siteRead } from "@services/payload.ts";

import { fakeWords } from "@/data/fakeWords";

const loadReal = async (): Promise<DealtCard[]> => {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "words",
    depth: 0,
    pagination: false,
    select: { berlinerisch: true, slug: true, translations: true },
    ...siteRead(),
  });
  return docs.flatMap((w) => {
    const translation = w.translations?.[0]?.translation;
    return w.berlinerisch?.trim() && translation?.trim()
      ? [
          {
            id: `r${w.id}`,
            isReal: true,
            slug: w.slug ?? undefined,
            translation,
            word: w.berlinerisch,
          },
        ]
      : [];
  });
};

const real = ttl(60_000, loadReal);

const fake: DealtCard[] = fakeWords.map((f, i) => ({
  category: f.category,
  id: `f${i}`,
  isReal: false,
  word: f.word,
}));

export async function loadPool(): Promise<{ real: DealtCard[]; fake: DealtCard[] }> {
  return { fake, real: await real() };
}
