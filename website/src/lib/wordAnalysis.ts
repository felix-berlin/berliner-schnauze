import type { WordPageModel } from "@services/payload/wordPage.ts";

import { countLetters, GERMAN_LETTER_FREQ } from "@utils/wordHelper.ts";
import { posBadge, resolvePos } from "@utils/wordPos.ts";
import { isVowelChar, LETTER_RE } from "payload-app/word-derived";

/** One analysis row (SPEC §11): a label and a plain text or a list of links. A row with neither is never built. */
export type AnalysisRow = {
  label: string;
  links?: { label: string; url: string }[];
  text?: string;
};

const GENUS: Record<string, string> = { das: "neutral", der: "maskulin", die: "feminin" };

const rows = (candidates: AnalysisRow[]): AnalysisRow[] =>
  candidates.filter((r) => r.text || r.links?.length);

/** Wortart reads the same field as the head badge. */
export const grammarRows = ({ grammar, word }: WordPageModel): AnalysisRow[] => {
  const pos = resolvePos(word.wordTypes[0]?.name, word.derived.nlpTags);
  const genus = word.article && GENUS[word.article.toLowerCase()];
  return rows([
    { label: "Wortart", ...(pos && { text: posBadge(pos.pos, pos.auto).text }) },
    { label: "Genus", ...(genus && { text: `${genus}, ${word.article} ${word.berlinerisch}` }) },
    { label: "Plural", ...(grammar.plural && { text: grammar.plural }) },
    { label: "Verkleinerung", ...(grammar.diminutive && { links: [grammar.diminutive] }) },
  ]);
};

export const klangRows = ({ ipa, rhymes, stress, syllables }: WordPageModel): AnalysisRow[] =>
  rows([
    { label: "Silben", ...(syllables.length > 0 && { text: syllables.join("·") }) },
    { label: "Lautschrift", ...(ipa && { text: ipa }) },
    { label: "Betonung", ...(stress && { text: stress }) },
    { label: "Reimt sich auf", ...(rhymes.length > 0 && { links: rhymes }) },
  ]);

/** SPEC §11: one dot is 2 % frequency in German; a letter without a known frequency keeps one dot. */
const DOT_PERCENT = 2;

export const numbers = ({ syllables, word }: WordPageModel) => {
  const letters = word.berlinerisch.split("").filter((ch) => LETTER_RE.test(ch));
  const { consonants, vowels } = countLetters(word.berlinerisch);
  return {
    columns: letters.map((ch) => ({
      ch,
      dots: Math.max(1, Math.round((GERMAN_LETTER_FREQ[ch.toLowerCase()] ?? 0) / DOT_PERCENT)),
      vowel: isVowelChar(ch.toLowerCase()),
    })),
    figures: [
      { label: "Buchstaben", value: letters.length },
      { label: "Silben", value: syllables.length },
      { label: "Vokale", value: vowels },
      { label: "Konsonanten", value: consonants },
    ],
  };
};
