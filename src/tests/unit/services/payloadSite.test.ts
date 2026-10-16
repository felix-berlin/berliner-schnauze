import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPayload, findGlobal } = vi.hoisted(() => ({ findGlobal: vi.fn(), getPayload: vi.fn() }));
vi.mock("payload-app", () => ({ config: Promise.resolve({}), getPayload }));
vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example" }));

const EVM = "0x4A21A332cAc9809dBCAdcD4CeDD43fdF32661eeE";
const BTC = "bc1qdp6ucj4pcp7w94y4nevktzazpul53pr2jxt040";
const EVM_CHAINS = ["Ethereum", "Linea", "Base", "BNB Chain", "Sei", "Polygon", "OP", "Arbitrum"];

beforeEach(() => {
  vi.resetModules();
  findGlobal.mockReset();
  getPayload.mockReset().mockResolvedValue({ findGlobal });
});

const load = () => import("@services/payload/site.ts");

describe("fetchMenu", () => {
  const nav = {
    footer1: [{ link: "/impressum", title: "Impressum" }],
    footer2: null,
    main: [
      { description: "Alle Wörter", link: "/wort", rel: "noopener", title: "Wörterbuch" },
      { description: null, link: "/magazin", rel: null, title: "Magazin" },
      { link: "/leer", title: "" },
      { link: "", title: "Ohne Link" },
    ],
  };

  it.each([
    [
      "Main Menu",
      [
        { description: "Alle Wörter", link: "/wort", rel: "noopener", title: "Wörterbuch" },
        { link: "/magazin", title: "Magazin" },
      ],
    ],
    ["Footer Nav 1", [{ link: "/impressum", title: "Impressum" }]],
    ["Footer Nav 2", []],
    ["Unknown", []],
  ])("maps the WordPress menu name %s onto the navigation global", async (name, expected) => {
    findGlobal.mockResolvedValue(nav);
    const { fetchMenu } = await load();
    expect(await fetchMenu(name)).toEqual(expected);
  });

  it("reads the global once and rejects without caching when the database fails", async () => {
    findGlobal.mockRejectedValueOnce(new Error("db down")).mockResolvedValue(nav);
    const { fetchMenu } = await load();
    await expect(fetchMenu("Main Menu")).rejects.toThrow("db down");
    await fetchMenu("Main Menu");
    await fetchMenu("Footer Nav 1");
    expect(findGlobal).toHaveBeenCalledTimes(2);
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: "navigation" }));
  });
});

describe("fetchFundingData", () => {
  const funding = [
    { adresse: null, link: "https://github.com/sponsors/x", name: "GitHub Sponsors" },
    { adresse: "", link: "https://ko-fi.com/x", name: "Ko-fi" },
    ...EVM_CHAINS.map((name) => ({ adresse: EVM, link: null, name })),
    { adresse: BTC, link: null, name: "Bitcoin" },
    { adresse: null, link: "https://skipped.example", name: "" },
  ];

  it("splits link rows into platforms and groups wallets by identical address in CMS order", async () => {
    findGlobal.mockResolvedValue({ funding });
    const { fetchFundingData } = await load();
    const { platforms, wallets } = await fetchFundingData();
    expect(platforms).toEqual([
      { link: "https://github.com/sponsors/x", name: "GitHub Sponsors" },
      { link: "https://ko-fi.com/x", name: "Ko-fi" },
    ]);
    expect(wallets).toEqual([
      { address: EVM, chains: EVM_CHAINS },
      { address: BTC, chains: ["Bitcoin"] },
    ]);
  });

  it("returns empty arrays when funding is missing", async () => {
    findGlobal.mockResolvedValue({ funding: null });
    const { fetchFundingData } = await load();
    expect(await fetchFundingData()).toEqual({ platforms: [], wallets: [] });
  });
});

describe("fetchSocialMenu", () => {
  it("maps rows to link/title/rel, falls back to the capitalized network and drops incomplete rows", async () => {
    findGlobal.mockResolvedValue({
      socialMedia: [
        {
          label: "Mastodon",
          network: "mastodon",
          profile: "https://social.example/@bs",
          rel: "me",
        },
        { label: null, network: "bluesky", profile: "https://bsky.example/bs", rel: null },
        { label: "X", network: "x", profile: "", rel: null },
        { label: null, network: null, profile: "https://nameless.example", rel: null },
      ],
    });
    const { fetchSocialMenu } = await load();
    expect(await fetchSocialMenu()).toEqual([
      { link: "https://social.example/@bs", rel: "me", title: "Mastodon" },
      { link: "https://bsky.example/bs", title: "Bluesky" },
    ]);
  });
});

describe("fetchAffiliateData", () => {
  it("returns books and disclaimers", async () => {
    findGlobal.mockResolvedValue({
      books: [
        {
          badge: "Tipp",
          badgeModifier: "orange",
          description: "d",
          href: "https://x.example/b",
          imageAlt: "Cover",
          imageUrl: "https://x.example/b.jpg",
          title: "Buch",
        },
      ],
      disclaimers: [{ plattform: "Amazon", text: "Affiliate" }],
    });
    const { fetchAffiliateData } = await load();
    const data = await fetchAffiliateData();
    expect(data.books).toHaveLength(1);
    expect(data.books[0]).toMatchObject({ badgeModifier: "orange", title: "Buch" });
    expect(data.disclaimers).toEqual([{ plattform: "Amazon", text: "Affiliate" }]);
  });

  it("falls back to empty lists", async () => {
    findGlobal.mockResolvedValue({});
    const { fetchAffiliateData } = await load();
    expect(await fetchAffiliateData()).toEqual({ books: [], disclaimers: [] });
  });
});
