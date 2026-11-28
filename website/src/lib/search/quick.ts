import type { WordDb } from "@services/wordSearchDb";

import { HISTORY_SHOWN } from "@composables/useSearchHistory";
import { searchUrl } from "@composables/useSearchState";
import { suggestUrl } from "@utils/homeSearch";

import type { RankedHit, SearchEntry } from "./types";

import { terms } from "./query";
import { runSearch, type SearchContext } from "./run";
import { EMPTY_STATE } from "./state";

/** Quick search model (SPEC §21–§23): groups, one flat option list for ↑/↓, key intents. Task 17 wires the DOM. */

export const WORD_MAX = 5;
export const MEANING_MAX = 4;
export const TREND_MAX = 3;
/** From this many words the query reads as a description (SPEC §21.2). */
export const DESCRIBE_FROM = 3;

const ID = "schnellsuche";
const KI_SUB = "Findet passende Wörter, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.";
const KI_SUB_NONE =
  "Vielleicht passt een Wort, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.";

export type QuickOption =
  | { kind: "history"; id: string; term: string }
  | { kind: "word"; id: string; hit: RankedHit }
  | { kind: "action"; id: string; action: "ki" | "all" | "suggest"; title: string; sub: string };

export type QuickGroup = {
  /** Absent: the actions after the divider line. */
  label?:
    | "Zuletzt jesucht"
    | "Heute"
    | "Gerade beliebt"
    | "Klingt nach ’ner Beschreibung"
    | "Im Wort"
    | "In der Bedeutung";
  options: QuickOption[];
};

export type QuickModel = {
  mode: "idle" | "hits" | "none";
  q: string;
  ki: boolean;
  groups: QuickGroup[];
  /** Every option in DOM order: ↑/↓ run over this list across all groups. */
  options: QuickOption[];
  /** Preselected row: none in the empty state (SPEC §21.1), else the first. */
  active: number;
  total: number;
  /** „Meinste“ pills in the nothing-found state. */
  meinste: SearchEntry[];
};

const word = (group: string, entry: SearchEntry, tier: RankedHit["tier"] = 0): QuickOption => ({
  hit: { entry, tier },
  id: `${ID}-${group}-${entry.slug}`,
  kind: "word",
});

const kiAction = (q: string, sub: string): QuickOption => ({
  action: "ki",
  id: `${ID}-ki`,
  kind: "action",
  sub,
  title: `Nach Bedeutung suchen: „${q}“`,
});

const finish = (m: Omit<QuickModel, "options" | "active">): QuickModel => {
  const groups = m.groups.filter((g) => g.options.length);
  return {
    ...m,
    active: m.mode === "idle" ? -1 : 0,
    groups,
    options: groups.flatMap((g) => g.options),
  };
};

function idle(entries: SearchEntry[], ctx: SearchContext, history: string[], ki: boolean) {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  const wotd = ctx.wotd ? bySlug.get(ctx.wotd) : undefined;
  // TODO(schnellsuche): SPEC §26.3 open: only „Gerade beliebt“ or mixed with „Im Aufwind“.
  const trend = [...ctx.trendRanks]
    .sort((a, b) => a[1] - b[1])
    .flatMap(([slug]) => bySlug.get(slug) ?? [])
    .slice(0, TREND_MAX);
  return finish({
    groups: [
      {
        label: "Zuletzt jesucht",
        options: history
          .slice(0, HISTORY_SHOWN)
          .map((term, i) => ({ id: `${ID}-verlauf-${i}`, kind: "history", term })),
      },
      { label: "Heute", options: wotd ? [word("heute", wotd)] : [] },
      { label: "Gerade beliebt", options: trend.map((e) => word("beliebt", e)) },
    ],
    ki,
    meinste: [],
    mode: "idle",
    q: "",
    total: 0,
  });
}

export async function quickModel(
  db: WordDb,
  entries: SearchEntry[],
  query: string,
  ctx: SearchContext,
  { history, ki }: { history: string[]; ki: boolean },
): Promise<QuickModel> {
  const q = query.trim();
  if (!q) return idle(entries, ctx, history, ki);

  // Without letters runSearch returns the whole A–Z list: in the dialog that is no hit.
  const result = terms(q).length
    ? await runSearch(db, entries, { ...EMPTY_STATE, q }, ctx)
    : undefined;
  const hits = (result?.rows ?? []).flatMap((r) => (r.kind === "hit" ? [r.hit] : []));
  const inWord = hits.filter((h) => h.tier < 3).slice(0, WORD_MAX);
  const inMeaning = hits.filter((h) => h.tier === 3 || h.tier === 4).slice(0, MEANING_MAX);
  const base = { ki, q, total: result?.total ?? 0 };

  if (!inWord.length && !inMeaning.length) {
    // Sounds-like hits are the Soundex „Meinste“; runSearch fills suggestions only when nothing matched at all.
    const fuzzy = hits.filter((h) => h.tier === 5).map((h) => h.entry);
    return finish({
      ...base,
      groups: [
        {
          options: [
            ...(ki ? [kiAction(q, KI_SUB_NONE)] : []),
            {
              action: "suggest",
              id: `${ID}-vorschlagen`,
              kind: "action",
              sub: "Wenn’s dit Wort jibt, prüf ick’s und nehm’s uff.",
              title: `Wort vorschlagen: „${q}“`,
            },
          ],
        },
      ],
      meinste: (result?.suggestions.length ? result.suggestions : fuzzy).slice(0, 3),
      mode: "none",
    });
  }

  const describe = ki && terms(q).length >= DESCRIBE_FROM;
  return finish({
    ...base,
    groups: [
      { label: "Klingt nach ’ner Beschreibung", options: describe ? [kiAction(q, KI_SUB)] : [] },
      { label: "Im Wort", options: inWord.map((h) => word("wort", h.entry, h.tier)) },
      {
        label: "In der Bedeutung",
        options: inMeaning.map((h) => word("bedeutung", h.entry, h.tier)),
      },
      {
        options: [
          ...(ki && !describe ? [kiAction(q, KI_SUB)] : []),
          {
            action: "all",
            id: `${ID}-alle`,
            kind: "action",
            sub: "Mit Filtern und Sortierung",
            title:
              base.total === 1
                ? "Treffer auf der Suchseite ansehen"
                : `Alle ${base.total.toLocaleString("de")} Treffer anzeigen`,
          },
        ],
      },
    ],
    meinste: [],
    mode: "hits",
  });
}

/** ↑/↓ with wrap-around; from „nothing active“ ↓ picks the first row, ↑ the last. */
export const moveActive = (active: number, delta: 1 | -1, count: number): number =>
  !count ? -1 : active < 0 ? (delta > 0 ? 0 : count - 1) : (active + delta + count) % count;

/** `aria-activedescendant`: undefined (attribute dropped) while no row is active (SPEC §24). */
export const activeDescendant = (m: QuickModel, active: number): string | undefined =>
  m.options[active]?.id;

export type QuickIntent =
  | { type: "open-word"; slug: string; href: string }
  /** A history row puts its term into the field (SPEC §21.1). */
  | { type: "fill"; term: string }
  | { type: "ki" }
  | { type: "search-page"; href: string }
  | { type: "suggest"; href: string }
  | { type: "remove-history"; term: string };

const pageIntent = (q: string): QuickIntent => ({
  href: searchUrl({ ...EMPTY_STATE, q }),
  type: "search-page",
});

/** What choosing an option (Enter or click) does. */
export function optionIntent(option: QuickOption, q: string): QuickIntent {
  if (option.kind === "history") return { term: option.term, type: "fill" };
  if (option.kind === "word") {
    const { slug } = option.hit.entry;
    return { href: `/wort/${slug}`, slug, type: "open-word" };
  }
  if (option.action === "ki") return { type: "ki" };
  if (option.action === "suggest") return { href: suggestUrl(q), type: "suggest" };
  return pageIntent(q);
}

type Keys = { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean };

/** Enter, Ctrl/⌘+Enter, Shift+Enter and Del (SPEC §23); null = the key does nothing here. */
export function keyIntent(m: QuickModel, active: number, e: Keys): QuickIntent | null {
  const option = m.options[active];
  if (e.key === "Delete")
    return option?.kind === "history" ? { term: option.term, type: "remove-history" } : null;
  if (e.key !== "Enter") return null;
  if (e.ctrlKey || e.metaKey) return m.q ? pageIntent(m.q) : null;
  if (e.shiftKey) return m.q && m.ki ? { type: "ki" } : null;
  return option ? optionIntent(option, m.q) : null;
}
