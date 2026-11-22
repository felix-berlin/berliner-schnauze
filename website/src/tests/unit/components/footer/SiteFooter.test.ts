// @vitest-environment node
import SiteFooter from "@components/footer/SiteFooter.astro";
import { JSDOM } from "jsdom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { version } from "../../../../../package.json";
import { createAstroRender } from "../../helpers/astro";

vi.mock("@styles/components/_site-footer.scss", () => ({}));

const { fetchFooterData, fetchSocialMenu } = vi.hoisted(() => ({
  fetchFooterData: vi.fn(),
  fetchSocialMenu: vi.fn(),
}));
vi.mock("@services/payload/footerWords.ts", () => ({ fetchFooterData }));
vi.mock("@services/payload/site.ts", () => ({ fetchSocialMenu }));

const sampleWords = [
  {
    example: "Beispiel",
    kind: "der",
    lemma: "Probewort",
    meaning: "Probebedeutung",
    slug: "probewort",
  },
];

let render: Awaited<ReturnType<typeof createAstroRender>>;
beforeAll(async () => {
  render = await createAstroRender(SiteFooter);
}, 30_000);

beforeEach(() => {
  vi.restoreAllMocks();
  fetchFooterData.mockReset().mockResolvedValue({ wordCount: 1734, words: sampleWords });
  fetchSocialMenu.mockReset().mockResolvedValue([
    { link: "https://git.example/me", rel: "me", title: "GitHub" },
    { link: "https://masto.example/@me", rel: "me", title: "Mastodon" },
    { link: "https://sky.example/me", title: "Bluesky" },
    { link: "https://fb.example/me", title: "Facebook" },
  ]);
});

// Visible text of the rendered HTML (parsed, scripts dropped), text nodes joined by a space.
const textOf = (html: string) => {
  const { document: doc, NodeFilter } = new JSDOM(html).window;
  doc.querySelectorAll("script").forEach((script) => script.remove());
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    parts.push(node.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ");
};

describe("SiteFooter", () => {
  it("links to the internal pages, the support page, settings and the legal pages", async () => {
    const html = await render({ mode: "sign" });
    for (const href of [
      "/wort",
      "/themen",
      "/games/berliner-oder-nicht",
      "/magazin",
      "/wort-vorschlagen",
      "/spenden",
      "/changelog",
      "/impressum",
      "/datenschutz",
      "/settings",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('href="https://github.com/felix-berlin/berliner-schnauze/issues/new"');
    expect(html).toContain('href="https://webshaped.de"');
  });

  it("lists the social profiles as text links that open in a new tab, keeping rel=me", async () => {
    const html = await render({ mode: "sign" });
    for (const name of ["GitHub", "Mastodon", "Bluesky", "Facebook"]) expect(html).toContain(name);
    expect(html).toMatch(/<a[^>]*href="https:\/\/git\.example\/me"[^>]*rel="me noopener"/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/git\.example\/me"[^>]*target="_blank"/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/sky\.example\/me"[^>]*rel="noopener"/);
  });

  it("is one footer landmark with h2 column headings and no h1", async () => {
    const html = await render({ mode: "sign" });
    expect(html.match(/<footer\b/g)).toHaveLength(1);
    expect(html).not.toContain("<h1");
    const headings = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(headings).toEqual([
      "Kiek ooch ma hier",
      "Unterstütz dit Projekt",
      "Über ditt Wörterbuch",
    ]);
    expect(html).toContain('aria-label="Weitere Seiten"');
  });

  it("never speaks as a team, has no emoji and nothing left of the old footer", async () => {
    const text = textOf(await render({ mode: "sign" }));
    expect(text).not.toMatch(/\b(wir|uns|unser\w*)\b/i);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/Carbon|Wakapi|Hergestellt/);
  });

  it("shows the live word count rounded down to hundreds and the current version", async () => {
    const text = textOf(await render({ mode: "sign" }));
    expect(text).toContain("Über 1.700 Berliner Wörter und Redewendungen");
    expect(text).toContain(`Version ${version}`);
  });

  it("asks for the words without the page's own word and shows the word sign", async () => {
    const html = await render({ excludeSlug: "foo", mode: "sign" });
    expect(fetchFooterData).toHaveBeenCalledWith("foo", undefined);
    expect(html).toContain("Probewort");
    expect(html).toContain("Wort für unterwegs");
  });

  it("has no sign when a page callout sits above, and says another goodbye", async () => {
    const text = textOf(await render({ mode: "callout" }));
    expect(text).not.toContain("Wort für unterwegs");
    expect(text).toContain("Schön, dass de da warst. Komm jut nach Hause.");
  });

  it("renders without a sign when there are no words", async () => {
    fetchFooterData.mockResolvedValue({ wordCount: 1734, words: [] });
    const text = textOf(await render({ mode: "sign" }));
    expect(text).not.toContain("Wort für unterwegs");
    expect(text).toContain("Tschüssi, wa!");
  });

  it("asks for no words when a page callout replaces the sign", async () => {
    await render({ mode: "callout" });
    expect(fetchFooterData).toHaveBeenCalledWith(undefined, 0);
  });

  it("does not fail the page when the word list or the social menu cannot be read, and reports the menu", async () => {
    fetchFooterData.mockResolvedValue({ wordCount: 0, words: [] });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("down");
    fetchSocialMenu.mockRejectedValue(failure);
    const html = await render({ mode: "sign" });
    const text = textOf(html);
    expect(text).toContain("Berliner Wörter und Redewendungen");
    expect(text).not.toContain("Über 0");
    const [reported] = logged.mock.calls[0] as [Error];
    expect(reported.message).toBe("[footer] social menu unavailable");
    expect(reported.cause).toBe(failure);
    expect(html).toContain('href="/impressum"');
    expect(html).not.toContain("Folg mir");
  });

  it("adds the app callout island only in app mode", async () => {
    expect(await render({ mode: "app" })).toContain("FooterCalloutApp.vue");
    expect(await render({ mode: "sign" })).not.toContain("FooterCalloutApp.vue");
  });
});
