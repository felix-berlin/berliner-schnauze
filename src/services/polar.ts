import { fetchJson } from "@services/fetchJson.ts";
import { ANKI_DECK_FULL_PRODUCT_ID, POLAR_PRICE_TOKEN, POLAR_SANDBOX } from "astro:env/server";

const API_HOST = POLAR_SANDBOX ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";

interface PolarProduct {
  prices?: { amount_type: string; price_amount?: number }[];
}

async function loadPrice(): Promise<string | undefined> {
  if (!POLAR_PRICE_TOKEN || !ANKI_DECK_FULL_PRODUCT_ID) return undefined;

  const product = await fetchJson<PolarProduct>(
    `${API_HOST}/v1/products/${ANKI_DECK_FULL_PRODUCT_ID}`,
    { Authorization: `Bearer ${POLAR_PRICE_TOKEN}` },
    "Polar price",
  );
  const cents = product?.prices?.find((p) => p.amount_type === "fixed")?.price_amount;
  if (typeof cents !== "number") return undefined;

  return `${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
}

// Resolve once per process — the price doesn't change within a build/server lifetime.
let pricePromise: Promise<string | undefined> | undefined;
export const getPolarFullDeckPrice = (): Promise<string | undefined> =>
  (pricePromise ??= loadPrice());
