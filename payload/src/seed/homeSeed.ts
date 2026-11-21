/**
 * Seeds the start page texts (global `home`): intro, knowledge, sound rules, FAQ, about, try-words. Only writes
 * fields that are still empty, so a second run changes nothing and edited fields survive. Creates no words.
 * Usage: `scripts/with-env.sh pnpm --filter payload-app seed:home` (local worktree database only).
 */
import type { Payload } from "payload";

import { PRESERVE_CONTENT_MODIFIED_AT } from "../fields/contentModified";
import { htmlToLexical } from "../lib/htmlToLexical";
import { lexicalToHtml } from "../lib/lexicalHtml";
import { hasLexicalText } from "../lib/routes";
import {
  HOME_ABOUT_TEXT,
  HOME_BROWSE_LINKS,
  HOME_FAQ,
  HOME_INTRO,
  HOME_KNOWLEDGE_HTML,
  HOME_SOUND_RULES,
  HOME_TOPIC_SAYINGS,
  HOME_TRY_WORD_SLUGS,
} from "./homeContent";

export async function seedHome(
  payload: Payload,
  tryWordSlugs: string[] = HOME_TRY_WORD_SLUGS,
): Promise<{ written: string[]; skipped: string[] }> {
  const home = await payload.findGlobal({ slug: "home", depth: 0 });
  const data: Record<string, unknown> = {};
  const written: string[] = [];
  const skipped: string[] = [];
  /** Queues `value()` for `name` when the field is empty; `value` returns undefined when there is nothing to write. */
  const fill = async (name: string, empty: boolean, value: () => unknown) => {
    const v = empty ? await value() : undefined;
    if (v === undefined) skipped.push(name);
    else {
      data[name] = v;
      written.push(name);
    }
  };

  await fill("intro", !home.intro, () => HOME_INTRO);
  await fill("knowledge", !hasLexicalText(home.knowledge), () =>
    htmlToLexical(HOME_KNOWLEDGE_HTML, payload.config),
  );
  await fill("soundRules", !home.soundRules?.length, () => HOME_SOUND_RULES);
  await fill("faq", !home.faq?.length, async () =>
    Promise.all(
      HOME_FAQ.map(async (f) => ({
        question: f.question,
        answer: await htmlToLexical(f.answerHtml, payload.config),
      })),
    ),
  );
  await fill("browseLinks", !home.browseLinks?.length, () => HOME_BROWSE_LINKS);
  await fill("aboutText", !home.aboutText, () => HOME_ABOUT_TEXT);
  await fill("tryWords", !home.tryWords?.length, async () => {
    const { docs } = await payload.find({
      collection: "words",
      where: { slug: { in: tryWordSlugs } },
      limit: tryWordSlugs.length,
      depth: 0,
      pagination: false,
    });
    // Keep the mock's order; unknown slugs are simply missing.
    const ids = tryWordSlugs.flatMap((s) => docs.filter((d) => d.slug === s).map((d) => d.id));
    return ids.length ? ids : undefined;
  });

  // Speech bubbles of the topic register: only topics that exist and have no saying yet.
  const topicsFilled: string[] = [];
  for (const [slug, typischerSatz] of Object.entries(HOME_TOPIC_SAYINGS)) {
    const { docs } = await payload.find({
      collection: "themen",
      where: { slug: { equals: slug }, typischerSatz: { exists: false } },
      limit: 1,
      depth: 0,
    });
    if (!docs[0]) continue;
    await payload.update({
      collection: "themen",
      id: docs[0].id,
      data: { typischerSatz },
      depth: 0,
    });
    topicsFilled.push(slug);
  }
  if (topicsFilled.length) written.push(`topicSayings(${topicsFilled.length})`);

  // Magazine teaser: the latest published post gets a quote (its own first sentence) and an IPA outline when it has
  // none (dev stand-ins; the site drops the section without a quote, SPEC §12.3).
  const [post] = (
    await payload.find({
      collection: "posts",
      depth: 0,
      limit: 1,
      sort: "-publishedAt",
      where: { _status: { equals: "published" } },
    })
  ).docs;
  if (post) {
    const first = /<p[^>]*>(.*?)<\/p>/s.exec(lexicalToHtml(post.content))?.[1] ?? "";
    const plain = first
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const sentence = /^.{20,160}?[.!?](?=\s|$)/.exec(plain)?.[0];
    const data: { teaserIpa?: string; teaserZitat?: string } = {};
    if (!post.teaserZitat && sentence) data.teaserZitat = sentence;
    if (Object.keys(data).length) {
      await payload.update({
        collection: "posts",
        context: { [PRESERVE_CONTENT_MODIFIED_AT]: true },
        data,
        depth: 0,
        id: post.id,
      });
      written.push(...Object.keys(data));
    }
  }

  // The dev site also shows drafts (SHOW_TEST_DATA), so the newest posts get the outline, whatever their status.
  const { docs: latest } = await payload.find({
    collection: "posts",
    depth: 0,
    draft: true,
    limit: 3,
    sort: "-publishedAt",
    where: { teaserIpa: { exists: false } },
  });
  for (const p of latest) {
    await payload.update({
      collection: "posts",
      context: { [PRESERVE_CONTENT_MODIFIED_AT]: true },
      data: { teaserIpa: "ɪk" },
      depth: 0,
      draft: p._status === "draft",
      id: p.id,
    });
  }
  if (latest.length) written.push(`teaserIpa(${latest.length})`);

  const ipaDays = await seedWordOfTheDayIpa(payload);
  if (ipaDays) written.push(`wordIpa(${ipaDays})`);

  if (written.length) await payload.updateGlobal({ slug: "home", data, depth: 0 });
  return { written, skipped };
}

// DEV PLACEHOLDER, not phonetics: a rough letter-to-sound guess so the stage outline has something to show.
const IPA_RULES: [RegExp, string][] = [
  [/sch/g, "ʃ"],
  [/ch/g, "ç"],
  [/ei/g, "aɪ"],
  [/au/g, "aʊ"],
  [/ie/g, "iː"],
  [/ä/g, "ɛ"],
  [/ö/g, "œ"],
  [/ü/g, "ʏ"],
  [/ß/g, "s"],
  [/z/g, "ts"],
  [/w/g, "v"],
  [/v/g, "f"],
];
const roughIpa = (lemma: string) =>
  IPA_RULES.reduce(
    (t, [re, to]) => t.replace(re, to),
    lemma.toLowerCase().replace(/[^a-zäöüß]/g, ""),
  );

/**
 * Gives the words of the next 30 days (the site picks one per Berlin day by sorted slug, utils/wordOfTheDay.ts) a
 * placeholder IPA when they have none. Both candidate lists are covered: published words and, with SHOW_TEST_DATA,
 * drafts too. Returns how many words were written.
 */
async function seedWordOfTheDayIpa(payload: Payload): Promise<number> {
  const DAYS = 30;
  const MS_PER_DAY = 86_400_000;
  const all = await payload.find({
    collection: "words",
    depth: 0,
    draft: true,
    limit: 0,
    pagination: false,
    select: { berlinerisch: true, ipa: true, slug: true },
  });
  const published = await payload.find({
    collection: "words",
    depth: 0,
    limit: 0,
    pagination: false,
    select: { berlinerisch: true, ipa: true, slug: true },
  });
  const today = Math.floor(Date.now() / MS_PER_DAY);
  const picks = new Map<string, (typeof all.docs)[number]>();
  for (const list of [all.docs, published.docs]) {
    const sorted = [...list].sort((a, b) => ((a.slug ?? "") < (b.slug ?? "") ? -1 : 1));
    if (!sorted.length) continue;
    for (let d = 0; d < DAYS; d++) {
      const word = sorted[(today + d) % sorted.length];
      picks.set(String(word.id), word);
    }
  }
  let written = 0;
  for (const word of picks.values()) {
    const ipa = roughIpa(word.berlinerisch ?? "");
    if (word.ipa || !ipa) continue;
    await payload.update({
      collection: "words",
      context: { [PRESERVE_CONTENT_MODIFIED_AT]: true },
      data: { ipa },
      depth: 0,
      draft: true,
      id: word.id,
    });
    written++;
  }
  return written;
}
