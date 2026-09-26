import { ANKI_DECK_FULL_PRODUCT_ID, POLAR_ORG_TOKEN, POLAR_SANDBOX } from "astro:env/server";

const FETCH_TIMEOUT_MS = 5000;
const API_HOST = POLAR_SANDBOX ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";

interface PolarProduct {
  prices?: { amount_type: string; price_amount?: number }[];
}

async function loadPrice(): Promise<string | undefined> {
  if (!POLAR_ORG_TOKEN || !ANKI_DECK_FULL_PRODUCT_ID) return undefined;

  try {
    const res = await fetch(`${API_HOST}/v1/products/${ANKI_DECK_FULL_PRODUCT_ID}`, {
      headers: { Authorization: `Bearer ${POLAR_ORG_TOKEN}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.log(`Polar price request failed with status ${res.status}.`);
      return undefined;
    }

    const product = (await res.json()) as PolarProduct;
    const cents = product.prices?.find((p) => p.amount_type === "fixed")?.price_amount;
    if (typeof cents !== "number") return undefined;

    return `${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
  } catch {
    console.log("Polar price could not be fetched.");
    return undefined;
  }
}

// Resolve once per process — the price doesn't change within a build/server lifetime.
let pricePromise: Promise<string | undefined> | undefined;
export const getPolarFullDeckPrice = (): Promise<string | undefined> => (pricePromise ??= loadPrice());
