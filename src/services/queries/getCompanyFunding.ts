import { graphql } from "@/gql";
import { CompanyFundingDocument } from "@/gql/graphql.ts";
import { wpGraphqlClient } from "@services/wpGraphqlClient";

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
  const response = await wpGraphqlClient.query(CompanyFundingDocument, {}).toPromise();

  if (response.error) {
    throw new Error("Fetching company funding data failed", { cause: response.error });
  }

  const entries = response.data?.company?.companyInformations?.funding ?? [];

  const platforms: FundingPlatform[] = [];
  const wallets: FundingWallet[] = [];
  const walletsByAddress = new Map<string, FundingWallet>();

  for (const entry of entries) {
    if (!entry?.name) continue;

    if (entry.link) {
      platforms.push({ link: entry.link, name: entry.name });
    }

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

export const CompanyFunding = graphql(`
  query CompanyFunding {
    company {
      companyInformations {
        funding {
          adresse
          link
          name
        }
      }
    }
  }
`);
