import { ttl } from "@services/cache.ts";
import { fetchJson } from "@services/fetchJson.ts";
import { ANKI_DECK_FULL_PRODUCT_ID, POLAR_PRICE_TOKEN, POLAR_SANDBOX } from "astro:env/server";

const API_HOST = POLAR_SANDBOX ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";

interface PolarProduct {
  prices?: { amount_type: string; price_amount?: number }[];
}

async function loadPriceCents(): Promise<number | undefined> {
  if (!POLAR_PRICE_TOKEN || !ANKI_DECK_FULL_PRODUCT_ID) return undefined;

  const product = await fetchJson<PolarProduct>(
    `${API_HOST}/v1/products/${ANKI_DECK_FULL_PRODUCT_ID}`,
    { Authorization: `Bearer ${POLAR_PRICE_TOKEN}` },
    "Polar price",
  );
  const cents = product?.prices?.find((p) => p.amount_type === "fixed")?.price_amount;
  return typeof cents === "number" ? cents : undefined;
}

// Pages render on demand: refresh the price hourly instead of once per process.
const getCents = ttl(60 * 60 * 1000, loadPriceCents);

/** Display price, e.g. "5,99 €". */
export const getPolarFullDeckPrice = async (): Promise<string | undefined> => {
  const cents = await getCents();
  return cents === undefined
    ? undefined
    : `${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
};

/** Price as a number in euros, e.g. 5.99 (schema.org / Matomo revenue). */
export const getPolarFullDeckPriceAmount = async (): Promise<number | undefined> => {
  const cents = await getCents();
  return cents === undefined ? undefined : cents / 100;
};
