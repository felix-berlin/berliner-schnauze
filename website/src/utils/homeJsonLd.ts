import type { HomeData } from "@services/payload/home.ts";

import { SITE_URL } from "astro:env/client";
import { htmlToText } from "payload-app/html-text";

/** Meta description of the start page with the live word count (SPEC startseite-v20 §14). */
export const homeDescription = (wordCount: number): string =>
  `Über ${wordCount.toLocaleString("de-DE")} Berliner Wörter mit Bedeutung, Aussprache, Herkunft und Beispielsätzen. Von Atze bis Zicke, jeprüft und jesammelt mit der Community.`;

// Answer html from lexicalToHtml: tags dropped, the entities it escapes decoded.
const plain = (html: string) => htmlToText(html).replace(/\s+/g, " ").trim();

/** JSON-LD of the start page (docs/design/startseite-v20/SPEC.md §14): WebSite + SearchAction, Organization, FAQPage, DefinedTerm. */
export const homeJsonLd = ({ faq, word }: Pick<HomeData, "faq" | "word">): object[] => [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    description: "Berliner Dialekt Wörterbuch - Berlinerisch zu Hochdeutsch",
    inLanguage: "de-DE",
    name: "Berliner Schnauze",
    potentialAction: {
      "@type": "SearchAction",
      "query-input": "required name=search_term_string",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/wort?q={search_term_string}` },
    },
    url: SITE_URL,
  },
  {
    "@context": "https://schema.org",
    "@id": `${SITE_URL}/#organization`,
    "@type": "Organization",
    founder: { "@type": "Person", name: "Felix Scholze", url: "https://webshaped.de/" },
    logo: { "@type": "ImageObject", url: `${SITE_URL}/favicons/favicon.svg` },
    name: "Berliner Schnauze",
    sameAs: [
      "https://mastodon.social/@berliner_schnauze",
      "https://www.facebook.com/Berliner.Schnauze030",
      "https://github.com/felix-berlin/berliner-schnauze",
    ],
    url: SITE_URL,
  },
  ...(faq.length > 0
    ? [
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            acceptedAnswer: { "@type": "Answer", text: plain(f.answerHtml) },
            name: f.question,
          })),
        },
      ]
    : []),
  ...(word
    ? [
        {
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          description: word.meaning,
          inDefinedTermSet: {
            "@id": `${SITE_URL}/wort#termset`,
            "@type": "DefinedTermSet",
            name: "Berliner Schnauze Wörterbuch",
            url: `${SITE_URL}/wort`,
          },
          inLanguage: "de-DE",
          name: word.lemma,
          url: `${SITE_URL}/wort/${word.slug}`,
        },
      ]
    : []),
];
