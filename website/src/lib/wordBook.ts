import type { Affiliate } from "payload-app";

export type AffiliateBook = NonNullable<Affiliate["books"]>[number];

export const hostOf = (href?: string | null): string => {
  try {
    return new URL(href ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** CMS data: only http(s) links with a parseable host may become an href (no javascript:/data: URLs). */
export const isWebUrl = (href?: string | null): href is string => {
  try {
    return ["http:", "https:"].includes(new URL(href ?? "").protocol) && hostOf(href) !== "";
  } catch {
    return false;
  }
};

/** By hostname: "amazon." in a path or query must not count. */
export const isAmazonLink = (href?: string | null): boolean =>
  /^(.+\.)?(amazon\.(de|com|co\.uk|fr|it|es|nl|pl|se|com\.be|com\.tr|ae|sa|in|co\.jp|com\.au|ca|com\.br|com\.mx|sg|eg|cn)|amzn\.(to|eu)|a\.co)$/i.test(
    hostOf(href),
  );

export const ctaFor = (href?: string | null): string =>
  isAmazonLink(href) ? "Bei Amazon ansehen" : `Bei ${hostOf(href)} ansehen`;

export const AFFILIATE_REL = "sponsored noopener noreferrer";

const AMAZON_FALLBACK = "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.";

/** The CMS disclaimer of the book's platform (Amazon by name, else by host); the fixed Amazon line only without one. */
export const disclosureFor = (
  href: string,
  disclaimers: readonly { plattform?: string | null; text?: string | null }[],
): string | undefined => {
  const amazon = isAmazonLink(href);
  const host = hostOf(href).toLowerCase();
  const cms = disclaimers.find((d) => {
    const plat = d.plattform?.toLowerCase() ?? "";
    return d.text && (amazon ? plat.includes("amazon") : plat === host);
  })?.text;
  return cms ?? (amazon ? AMAZON_FALLBACK : undefined);
};

export type MoreBook = { title: string; url: string; cover?: string; note?: string };

/** The footer's "Ooch jut" column: up to two other books with a title and a web link (the picked one is left out). */
export const pickMoreBooks = (
  books: readonly AffiliateBook[],
  picked: AffiliateBook | undefined,
  limit = 2,
): MoreBook[] =>
  books
    .flatMap((b): MoreBook[] =>
      b !== picked && b.title && isWebUrl(b.href)
        ? [
            {
              title: b.title,
              url: b.href,
              ...(b.imageUrl && { cover: b.imageUrl }),
              ...(b.description && { note: b.description }),
            },
          ]
        : [],
    )
    .slice(0, limit);

/** The first book listed for the word's first Thema (`themen` hold ids or populated Themen); undefined without one. */
export const pickBook = (
  books: readonly AffiliateBook[],
  firstThemaId: number | undefined,
): AffiliateBook | undefined =>
  firstThemaId === undefined
    ? undefined
    : books.find(
        (b) =>
          isWebUrl(b.href) &&
          b.themen?.some((t) => (typeof t === "object" ? t.id : t) === firstThemaId),
      );
