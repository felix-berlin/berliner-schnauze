import { describe, expect, it } from "vitest";

import { diffSeo, extractSeo, normalizeForMigration } from "../../../../scripts/lib/seo-extract.ts";

const page = (head: string, lang = "de") =>
  `<!doctype html><html lang="${lang}"><head>${head}</head><body><h1>x</h1></body></html>`;
const base = `<title>aasen auf Berlinerisch</title>
<meta name="description" content="Beschreibung">
<link rel="canonical" href="https://berliner-schnauze.wtf/wort/aasen">
<meta name="robots" content="noai, noimageai">
<meta property="og:title" content="OG Titel">
<meta property="og:image" content="https://berliner-schnauze.wtf/og/aasen.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@type":"DefinedTerm","name":"aasen","inDefinedTermSet":{"@id":"x"}}</script>`;

describe("extractSeo", () => {
  it("collects title, description, canonical, robots, og, twitter, json-ld and the language", () => {
    expect(extractSeo(page(base))).toEqual({
      canonical: "https://berliner-schnauze.wtf/wort/aasen",
      description: "Beschreibung",
      jsonLd: [{ "@type": "DefinedTerm", inDefinedTermSet: { "@id": "x" }, name: "aasen" }],
      lang: "de",
      meta: {
        "og:image": "https://berliner-schnauze.wtf/og/aasen.png",
        "og:title": "OG Titel",
        "twitter:card": "summary_large_image",
      },
      robots: "noai, noimageai",
      title: "aasen auf Berlinerisch",
    });
  });

  it("uses null for what is missing", () => {
    expect(extractSeo(page("<title>t</title>"))).toMatchObject({
      canonical: null,
      description: null,
      jsonLd: [],
      robots: null,
    });
  });

  it("keeps an unparsable json-ld block as raw text instead of failing", () => {
    expect(
      extractSeo(page(`${base}<script type="application/ld+json">{oops</script>`)).jsonLd,
    ).toContain("{oops");
  });
});

describe("diffSeo", () => {
  it("is empty for equal snapshots", () => {
    expect(diffSeo(extractSeo(page(base)), extractSeo(page(base)))).toEqual([]);
  });

  it("reports exactly the key that differs", () => {
    const changed = base.replace("OG Titel", "Anderer Titel");
    expect(diffSeo(extractSeo(page(base)), extractSeo(page(changed)))).toEqual([
      { a: "OG Titel", b: "Anderer Titel", key: "meta[og:title]" },
    ]);
  });

  it("treats json-ld with reordered keys as equal", () => {
    const reordered = base.replace(
      '{"@type":"DefinedTerm","name":"aasen","inDefinedTermSet":{"@id":"x"}}',
      '{"inDefinedTermSet":{"@id":"x"},"name":"aasen","@type":"DefinedTerm"}',
    );
    expect(diffSeo(extractSeo(page(base)), extractSeo(page(reordered)))).toEqual([]);
  });

  it("reports a json-ld difference and a missing tag", () => {
    const other = base
      .replace('"name":"aasen"', '"name":"aasn"')
      .replace(
        '<meta property="og:image" content="https://berliner-schnauze.wtf/og/aasen.png">',
        "",
      );
    const keys = diffSeo(extractSeo(page(base)), extractSeo(page(other))).map((d) => d.key);
    expect(keys).toEqual(expect.arrayContaining(["jsonLd", "meta[og:image]"]));
  });

  it("ignores an allowed key such as the media url host of og:image", () => {
    const other = base.replace(
      "https://berliner-schnauze.wtf/og/aasen.png",
      "https://cms.example/api/media/file/x.png",
    );
    expect(
      diffSeo(extractSeo(page(base)), extractSeo(page(other)), { ignore: ["meta[og:image]"] }),
    ).toEqual([]);
  });
});

describe("normalizeForMigration", () => {
  const withLd = (ld: unknown) =>
    extractSeo(
      page(`<title>t</title><script type="application/ld+json">${JSON.stringify(ld)}</script>`),
    );

  it("maps old WordPress media urls to their Payload urls in meta tags and json-ld", () => {
    const old = extractSeo(
      page('<meta property="og:image" content="https://cms.x/wp-content/uploads/a.jpg">'),
    );
    expect(normalizeForMigration(old).meta["og:image"]).toBe("https://cms.x/api/media/file/a.jpg");
    const ld = normalizeForMigration(
      withLd({ image: { url: "https://cms.x/wp-content/uploads/a.jpg" } }),
    );
    expect(ld.jsonLd).toEqual([{ image: { url: "https://cms.x/api/media/file/a.jpg" } }]);
  });

  it("compares an Imagor image by its source, not by its signature", () => {
    const signed = (sig: string, src: string) =>
      extractSeo(
        page(
          `<meta property="og:image" content="https://assets.example/${sig}/fit-in/900x517/filters:format(png)/${src}">`,
        ),
      );
    const a = normalizeForMigration(
      signed("AAAA", "https%3A%2F%2Fcms.x%2Fwp-content%2Fuploads%2Fbear.png"),
    );
    const b = normalizeForMigration(
      signed("BBBB", "https%3A%2F%2Fcms.x%2Fapi%2Fmedia%2Ffile%2Fbear.png"),
    );
    expect(diffSeo(a, b)).toEqual([]);
    const other = normalizeForMigration(
      signed("BBBB", "https%3A%2F%2Fcms.x%2Fapi%2Fmedia%2Ffile%2Fother.png"),
    );
    expect(diffSeo(a, other).map((d) => d.key)).toEqual(["meta[og:image]"]);
  });

  it("drops the image dimensions: WordPress reported the original size of a scaled upload", () => {
    expect(
      normalizeForMigration(withLd({ image: { height: 2988, url: "u", width: 5312 } })).jsonLd,
    ).toEqual([{ image: { url: "u" } }]);
  });

  it("compares image captions as text, not as the html WordPress rendered", () => {
    expect(
      normalizeForMigration(withLd({ image: { caption: "<p>Ein Bild</p>\n" } })).jsonLd,
    ).toEqual([{ image: { caption: "Ein Bild" } }]);
  });

  it("ignores the order of an ItemList (words with equal titles may be sorted differently)", () => {
    const list = (...urls: string[]) =>
      withLd({
        "@type": "ItemList",
        itemListElement: urls.map((url, i) => ({ position: i + 1, url })),
      });
    const a = normalizeForMigration(list("/x", "/y"));
    const b = normalizeForMigration(list("/y", "/x"));
    expect(diffSeo(a, b)).toEqual([]);
  });
});
