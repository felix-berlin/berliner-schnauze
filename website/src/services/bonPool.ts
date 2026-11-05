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
    ...siteRead(),
  });
  return docs.flatMap((w) => {
    const translation = w.translations?.[0]?.translation;
    return w.berlinerisch && translation
      ? [{ id: `r${w.id}`, isReal: true, translation, word: w.berlinerisch }]
      : [];
  });
};

const real = ttl(60_000, loadReal);

export async function loadPool(): Promise<{ real: DealtCard[]; fake: DealtCard[] }> {
  return {
    fake: fakeWords.map((f, i) => ({ id: `f${i}`, isReal: false, word: f.word })),
    real: await real(),
  };
}
