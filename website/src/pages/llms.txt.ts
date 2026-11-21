import type { APIRoute } from "astro";

import { fetchHome } from "@services/payload/home.ts";
import { fetchAllPosts } from "@services/payload/posts.ts";
import { fetchAllThemen } from "@services/payload/themen.ts";
import { fetchAllWords } from "@services/payload/words.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { withCount } from "@utils/homeIntro.ts";
import { reportAndFallback } from "@utils/reportError.ts";
import { docPath } from "payload-app/routes";

const oneLine = (text: string | null | undefined): string =>
  (text ?? "").replace(/\s+/g, " ").trim();

/** CMS html (p, h3, inline tags) as Markdown text: h3 become ###, links and emphasis drop to their text. */
const toMarkdown = (html: string): string =>
  html
    .replace(/<h3[^>]*>/g, "\n\n### ")
    .replace(/<\/(p|h3|li)>|<br\s*\/?>/g, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

/** llmstxt.org index of the site, built from the CMS so counts and lists never go stale. */
export const GET: APIRoute = async ({ site: origin }) => {
  const site = origin ?? "https://berliner-schnauze.wtf";
  const [words, themen, posts, home] = await Promise.all([
    fetchAllWords(),
    fetchAllThemen(),
    fetchAllPosts(),
    // The start page texts are optional here: without them the index is served without that block.
    reportAndFallback("[llms.txt] home texts", null, fetchHome),
  ]);
  const { faq = [], intro, knowledgeHtml, soundRules = [] } = home ?? {};
  const link = (title: string, path: string, note?: string) =>
    `- [${title}](${new URL(path, site)})${note ? `: ${note}` : ""}`;
  const count = words.length.toLocaleString("de-DE");
  const filled = themen.filter((t) => t.count > 0);

  const body = [
    "# Berliner Schnauze",
    "",
    `> Berliner Schnauze ist ein kostenloses, werbefreies Berlinerisch–Hochdeutsch-Wörterbuch mit aktuell ${count} Einträgen aus dem Berliner Dialekt, dem Berlinischen und dem Berliner Jargon, einschließlich Berolinismen (Spitznamen für Berliner Orte und Bauwerke).`,
    "",
    "Nutzungsbedingungen: Das Training von KI-Modellen mit diesen Inhalten ist nicht gestattet (ai-train=no). Welche Crawler Zugang bekommen, regelt die Bot-Abwehr der Seite; die Erklärung dazu steht in /robots.txt (Content-Signal) und /.well-known/tdmrep.json.",
    "",
    "Sprache der Seite: Deutsch (de-DE). Die Einträge sind redaktionell gepflegt; sichtbare Datumsangaben auf jeder Wortseite zeigen Erstellung und letzte Änderung.",
    "",
    // The start page text (SPEC startseite-v20 §14): intro, "Wat is Berlinerisch?", sound rules, FAQ.
    ...(intro ? [withCount(intro, words.length), ""] : []),
    ...(knowledgeHtml
      ? ["## Wat is Berlinerisch?", "", toMarkdown(withCount(knowledgeHtml, words.length)), ""]
      : []),
    ...(soundRules.length > 0
      ? [
          "### Lautregeln (Hochdeutsch → Berlinerisch)",
          "",
          ...soundRules.map(
            (r) =>
              `- ${r.standard} → ${r.berlin}${r.example ? `: ${r.example}` : ""}${r.rule ? ` (${r.rule})` : ""}`,
          ),
          "",
        ]
      : []),
    ...(faq.length > 0
      ? [
          "## Häufig jefragt",
          "",
          ...faq.flatMap((f) => [`### ${f.question}`, "", toMarkdown(f.answerHtml), ""]),
        ]
      : []),
    "## Wörterbuch",
    "",
    link("Wort-Index", "/wort", `alle ${count} Einträge von A bis Z`),
    `- Einzelne Einträge liegen unter ${new URL("/wort/", site)}{begriff}. Je nach Eintrag stehen dort Bedeutungen, gleichbedeutende Wörter, Hintergrund zur Herkunft, Quellen, Beispielsätze, Aussprache als Audio, Silbentrennung sowie verwandte, ähnlich klingende und Anagramm-Wörter.`,
    link("Themen", "/themen", `Einträge nach ${filled.length} Themen sortiert`),
    ...filled.map((t) => link(t.name, docPath("themen", t.slug), `${t.count} Wörter`)),
    "",
    "## Magazin",
    "",
    link(
      "Magazin",
      "/magazin",
      "Wissensartikel zu Geschichte, Herkunft und Kuriositäten des Berliner Dialekts",
    ),
    // The imported descriptions start with the title again.
    ...posts.map((p) => {
      const description = oneLine(p.meta?.description);
      return link(
        p.title,
        docPath("posts", p.slug),
        (description.startsWith(p.title)
          ? description.slice(p.title.length).trim()
          : description) || undefined,
      );
    }),
    "",
    "## Mitmachen und Lernen",
    "",
    link(
      "Berliner oder Nicht?",
      "/games/berliner-oder-nicht",
      "Swipe-Spiel: Gehört das Wort zum Berliner Dialekt oder nicht? Kostenlos, ohne Anmeldung",
    ),
    link(
      "Anki-Karteikarten",
      "/anki",
      "Lerndeck zum Berlinerisch-Lernen: ein kostenloses Lite-Deck und das kostenpflichtige Full-Deck mit allen Wörtern und Beispielen",
    ),
    link(
      "Wort vorschlagen",
      "/wort-vorschlagen",
      "fehlendes Wort oder fehlende Redewendung melden",
    ),
    link("Spenden", "/spenden", "das Projekt unterstützen"),
    "",
    "## Optional",
    "",
    link("Was ist neu?", "/changelog", "Änderungen an der Seite"),
    link("Sitemap", "/sitemap-index.xml"),
    link("Impressum", "/impressum"),
    link("Datenschutz", "/datenschutz"),
    "",
  ].join("\n");

  const res = new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  setPageCache(res, { sMaxAge: 3600 });
  return res;
};
