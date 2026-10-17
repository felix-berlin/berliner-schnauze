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
      "main",
      [
        { description: "Alle Wörter", link: "/wort", rel: "noopener", title: "Wörterbuch" },
        { link: "/magazin", title: "Magazin" },
      ],
    ],
    ["footer1", [{ link: "/impressum", title: "Impressum" }]],
    ["footer2", []],
  ])("maps the %s menu of the navigation global", async (name, expected) => {
    findGlobal.mockResolvedValue(nav);
    const { fetchMenu } = await load();
    expect(await fetchMenu(name as "main")).toEqual(expected);
  });

  it("reads the global once and rejects without caching when the database fails", async () => {
    findGlobal.mockRejectedValueOnce(new Error("db down")).mockResolvedValue(nav);
    const { fetchMenu } = await load();
    await expect(fetchMenu("main")).rejects.toThrow("db down");
    await fetchMenu("main");
    await fetchMenu("footer1");
    expect(findGlobal).toHaveBeenCalledTimes(2);
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: "navigation" }));
  });
});

describe("fetchFundingData", () => {
  it("passes platforms and wallets through without the row ids", async () => {
    findGlobal.mockResolvedValue({
      donationHighlights: ["Keene Werbung"],
      platforms: [{ id: "a", link: "https://ko-fi.com/x", name: "Ko-fi" }],
      wallets: [{ address: "0xA", chains: ["Ethereum", "Base"], id: "b" }],
    });
    const { fetchFundingData } = await load();
    expect(await fetchFundingData()).toEqual({
      highlights: ["Keene Werbung"],
      platforms: [{ link: "https://ko-fi.com/x", name: "Ko-fi" }],
      wallets: [{ address: "0xA", chains: ["Ethereum", "Base"] }],
    });
  });

  it("returns empty arrays when the global is empty", async () => {
    findGlobal.mockResolvedValue({ platforms: null, wallets: null });
    const { fetchFundingData } = await load();
    expect(await fetchFundingData()).toEqual({ highlights: [], platforms: [], wallets: [] });
  });
});

describe("fetchSocialMenu", () => {
  it("maps rows to link/title and sets rel=me only where checked", async () => {
    findGlobal.mockResolvedValue({
      socialMedia: [
        { label: "Mastodon", profile: "https://m.social/@x", relMe: true },
        { label: "GitHub", profile: "https://github.com/x", relMe: false },
      ],
    });
    const { fetchSocialMenu } = await load();
    expect(await fetchSocialMenu()).toEqual([
      { link: "https://m.social/@x", rel: "me", title: "Mastodon" },
      { link: "https://github.com/x", title: "GitHub" },
    ]);
  });
});

describe("fetchHomeFacts", () => {
  const richText = (...paragraphs: string[]) => ({
    root: {
      children: paragraphs.map((text) => ({
        children: [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      })),
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

  it("renders a single paragraph without its <p> (the card wraps it), several as they are", async () => {
    findGlobal.mockResolvedValue({
      facts: [
        { headline: "Kurz", text: richText("ma statt mal") },
        { headline: "Lang", text: richText("eins", "zwei") },
      ],
    });
    const { fetchHomeFacts } = await load();
    expect(await fetchHomeFacts()).toEqual([
      { headline: "Kurz", html: "ma statt mal" },
      { headline: "Lang", html: "<p>eins</p><p>zwei</p>" },
    ]);
  });
});

describe("fetchAnkiContent", () => {
  it("numbers the steps, fills the word counts and maps the faqs", async () => {
    findGlobal.mockResolvedValue({
      faqs: [{ answer: "Ja.", question: "Brauch ich Anki?" }],
      fullFeatures: [{ text: "Alle {totalWords} Wörter" }],
      liteFeatures: [{ text: "{liteWords} Wörter" }],
      steps: [
        { text: "Wort sehen", title: "Karte" },
        { text: "Umdrehen", title: "Aufdecken" },
      ],
    });
    const { fetchAnkiContent } = await load();
    expect(await fetchAnkiContent({ liteWords: "600", totalWords: "5.934" })).toEqual({
      faqs: [{ a: "Ja.", q: "Brauch ich Anki?" }],
      fullFeatures: ["Alle 5.934 Wörter"],
      liteFeatures: ["600 Wörter"],
      steps: [
        { num: "01", text: "Wort sehen", title: "Karte" },
        { num: "02", text: "Umdrehen", title: "Aufdecken" },
      ],
    });
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
