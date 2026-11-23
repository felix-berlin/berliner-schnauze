import type { Story } from "@lib/story.ts";

import { type PollResult, buildPollResult } from "@lib/pollResult.ts";
import { disclosureFor, pickBook } from "@lib/wordBook.ts";
import { ttlBy } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
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
  facts: { kind: string; text: string; contributor?: Contributor }[];
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
  /** `change` is the percent against the previous week; null when that week had no views (nothing to compare). */
  trend?: { kind: "beliebt"; rank: number; views7: number; change: number | null };
  stories: { total: number; items: Story[] };
  featured?: Story;
  featuredStoryId?: string;
  storyPrompt: string;
  book?: { title: string; url: string; cover?: string; disclosure?: string };
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

/** One find, aggregated in code; no visitor data in it (own usage is never part of the model), so it is shared. */
const fetchPoll = ttlBy(60_000, 500, async (wordId: number) => {
  const { docs } = await (
    await getPayloadClient()
  ).find({
    collection: "word-feedback",
    depth: 0,
    limit: 0,
    pagination: false,
    select: { age: true, area: true, half: true, usage: true },
    where: { word: { equals: wordId } },
  });
  return buildPollResult(docs);
});

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
  const [stories, trend, wordPage, affiliate, poll] = await Promise.all([
    fetchStories(word.id, 1),
    // A draft has no public numbers.
    draft ? undefined : getWordTrend(word.id),
    fetchWordPageGlobal(),
    fetchAffiliateData(),
    fetchPoll(word.id),
  ]);
  const book = pickBook(affiliate.books, word.themen[0]?.id);
  const disclosure = book?.href ? disclosureFor(book.href, affiliate.disclaimers) : undefined;
  const { day, month, year } = berlinParts(now);

  return {
    ...(after[0] && { after: link(after[0]) }),
    ...(before[0] && { before: link(before[0]) }),
    ...(book?.title &&
      book.href && {
        book: {
          title: book.title,
          url: book.href,
          ...(book.imageUrl && { cover: book.imageUrl }),
          ...(disclosure && { disclosure }),
        },
      }),
    facts: (word.facts ?? []).flatMap(({ contributorName, contributorSuggestion, kind, text }) => {
      const by = contributor(contributorName, contributorSuggestion);
      return kind && text ? [{ kind, text, ...(by && { contributor: by }) }] : [];
    }),
    ...(stories.featured && { featured: stories.featured, featuredStoryId: stories.featured.id }),
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
    storyPrompt: storyPrompt(wordPage.storyPrompt, word.berlinerisch),
    syllables: hypher.hyphenate(word.berlinerisch),
    ...(trend && {
      trend: {
        change: trend.change,
        kind: "beliebt" as const,
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
