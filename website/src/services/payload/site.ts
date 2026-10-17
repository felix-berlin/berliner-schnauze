import type { Affiliate, Config } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { lexicalToHtml } from "payload-app/lexical-html";


const global = <S extends keyof Config["globals"]>(slug: S) =>
  ttl(60_000, async () => (await getPayloadClient()).findGlobal({ depth: 0, slug }));

const navigation = global("navigation");
const affiliate = global("affiliate");
const company = global("company");
const home = global("home");
const anki = global("anki");

export interface MenuItem {
  description?: string;
  link: string;
  rel?: string;
  title: string;
}

export const fetchMenu = async (menu: "main" | "footer1" | "footer2"): Promise<MenuItem[]> =>
  ((await navigation())[menu] ?? []).flatMap((row) =>
    row.title && row.link
      ? [
          {
            link: row.link,
            title: row.title,
            ...(row.rel ? { rel: row.rel } : {}),
            ...(row.description ? { description: row.description } : {}),
          },
        ]
      : [],
  );

export interface AffiliateData {
  books: NonNullable<Affiliate["books"]>;
  disclaimers: NonNullable<Affiliate["disclaimers"]>;
}

export const fetchAffiliateData = async (): Promise<AffiliateData> => {
  const data = await affiliate();
  return { books: data.books ?? [], disclaimers: data.disclaimers ?? [] };
};

export interface FundingPlatform {
  link: string;
  name: string;
}

export interface FundingWallet {
  address: string;
  chains: string[];
}

export interface FundingData {
  /** Short promises atop /spenden ("Keene Werbung", ...). */
  highlights: string[];
  platforms: FundingPlatform[];
  wallets: FundingWallet[];
}

export const fetchFundingData = async (): Promise<FundingData> => {
  const { donationHighlights, platforms, wallets } = await company();
  return {
    highlights: donationHighlights ?? [],
    platforms: (platforms ?? []).map(({ link, name }) => ({ link, name })),
    wallets: (wallets ?? []).map(({ address, chains }) => ({ address, chains: chains ?? [] })),
  };
};

export interface SocialMenuItem {
  link: string;
  rel?: string;
  title: string;
}

export const fetchSocialMenu = async (): Promise<SocialMenuItem[]> =>
  ((await company()).socialMedia ?? []).map(({ label, profile, relMe }) => ({
    link: profile,
    title: label,
    ...(relMe ? { rel: "me" } : {}),
  }));

export interface Fact {
  headline: string;
  /** The rich text as html, a single paragraph without its <p> (the card wraps it). */
  html: string;
}

/** Unwraps a single paragraph; several stay as they are (the card's <p> then holds block html). */
const inlineHtml = (html: string): string =>
  html.startsWith("<p>") && html.endsWith("</p>") && !html.includes("<p", 1) ? html.slice(3, -4) : html;

export const fetchHomeFacts = async (): Promise<Fact[]> =>
  ((await home()).facts ?? []).map(({ headline, text }) => ({ headline, html: inlineHtml(lexicalToHtml(text)) }));

export interface AnkiContent {
  faqs: { a: string; q: string }[];
  fullFeatures: string[];
  liteFeatures: string[];
  steps: { num: string; text: string; title: string }[];
}

/** The texts of /anki; `{liteWords}` and `{totalWords}` in the features become the given counts. */
export const fetchAnkiContent = async (counts: { liteWords: string; totalWords: string }): Promise<AnkiContent> => {
  const { faqs, fullFeatures, liteFeatures, steps } = await anki();
  const fill = (rows: { text: string }[] | null | undefined) =>
    (rows ?? []).map(({ text }) =>
      text.replaceAll("{liteWords}", counts.liteWords).replaceAll("{totalWords}", counts.totalWords),
    );
  return {
    faqs: (faqs ?? []).map(({ answer, question }) => ({ a: answer, q: question })),
    fullFeatures: fill(fullFeatures),
    liteFeatures: fill(liteFeatures),
    steps: (steps ?? []).map(({ text, title }, i) => ({ num: String(i + 1).padStart(2, "0"), text, title })),
  };
};
