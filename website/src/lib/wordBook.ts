import type { Affiliate } from "payload-app";

export type AffiliateBook = NonNullable<Affiliate["books"]>[number];

/** The first book listed for the word's first Thema (`themen` hold ids or populated Themen); undefined without one. */
export const pickBook = (
  books: readonly AffiliateBook[],
  firstThemaId: number | undefined,
): AffiliateBook | undefined =>
  firstThemaId === undefined
    ? undefined
    : books.find((b) => b.themen?.some((t) => (typeof t === "object" ? t.id : t) === firstThemaId));
