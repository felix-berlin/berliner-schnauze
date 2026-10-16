import type { Company } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";

import type { AffiliateBook, AffiliateDisclaimer } from "@/types/cms.ts";

const TTL = 60_000;

const global = <T>(slug: string) =>
  ttl(
    TTL,
    async () => (await getPayloadClient()).findGlobal({ depth: 0, slug } as never) as Promise<T>,
  );

type Row = Record<string, string | null | undefined>;
type Navigation = Record<"main" | "footer1" | "footer2", Row[] | null | undefined>;
type AffiliateGlobal = {
  books?: AffiliateBook[] | null;
  disclaimers?: AffiliateDisclaimer[] | null;
};

const navigation = global<Navigation>("navigation");
const affiliate = global<AffiliateGlobal>("affiliate");
const company = global<Company>("company");

export interface MenuItem {
  description?: string;
  link: string;
  rel?: string;
  title: string;
}

// WordPress menu names the pages still ask for.
const MENUS: Record<string, keyof Navigation> = {
  "Footer Nav 1": "footer1",
  "Footer Nav 2": "footer2",
  "Main Menu": "main",
};

export const fetchMenu = async (name: string): Promise<MenuItem[]> => {
  const key = MENUS[name];
  if (!key) return [];
  return ((await navigation())[key] ?? []).flatMap((row) =>
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
};

export interface AffiliateData {
  books: AffiliateBook[];
  disclaimers: AffiliateDisclaimer[];
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
  const platforms: FundingPlatform[] = [];
  const wallets: FundingWallet[] = [];
  const walletsByAddress = new Map<string, FundingWallet>();

  for (const entry of (await company()).funding ?? []) {
    if (!entry.name) continue;
    if (entry.link) platforms.push({ link: entry.link, name: entry.name });
    if (entry.adresse) {
      const existing = walletsByAddress.get(entry.adresse);
      if (existing) {
        existing.chains.push(entry.name);
      } else {
        const wallet: FundingWallet = { address: entry.adresse, chains: [entry.name] };
        walletsByAddress.set(entry.adresse, wallet);
        wallets.push(wallet);
      }
    }
  }
  return { platforms, wallets };
};

export interface SocialMenuItem {
  link: string;
  rel?: string;
  title: string;
}

export const fetchSocialMenu = async (): Promise<SocialMenuItem[]> =>
  ((await company()).socialMedia ?? []).flatMap((entry) => {
    const title =
      entry.label ||
      (entry.network ? entry.network.charAt(0).toUpperCase() + entry.network.slice(1) : null);
    if (!entry.profile || !title) return [];
    return [{ link: entry.profile, title, ...(entry.rel ? { rel: entry.rel } : {}) }];
  });
