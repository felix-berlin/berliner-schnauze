import type { Story } from "@lib/story.ts";
import type { FactKind } from "payload-app/suggestion-enums";

import { type PollResult, buildPollResult } from "@lib/pollResult.ts";
import { disclosureFor, type MoreBook, pickBook, pickMoreBooks } from "@lib/wordBook.ts";
import { sharedPollRows } from "@services/payload/pollRows.ts";
import { fetchAffiliateData, fetchWordPageGlobal } from "@services/payload/site.ts";
import { fetchStories } from "@services/payload/stories.ts";
import { fetchWordRefs, toWordRef } from "@services/payload/wordRefs.ts";
import {
  fetchAllWords,
  fetchWordBySlug,
  type RelatedWord,
  type SiteWord,
} from "@services/payload/words.ts";
import { getWordTrend } from "@services/payload/wordTrend.ts";
import { logRouteError } from "@utils/logError.ts";
import { alphabeticNeighbors, similarSoundingWords, similarWords } from "@utils/wordHelper.ts";
import { berlinParts, pickWordOfTheDay } from "@utils/wordOfTheDay.ts";
import { storyPrompt } from "payload-app/story-prompt";
import { hypher } from "payload-app/word-derived";

const WRITTEN_LIMIT = 5;
const WRITTEN_SIMILARITY = 0.85;

type Link = { label: string; url: string };
type Contributor = { name?: string; suggestionId: string };

export type WordPageModel = {
  word: SiteWord;
  syllables: string[];
  ipa?: string;
  stress?: string;
  rhymes: Link[];
  written: Link[];
  grammar: { plural?: string; diminutive?: Link };
  /** `html` is the rich text of the fact (CMS content, already escaped by `lexicalToHtml`). */
  facts: { contributor?: Contributor; html: string; kind: FactKind; source?: string }[];
  /** `url` is missing for an entry that is only text (no linked word). */
  related: {
    label: string;
    url?: string;
    relation?: string;
    note?: string;
    contributor?: Contributor;
  }[];
  before?: Link;
  after?: Link;
  wotd?: { date: string };
  trend?: { rank: number; views7: number };
  stories: { total: number; items: Story[] };
  featured?: Story;
  storyPrompt: string;
  /** `more`: further books for the footer column next to the book tip (empty without any). */
  book?: { title: string; url: string; cover?: string; disclosure?: string; more: MoreBook[] };
  poll: PollResult;
  updatedAt: string;
};

const link = ({ berlinerisch, slug }: Pick<RelatedWord, "berlinerisch" | "slug">): Link => ({
  label: berlinerisch,
  url: `/wort/${slug}`,
});

const contributor = (name?: string | null, suggestion?: number): Contributor | undefined =>
  suggestion === undefined
    ? undefined
    : { ...(name ? { name } : {}), suggestionId: String(suggestion) };

/** No visitor data in it (own usage is never part of the model), so it is shared. */
const fetchPoll = async (wordId: number) => buildPollResult(await sharedPollRows(wordId));

/**
 * An optional part of the page: when its source fails the page still renders with `fallback` (the failure is logged
 * without values), like the start page. Only the word itself may fail the page.
 */
const soft = async <T>(what: string, fallback: T, run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    logRouteError(`word page ${what}`, error);
    return fallback;
  }
};

const NO_STORIES = { featured: null, hasMore: false, items: [], page: 1, total: 0 };

/** The page model of a public word, or null for an unknown slug. An editor's draft of that word replaces the public row. */
export const fetchWordPage = async (
  slug: string,
  draft?: SiteWord,
): Promise<WordPageModel | null> => {
  const word = draft ?? (await fetchWordBySlug(slug));
  if (!word) return null;
  const words = await fetchAllWords();

  const now = new Date();
  const ref = toWordRef(word);
  const refs = await fetchWordRefs(); // memoized per words array: wordHelper keys its indexes on it
  const { after, before } = alphabeticNeighbors(refs, ref, 1);
  const [stories, trend, promptTemplate, affiliate, poll] = await Promise.all([
    soft("stories", NO_STORIES, () => fetchStories(word.id, 1)),
    // A draft has no public numbers.
    draft ? undefined : soft("trend", undefined, () => getWordTrend(word.id)),
    soft("global", null, async () => (await fetchWordPageGlobal()).storyPrompt),
    soft("affiliate", { books: [], disclaimers: [] }, fetchAffiliateData),
    // The card refetches the numbers in the browser, so an empty result is a safe stand-in.
    soft("poll", buildPollResult([]), () => fetchPoll(word.id)),
  ]);
  const book = pickBook(affiliate.books, word.themen[0]?.id);
  const moreBooks = pickMoreBooks(affiliate.books, book);
  const disclosure = book?.href ? disclosureFor(book.href, affiliate.disclaimers) : undefined;
  const { day, month, year } = berlinParts(now);

  return {
    ...(after[0] && { after: link(after[0]) }),
    ...(before[0] && { before: link(before[0]) }),
    ...(book?.title &&
      book.href && {
        book: {
          more: moreBooks,
          title: book.title,
          url: book.href,
          ...(book.imageUrl && { cover: book.imageUrl }),
          ...(disclosure && { disclosure }),
        },
      }),
    facts: (word.facts ?? []).flatMap(
      ({ contributorName, contributorSuggestion, html, kind, source }) => {
        const by = contributor(contributorName, contributorSuggestion);
        return kind && html
          ? [
              {
                html,
                kind,
                ...(source && { source }),
                ...(by && { contributor: by }),
              },
            ]
          : [];
      },
    ),
    ...(stories.featured && { featured: stories.featured }),
    grammar: {
      ...(word.grammar?.diminutive && { diminutive: link(word.grammar.diminutive) }),
      ...(word.grammar?.plural && { plural: word.grammar.plural }),
    },
    ...(word.ipa && { ipa: word.ipa }),
    poll,
    related: (word.related ?? []).flatMap(
      ({ contributorName, contributorSuggestion, label, note, relation, word: target }) => {
        const text = target?.berlinerisch ?? label;
        if (!text) return [];
        const by = contributor(contributorName, contributorSuggestion);
        return [
          {
            label: text,
            ...(target && { url: link(target).url }),
            ...(relation && { relation }),
            ...(note && { note }),
            ...(by && { contributor: by }),
          },
        ];
      },
    ),
    rhymes: similarSoundingWords(refs, ref).map(link),
    ...(word.stress && { stress: word.stress }),
    stories: { items: stories.items, total: stories.total },
    storyPrompt: storyPrompt(promptTemplate, word.berlinerisch),
    syllables: hypher.hyphenate(word.berlinerisch),
    ...(trend && {
      trend: {
        rank: trend.rank,
        views7: trend.views,
      },
    }),
    updatedAt: word.updatedAt,
    written: similarWords(refs, ref, WRITTEN_SIMILARITY)
      .toSorted((a, b) => b.isSimilar - a.isSimilar)
      .slice(0, WRITTEN_LIMIT)
      .map((w) => link(w.word)),
    ...(pickWordOfTheDay(words, now)?.slug === slug && {
      wotd: { date: `${year}-${month}-${day}` },
    }),
    word,
  };
};
