import type { Affiliate, Config } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";


const global = <S extends keyof Config["globals"]>(slug: S) =>
  ttl(60_000, async () => (await getPayloadClient()).findGlobal({ depth: 0, slug }));

const navigation = global("navigation");
const affiliate = global("affiliate");
const company = global("company");

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
  platforms: FundingPlatform[];
  wallets: FundingWallet[];
}

export const fetchFundingData = async (): Promise<FundingData> => {
  const { platforms, wallets } = await company();
  return {
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
