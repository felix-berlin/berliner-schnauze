/** A row of the former WordPress funding repeater: a platform (link) or a crypto chain (address). */
export interface FundingRow {
  adresse?: string | null;
  link?: string | null;
  name?: string | null;
}

export interface CompanyFunding {
  platforms: { link: string; name: string }[];
  wallets: { address: string; chains: string[] }[];
}

/** Splits the flat WordPress rows into platforms and wallets, one wallet per address with all its chains. */
export const splitFunding = (rows: readonly FundingRow[]): CompanyFunding => {
  const platforms: CompanyFunding["platforms"] = [];
  const wallets = new Map<string, string[]>();
  for (const { adresse, link, name } of rows) {
    if (!name) continue;
    if (link) platforms.push({ link, name });
    if (adresse) wallets.set(adresse, [...(wallets.get(adresse) ?? []), name]);
  }
  return { platforms, wallets: [...wallets].map(([address, chains]) => ({ address, chains })) };
};
