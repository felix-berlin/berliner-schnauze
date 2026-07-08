import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ WP_API: "http://test.local/graphql" }));
vi.mock("astro:env/server", () => ({ WP_AUTH_PASS: "test", WP_AUTH_USER: "test" }));

const toPromiseMock = vi.fn();
const queryMock = vi.fn(() => ({ toPromise: toPromiseMock }));

vi.mock("@urql/core", () => ({
  cacheExchange: {},
  Client: vi.fn().mockImplementation(function (this: { query: typeof queryMock }) {
    this.query = queryMock;
  }),
  fetchExchange: {},
}));

const EVM_ADDRESS = "0x4A21A332cAc9809dBCAdcD4CeDD43fdF32661eeE";
const BITCOIN_ADDRESS = "bc1qdp6ucj4pcp7w94y4nevktzazpul53pr2jxt040";
const SOLANA_ADDRESS = "HUj6hkvdb9kHhRGwLQfT4K6q1RBeXsR7xxCNekT9ZjrA";
const TRON_ADDRESS = "TRwwuT7924VxDNzDcVj7TRz9kpgtyAb2C3";

const EVM_CHAINS = ["Ethereum", "Linea", "Base", "BNB Chain", "Sei", "Polygon", "OP", "Arbitrum"];

const fundingFixture = [
  { adresse: null, link: "https://github.com/sponsors/felixhaeberle", name: "GitHub Sponsors" },
  { adresse: null, link: "https://ko-fi.com/felixscholze", name: "Ko-fi" },
  { adresse: null, link: "https://paypal.me/felixscholze", name: "PayPal" },
  { adresse: null, link: "https://buymeacoffee.com/felixscholze", name: "Buy me a coffee" },
  ...EVM_CHAINS.map((name) => ({ adresse: EVM_ADDRESS, link: null, name })),
  { adresse: BITCOIN_ADDRESS, link: null, name: "Bitcoin" },
  { adresse: SOLANA_ADDRESS, link: null, name: "Solana" },
  { adresse: TRON_ADDRESS, link: null, name: "Tron" },
];

const successResponse = (funding: unknown) => ({
  data: { company: { companyInformations: { funding } } },
  error: undefined,
});

beforeEach(() => {
  vi.resetModules();
  toPromiseMock.mockReset();
  queryMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchFundingData", () => {
  it("maps link entries to 4 platforms with correct names and links", async () => {
    toPromiseMock.mockResolvedValue(successResponse(fundingFixture));
    const { fetchFundingData } = await import("@services/queries/getCompanyFunding");

    const { platforms } = await fetchFundingData();

    expect(platforms).toHaveLength(4);
    expect(platforms).toEqual([
      { link: "https://github.com/sponsors/felixhaeberle", name: "GitHub Sponsors" },
      { link: "https://ko-fi.com/felixscholze", name: "Ko-fi" },
      { link: "https://paypal.me/felixscholze", name: "PayPal" },
      { link: "https://buymeacoffee.com/felixscholze", name: "Buy me a coffee" },
    ]);
  });

  it("groups wallets by identical address into 4 wallets", async () => {
    toPromiseMock.mockResolvedValue(successResponse(fundingFixture));
    const { fetchFundingData } = await import("@services/queries/getCompanyFunding");

    const { wallets } = await fetchFundingData();

    expect(wallets).toHaveLength(4);
  });

  it("collects all 8 EVM chains on the shared address in CMS order", async () => {
    toPromiseMock.mockResolvedValue(successResponse(fundingFixture));
    const { fetchFundingData } = await import("@services/queries/getCompanyFunding");

    const { wallets } = await fetchFundingData();
    const evmWallet = wallets.find((wallet) => wallet.address === EVM_ADDRESS);

    expect(evmWallet?.chains).toHaveLength(8);
    expect(evmWallet?.chains).toEqual(EVM_CHAINS);
  });

  it("preserves wallet order: EVM, Bitcoin, Solana, Tron", async () => {
    toPromiseMock.mockResolvedValue(successResponse(fundingFixture));
    const { fetchFundingData } = await import("@services/queries/getCompanyFunding");

    const { wallets } = await fetchFundingData();

    expect(wallets.map((wallet) => wallet.address)).toEqual([
      EVM_ADDRESS,
      BITCOIN_ADDRESS,
      SOLANA_ADDRESS,
      TRON_ADDRESS,
    ]);
  });

  it("filters out null entries and entries without a name", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([
        null,
        { adresse: EVM_ADDRESS, link: null, name: null },
        { adresse: null, link: "https://ko-fi.com/felixscholze", name: null },
        { adresse: BITCOIN_ADDRESS, link: null, name: "Bitcoin" },
      ]),
    );
    const { fetchFundingData } = await import("@services/queries/getCompanyFunding");

    const { platforms, wallets } = await fetchFundingData();

    expect(platforms).toEqual([]);
    expect(wallets).toEqual([{ address: BITCOIN_ADDRESS, chains: ["Bitcoin"] }]);
  });

  it("returns empty arrays when funding is missing", async () => {
    toPromiseMock.mockResolvedValue({
      data: { company: { companyInformations: { funding: null } } },
      error: undefined,
    });
    const { fetchFundingData } = await import("@services/queries/getCompanyFunding");

    expect(await fetchFundingData()).toEqual({ platforms: [], wallets: [] });
  });

  it("returns empty arrays and logs on GraphQL error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const gqlError = new Error("GraphQL boom");
    toPromiseMock.mockResolvedValue({ data: undefined, error: gqlError });
    const { fetchFundingData } = await import("@services/queries/getCompanyFunding");

    const result = await fetchFundingData();

    expect(result).toEqual({ platforms: [], wallets: [] });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching funding data:", gqlError);
  });
});
