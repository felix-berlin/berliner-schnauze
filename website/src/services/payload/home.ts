import type { Home } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { fetchAllPosts, type SitePost } from "@services/payload/posts.ts";
import { fetchHomeGlobal } from "@services/payload/site.ts";
import { fetchAllThemen } from "@services/payload/themen.ts";
import { fetchAllWords, type SiteWord, translationTexts } from "@services/payload/words.ts";
import { BERLIN, berlinDayKey } from "@utils/berlinTime.ts";
import { reportAndFallback, reportError } from "@utils/reportError.ts";
import { pickWordOfTheDay } from "@utils/wordOfTheDay.ts";
import { type MorseMark, morseRing } from "payload-app/home-stats";
import { htmlToText } from "payload-app/html-text";
import { lexicalToHtml } from "payload-app/lexical-html";
import { hasLexicalText } from "payload-app/routes";

/** The word of the day as the start page shows it. */
export type HomeWord = {
  slug: string;
  lemma: string;
  article?: string;
  wordType?: string;
  /** IPA without brackets (the page adds them). */
  ipa?: string;
  meaning: string;
  example?: { text: string; translation?: string };
  audioUrl?: string;
  /** Morse ring marks of the lemma, capped by morseRing. */
  morse: MorseMark[];
  /** German date in Europe/Berlin, e.g. "Samstag, 21. November". */
  dateLabel: string;
};

export type BrowseLink = {
  label: string;
  href: string;
  icon: NonNullable<NonNullable<Home["browseLinks"]>[number]["icon"]>;
};

/** Own daily pick for the poll, never the word of the day; totalVotes counts usage answers. */
type HomePollWord = {
  slug: string;
  lemma: string;
  meaning: string;
  wordId: number;
  totalVotes: number;
};

export type HomeTopic = {
  slug: string;
  name: string;
  count: number;
  examples: string[];
  saying?: string;
};

export type HomeNewestWord = { slug: string; lemma: string; meaning: string; publishedAt: string };

/** Teaser of the latest post plus up to 3 more. */
export type HomeMagazine = {
  slug: string;
  title: string;
  quote?: string;
  ipa?: string;
  /** First ~90 words as plain text. */
  excerpt: string;
  readingMinutes: number;
  others: { slug: string; title: string }[];
};

export type HomeTryWord = { slug: string; lemma: string };
export type HomeGap = { wordsWithoutAudio: number; randomSlug?: string };
/** Counts for the about tiles; the word count is `wordCount`. */
export type HomeAbout = { text?: string; counts: { topics: number; audio: number; votes: number } };
export type HomeSoundRule = { standard: string; berlin: string; example?: string; rule?: string };
export type HomeFaq = { question: string; answerHtml: string };

/** A section that is missing as a whole is null (word, poll, magazine); a missing sub-field is optional. */
export type HomeData = {
  /** Published words. */
  wordCount: number;
  word: HomeWord | null;
  /** Up to 4 published words picked in the home global. */
  tryWords: HomeTryWord[];
  browseLinks: BrowseLink[];
  poll: HomePollWord | null;
  /** Top 6 topics by word count. */
  topics: HomeTopic[];
  /** The 5 newest published words. */
  newest: HomeNewestWord[];
  magazine: HomeMagazine | null;
  /** Words still missing audio; randomSlug is a daily pick among them. */
  gap: HomeGap;
  about: HomeAbout;
  intro?: string;
  /** Rich text of the global as html. */
  knowledgeHtml?: string;
  soundRules: HomeSoundRule[];
  faq: HomeFaq[];
};

const TRY_WORDS = 4;
const TOPICS = 6;
const NEWEST = 5;
const OTHER_POSTS = 3;
const EXCERPT_WORDS = 90;

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  timeZone: BERLIN,
  weekday: "long",
});

const meaning = (word: SiteWord) => translationTexts(word).join(", ");

const plain = (html: string) => htmlToText(html, " ").replace(/\s+/g, " ").trim();

/** `{ [key]: value }` when the value is set, else nothing: keeps absent optional fields out of the object. */
const opt = <K extends string, V>(key: K, value: V | null | undefined | "") =>
  value ? ({ [key]: value } as { [P in K]: V }) : {};

const toHomeWord = (word: SiteWord, now: Date): HomeWord => {
  const example = word.examples.find((e) => e.example);
  const audioUrl = word.berlinerischAudio[0]?.audio.url;
  return {
    ...opt("article", word.article),
    ...opt("audioUrl", audioUrl),
    dateLabel: dateFormat.format(now),
    ...opt(
      "example",
      example?.example && {
        text: example.example,
        ...opt("translation", example.exampleExplanation),
      },
    ),
    ...opt("ipa", word.ipa),
    lemma: word.berlinerisch,
    meaning: meaning(word),
    morse: morseRing(word.berlinerisch),
    slug: word.slug,
    ...opt("wordType", word.wordTypes[0]?.name),
  };
};

const blocksHtml = (post: SitePost) => post.blocks.filter((b) => typeof b === "string").join(" ");

const quoteOf = (post: SitePost, html: string): string =>
  post.teaserZitat || plain(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/.exec(html)?.[1] ?? "");

/** The latest post that has a teaser quote or a pull quote; posts without one are skipped, not the whole section. */
const toMagazine = (posts: SitePost[]): HomeMagazine | null => {
  for (const post of posts) {
    const html = blocksHtml(post);
    const quote = quoteOf(post, html);
    if (!quote) continue;
    const text = plain(html) || post.excerpt || "";
    return {
      excerpt: text.split(" ").slice(0, EXCERPT_WORDS).join(" "),
      ...opt("ipa", post.teaserIpa),
      others: posts
        .filter((p) => p !== post)
        .slice(0, OTHER_POSTS)
        .map(({ slug, title }) => ({ slug, title })),
      quote,
      readingMinutes: post.readingTime,
      slug: post.slug,
      title: post.title,
    };
  }
  return null;
};

const countVotes = (payload: Awaited<ReturnType<typeof getPayloadClient>>, wordId?: number) =>
  payload
    .count({
      collection: "word-feedback",
      where: wordId
        ? { and: [{ word: { equals: wordId } }, { usage: { exists: true } }] }
        : { usage: { exists: true } },
    })
    .then((r) => r.totalDocs);

const load = async (): Promise<HomeData> => {
  const now = new Date();
  const payload = await getPayloadClient();
  // Words, topics and the global are the page itself and may fail it; posts and vote counts only feed optional parts.
  const [words, themen, posts, global, votes] = await Promise.all([
    fetchAllWords(),
    fetchAllThemen(),
    reportAndFallback("[home] posts", [] as SitePost[], fetchAllPosts),
    fetchHomeGlobal(),
    reportAndFallback("[home] votes", 0, () => countVotes(payload)),
  ]);

  const wordOfTheDay = pickWordOfTheDay(words, now);
  const pollWord = pickWordOfTheDay(
    words.filter((w) => w !== wordOfTheDay),
    now,
  );
  const withoutAudio = words.filter((w) => w.berlinerischAudio.length === 0);
  const gapWord = pickWordOfTheDay(withoutAudio, now);
  const poll: HomePollWord | null = pollWord
    ? {
        lemma: pollWord.berlinerisch,
        meaning: meaning(pollWord),
        slug: pollWord.slug,
        totalVotes: await reportAndFallback("[home] poll votes", 0, () =>
          countVotes(payload, pollWord.id),
        ),
        wordId: pollWord.id,
      }
    : null;

  const byId = new Map(words.map((w) => [w.id, w]));
  const pickedIds = (global.tryWords ?? []).map((w) => (typeof w === "object" ? w.id : w));
  const dropped = pickedIds.filter((id) => !byId.has(id));
  if (dropped.length > 0) {
    console.warn(`[home] try-words dropped (unpublished or deleted), ids: ${dropped.join(", ")}`);
  }
  const tryWords = pickedIds
    .flatMap((id) => byId.get(id) ?? [])
    .slice(0, TRY_WORDS)
    .map((w) => ({ lemma: w.berlinerisch, slug: w.slug }));

  // A rich text saved empty in the admin is a truthy root with one empty paragraph: drop it like a missing one.
  const knowledgeHtml = hasLexicalText(global.knowledge) ? lexicalToHtml(global.knowledge) : "";

  const faq = (global.faq ?? []).flatMap(({ answer, question }): HomeFaq[] => {
    if (!question.trim() || !hasLexicalText(answer)) return [];
    try {
      return [{ answerHtml: lexicalToHtml(answer), question }];
    } catch (error) {
      reportError(error, `[home] FAQ "${question}" skipped`);
      return [];
    }
  });

  // seed:home is dev-only: a production database shows these sections only once an editor filled them.
  if (import.meta.env.PROD && (!global.intro || !knowledgeHtml || faq.length === 0)) {
    console.warn(
      "[home] CMS texts missing (intro, knowledge or FAQ): the sections stay out of the page",
    );
  }

  const topics = themen
    .toSorted((a, b) => b.count - a.count)
    .slice(0, TOPICS)
    .map((t) =>
      Object.assign(
        {
          count: t.count,
          examples: words
            .filter((w) => w.themen.some((x) => x.id === t.id))
            .slice(0, 3)
            .map((w) => w.berlinerisch),
          name: t.name,
          slug: t.slug,
        },
        opt("saying", t.typischerSatz),
      ),
    );

  return {
    about: {
      counts: {
        audio: words.length - withoutAudio.length,
        topics: themen.length,
        votes,
      },
      ...opt("text", global.aboutText),
    },
    browseLinks: (global.browseLinks ?? []).map(({ href, icon, label }) => ({
      href,
      icon: icon ?? "random",
      label,
    })),
    faq,
    gap: {
      ...opt("randomSlug", gapWord?.slug),
      wordsWithoutAudio: withoutAudio.length,
    },
    ...opt("intro", global.intro),
    ...opt("knowledgeHtml", knowledgeHtml),
    magazine: toMagazine(posts),
    newest: words
      .flatMap((w) =>
        w.publishedAt
          ? [
              {
                lemma: w.berlinerisch,
                meaning: meaning(w),
                publishedAt: w.publishedAt,
                slug: w.slug,
              },
            ]
          : [],
      )
      .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, NEWEST),
    poll,
    soundRules: (global.soundRules ?? []).map(({ berlin, example, rule, standard }) =>
      Object.assign({ berlin, standard }, opt("example", example), opt("rule", rule)),
    ),
    topics,
    tryWords,
    word: wordOfTheDay ? toHomeWord(wordOfTheDay, now) : null,
    wordCount: words.length,
  };
};

// The picks are day-keyed: a new Berlin day starts a fresh cache, so no request gets yesterday's word.
let cached: { day: string; get: () => Promise<HomeData> } | undefined;

export const fetchHome = (): Promise<HomeData> => {
  const day = berlinDayKey(new Date());
  if (cached?.day !== day) cached = { day, get: ttl(60_000, load) };
  return cached.get();
};
