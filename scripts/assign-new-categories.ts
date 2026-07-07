#!/usr/bin/env node
/**
 * Heuristically assigns the new themen categories (redewendungen-sprueche,
 * spott-ironie, machen-tun) to uncategorized entries in
 * data/lexikon-import/words-*.json and updates the files in place.
 *
 * Only entries with an empty `themen` array are touched — existing
 * categorizations are never modified. Review the diff before importing.
 *
 * Usage:
 *   pnpm dlx tsx scripts/assign-new-categories.ts --dry-run   # preview per word
 *   pnpm dlx tsx scripts/assign-new-categories.ts             # write JSON files
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { LexikonEntry } from "./import-words-to-wp.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data/lexikon-import");
const DRY_RUN = process.argv.includes("--dry-run");

const REDEWENDUNGEN = "redewendungen-sprueche";
const SPOTT = "spott-ironie";
const MACHEN = "machen-tun";

// Humorous paraphrases: the translation names a mundane object/person the
// word mockingly re-describes (Flüstertüte → Megaphon, Eau de Mief → Parfum).
const SPOTT_TRANSLATIONS =
  /\b(Parfum|Zigarre|Zigarette|Flugzeug|Megaphon|Gabelstapler|Peitsche|Förster|Polizist|Friseur|Lehrer|Direktor|Beamte|Soldat|Offizier|Toilettenpapier|Hut|Brille|Fahrrad|Regenschirm|Perücke|Prothese|Gebiss)\b/;
const SPOTT_WORDS = /Geschwätz|Unsinn|Blödsinn|Unfug|Quatsch|ironisch|spöttisch|Spott/;

function categorize(entry: LexikonEntry): string | null {
  const text = [
    ...entry.translations,
    ...(entry.examples ?? []).map((e) => e.explanation ?? ""),
    entry.infoText ?? "",
  ].join(" ");

  // Fixed idioms: meaning only exists inside a phrase.
  if (/in der (Wendung|Redensart|Drohung)|nur in der Wendung|\(in der Redensart\)/.test(text)) {
    return REDEWENDUNGEN;
  }
  // Multi-word lemmas are phrases themselves ("dünne machen, sich", "ent oder weder").
  if (entry.word.includes(" ") && entry.word.split(" ").length >= 3) return REDEWENDUNGEN;

  if (SPOTT_TRANSLATIONS.test(text) || SPOTT_WORDS.test(text)) return SPOTT;

  // Lowercase verb infinitives (fegen, fackeln, einfuchsen) — but only when
  // the translation also reads verb-ish, to avoid nouns like "Fetzen".
  if (/^[a-zäöüß].*(en|ern|eln)(,.*)?$/.test(entry.word) && !entry.article) {
    const verbishTranslation = entry.translations.some((t) => /(en|ern|eln)\b/.test(t.trim()));
    if (verbishTranslation) return MACHEN;
  }

  return null;
}

let assigned = 0;
let unassigned = 0;
const perCategory: Record<string, number> = {};

for (const file of readdirSync(DATA_DIR)
  .filter((f) => f.startsWith("words-") && f.endsWith(".json"))
  .sort()) {
  const path = join(DATA_DIR, file);
  const entries = JSON.parse(readFileSync(path, "utf8")) as LexikonEntry[];
  let changed = false;

  for (const entry of entries) {
    if (entry.themen.length > 0) continue;
    const category = categorize(entry);
    if (!category) {
      unassigned++;
      continue;
    }
    if (DRY_RUN) {
      console.log(`  [${category}] ${entry.word} → ${entry.translations.join("; ").slice(0, 60)}`);
    } else {
      entry.themen = [category];
      changed = true;
    }
    perCategory[category] = (perCategory[category] ?? 0) + 1;
    assigned++;
  }

  if (changed) writeFileSync(path, JSON.stringify(entries, null, 2) + "\n");
}

console.log(`\n${"─".repeat(50)}`);
console.log(`✓ Assigned: ${assigned}${DRY_RUN ? " (dry run)" : ""}`, perCategory);
console.log(`→ Still uncategorized: ${unassigned}`);
