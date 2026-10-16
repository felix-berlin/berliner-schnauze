import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPayload, findGlobal } = vi.hoisted(() => ({ getPayload: vi.fn(), findGlobal: vi.fn() }));
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
    main: [
      { title: "Wörterbuch", link: "/wort", rel: "noopener", description: "Alle Wörter" },
      { title: "Magazin", link: "/magazin", rel: null, description: null },
      { title: "", link: "/leer" },
      { title: "Ohne Link", link: "" },
    ],
    footer1: [{ title: "Impressum", link: "/impressum" }],
    footer2: null,
  };

  it.each([
    ["Main Menu", [{ title: "Wörterbuch", link: "/wort", rel: "noopener", description: "Alle Wörter" }, { title: "Magazin", link: "/magazin" }]],
    ["Footer Nav 1", [{ title: "Impressum", link: "/impressum" }]],
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
    { name: "GitHub Sponsors", link: "https://github.com/sponsors/x", adresse: null },
    { name: "Ko-fi", link: "https://ko-fi.com/x", adresse: "" },
    ...EVM_CHAINS.map((name) => ({ name, link: null, adresse: EVM })),
    { name: "Bitcoin", link: null, adresse: BTC },
    { name: "", link: "https://skipped.example", adresse: null },
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
        { network: "mastodon", label: "Mastodon", profile: "https://social.example/@bs", rel: "me" },
        { network: "bluesky", label: null, profile: "https://bsky.example/bs", rel: null },
        { network: "x", label: "X", profile: "", rel: null },
        { network: null, label: null, profile: "https://nameless.example", rel: null },
      ],
    });
    const { fetchSocialMenu } = await load();
    expect(await fetchSocialMenu()).toEqual([
      { link: "https://social.example/@bs", title: "Mastodon", rel: "me" },
      { link: "https://bsky.example/bs", title: "Bluesky" },
    ]);
  });
});

describe("fetchAffiliateData", () => {
  it("returns books and disclaimers", async () => {
    findGlobal.mockResolvedValue({
      books: [{ title: "Buch", description: "d", href: "https://x.example/b", imageUrl: "https://x.example/b.jpg", imageAlt: "Cover", badge: "Tipp", badgeModifier: "orange" }],
      disclaimers: [{ plattform: "Amazon", text: "Affiliate" }],
    });
    const { fetchAffiliateData } = await load();
    const data = await fetchAffiliateData();
    expect(data.books).toHaveLength(1);
    expect(data.books[0]).toMatchObject({ title: "Buch", badgeModifier: "orange" });
    expect(data.disclaimers).toEqual([{ plattform: "Amazon", text: "Affiliate" }]);
  });

  it("falls back to empty lists", async () => {
    findGlobal.mockResolvedValue({});
    const { fetchAffiliateData } = await load();
    expect(await fetchAffiliateData()).toEqual({ books: [], disclaimers: [] });
  });
});
