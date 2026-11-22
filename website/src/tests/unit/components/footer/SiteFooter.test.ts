// @vitest-environment node
import SiteFooter from "@components/footer/SiteFooter.astro";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { version } from "../../../../../package.json";
import { createAstroRender } from "../../helpers/astro";

vi.mock("@styles/components/_site-footer.scss", () => ({}));

const { fetchFooterWords, fetchAllWords, fetchSocialMenu } = vi.hoisted(() => ({
  fetchAllWords: vi.fn(),
  fetchFooterWords: vi.fn(),
  fetchSocialMenu: vi.fn(),
}));
vi.mock("@services/payload/footerWords.ts", () => ({ fetchFooterWords }));
vi.mock("@services/payload/words.ts", () => ({ fetchAllWords }));
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
  fetchFooterWords.mockReset().mockResolvedValue(sampleWords);
  fetchAllWords.mockReset().mockResolvedValue(Array.from({ length: 1734 }, () => ({})));
  fetchSocialMenu.mockReset().mockResolvedValue([
    { link: "https://git.example/me", rel: "me", title: "GitHub" },
    { link: "https://masto.example/@me", rel: "me", title: "Mastodon" },
    { link: "https://sky.example/me", title: "Bluesky" },
    { link: "https://fb.example/me", title: "Facebook" },
  ]);
});

const textOf = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

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
    expect(fetchFooterWords).toHaveBeenCalledWith("foo");
    expect(html).toContain("Probewort");
    expect(html).toContain("Wort für unterwegs");
  });

  it("has no sign when a page callout sits above, and says another goodbye", async () => {
    const text = textOf(await render({ mode: "callout" }));
    expect(text).not.toContain("Wort für unterwegs");
    expect(text).toContain("Schön, dass de da warst. Komm jut nach Hause.");
  });

  it("renders without a sign when there are no words", async () => {
    fetchFooterWords.mockResolvedValue([]);
    const text = textOf(await render({ mode: "sign" }));
    expect(text).not.toContain("Wort für unterwegs");
    expect(text).toContain("Tschüssi, wa!");
  });

  it("does not fail the page when the word count or the social menu cannot be read", async () => {
    fetchAllWords.mockRejectedValue(new Error("down"));
    fetchSocialMenu.mockRejectedValue(new Error("down"));
    const html = await render({ mode: "sign" });
    const text = textOf(html);
    expect(text).toContain("Berliner Wörter und Redewendungen");
    expect(text).not.toContain("Über 0");
    expect(html).toContain('href="/impressum"');
    expect(html).not.toContain("Folg mir");
  });

  it("adds the app callout island only in app mode", async () => {
    expect(await render({ mode: "app" })).toContain("FooterCalloutApp");
    expect(await render({ mode: "sign" })).not.toContain("FooterCalloutApp");
  });
});
