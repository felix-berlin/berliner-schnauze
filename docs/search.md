# Search

## Engine

[Orama](https://docs.orama.com) — in-browser full-text search. Index built at Astro build time (`src/pages/api/search/index.json.ts`), fetched once at runtime and inserted into Orama (`src/stores/wordList.ts`).

## Indexed fields

| Field | Boost | Notes |
|---|---|---|
| `wordProperties.berlinerisch` | 2.5 | Primary dialect word |
| `wordProperties.translations` | 1.0 | Standard German translations |
| `wordComponents` | 1.0 | Compound word suffix tokens (see below) |

## Compound word search

German compounds like _Bierpinsel_ are a single Orama token. Orama does **prefix** matching natively (`Bier` → `Bierpinsel` ✓), but **suffix** matching does not work out of the box (`Pinsel` → `Bierpinsel` ✗).

`getWordComponents()` in `index.json.ts` generates all suffix substrings (length ≥ 4) from each Berlin dialect word and stores them in the `wordComponents` field:

```
Bierpinsel → ["ierpinsel", "erpinsel", "rpinsel", "pinsel", "insel", "nsel"]
```

At search time, `pinsel` matches the stored token `pinsel` → `Bierpinsel` is found.

**Limitation:** Compounds with _Fugenlaute_ (`Hundes|leben` → linking `-s-`) won't fully benefit, since the suffix `sleben` ≠ `leben`. These are rare in Berlin dialect vocabulary.

## Tokenizer

German language + German stemmer (`@orama/stemmers/german`), `stemming: true`. The following fields skip stemming (stored as-is for exact filter matching):

- `wordGroup`, `berlinerischWordTypes`, `modifiedTs/Gmt`, `dateTs/Gmt`, `wordProperties.berolinismus`

## Fuzzy matching

`tolerance: 1` — Levenshtein distance of 1 (handles single-char typos). `threshold: 0.5` — results below 50 % of the top score are dropped.
