import type { SearchState } from "./state";
import type { ContentKey, SearchEntry } from "./types";

import { normalize } from "./query";
import { eastWest, oftenBucket, usageFor } from "./usage";

/** TODO(suche): better rhyme than the last 3 letters. */
export const rhymeKey = (word: string): string =>
  normalize(word)
    .replace(/[^\p{L}]/gu, "")
    .slice(-3);

const hasContent = (e: SearchEntry, key: ContentKey): boolean => {
  switch (key) {
    case "audio":
      return e.wordProperties.audioBerlinerisch;
    case "beispiele":
      return e.has.examples;
    case "beispiele-audio":
      return e.has.examplesAudio;
    case "bilder":
      return e.has.images;
    case "jeschichten":
      return e.has.stories;
    case "wissenswertes":
      return e.has.facts;
    case "luecke":
      return e.has.gap;
  }
};

const lengthBucket = (n: number) => (n <= 5 ? "kurz" : n <= 10 ? "mittel" : "lang");

/** AND across groups, OR within a group. q is not checked here. */
export function matches(e: SearchEntry, s: SearchState): boolean {
  const word = normalize(e.wordProperties.berlinerisch);
  if (s.letter && normalize(e.wordGroup) !== normalize(s.letter)) return false;
  if (s.pos.length && !s.pos.some((p) => e.berlinerischWordTypes.includes(p))) return false;
  if (s.themes.length && !s.themes.some((t) => e.themen.includes(t))) return false;
  if (s.content.length && !s.content.some((k) => hasContent(e, k))) return false;
  if (s.starts && !word.startsWith(normalize(s.starts))) return false;
  if (s.ends && !word.endsWith(normalize(s.ends))) return false;
  if (s.rhyme && rhymeKey(word) !== rhymeKey(s.rhyme)) return false;
  if (s.syllables && (s.syllables === 4 ? e.form.syllables < 4 : e.form.syllables !== s.syllables))
    return false;
  if (s.length && lengthBucket(e.form.length) !== s.length) return false;
  if (s.berolinismus && !e.wordProperties.berolinismus) return false;

  // Usage groups: words under MIN_VOTES in the chosen population never match.
  if (s.often || s.area || s.age) {
    const share = usageFor(e.usage, s);
    if (!share) return false;
    if (s.often && oftenBucket(share.say) !== s.often) return false;
  }
  if (s.where) {
    const total = usageFor(e.usage, {});
    if (!total || eastWest(e.usage!) !== s.where) return false;
  }
  return true;
}
