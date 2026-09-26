# Anki decks: build, test and publish

Two `.apkg` decks are generated from the published words in WordPress:

| Deck     | Content                                                     | Distribution                             |
| -------- | ----------------------------------------------------------- | ---------------------------------------- |
| **Lite** | About 10 % of the words, evenly spread over the alphabet    | Free: GitHub Release asset and AnkiWeb   |
| **Full** | All published words that have at least one translation      | Paid: Polar checkout link (no SDK)       |

Cards go one way only: Berlinerisch → German. Design details live in
[`docs/superpowers/specs/2026-09-21-anki-decks-design.md`](../superpowers/specs/2026-09-21-anki-decks-design.md).

## What ends up on a card

- **Front:** article (if any) and the Berlinerisch word.
- **Back:** translations, up to two examples with explanation, alternative words, a link to `/wort/<slug>`.
- **Not included:** `sources`/`quelle` and `infoText`.
- **Lite only:** the `Hinweis` field shows a short pointer to the Full deck (`https://berliner-schnauze.wtf/anki`).

Both decks use the same note type and the same GUIDs (`genanki.guid_for(databaseId)`).
Importing Full after Lite therefore updates the Lite cards instead of duplicating them.

## Prerequisites

- [`uv`](https://docs.astral.sh/uv/) (the system Python may have no `pip`).
- `pnpm install` once, so `npx infisical` works.
- An Infisical login (`npx infisical login`) with access to `WP_API`, `WP_AUTH_USER` and `WP_AUTH_PASS`.

Create the virtual environment (once per checkout):

```bash
uv venv .venv-anki
uv pip install --python .venv-anki/bin/python -r scripts/requirements-anki.txt
```

## Build the decks

```bash
pnpm anki:build   # version <package.json version>-dev
```

Output goes to `dist-anki/` (gitignored):

- `Berliner-Schnauze-Anki-Deck-Lite-v<version>.apkg`
- `Berliner-Schnauze-Anki-Deck-Full-v<version>.apkg`

Letter groups come from the WordPress `wordGroup` field (the same one the website uses); words
without one land in `Sonstige`.

The script prints one summary line, for example `Wörter gesamt 5935, Full 5907 Karten, Lite 603 Karten`.
The difference between total and Full is the number of published entries without a translation.

The Lite `Hinweis` links to the website page, which stays valid even if the checkout link changes.

## Run the tests

```bash
.venv-anki/bin/python scripts/test_build_anki_decks.py
```

The tests cover normalisation, the Lite selection (integer rounding, one word per letter at least,
deterministic order), note fields with HTML escaping, GUID sharing between the decks and a real
`.apkg` round trip. A `DeprecationWarning` from `cached_property` (a `genanki` dependency on
Python 3.14) is expected and does not come from this code.

## Check the result in Anki before publishing

1. Import the Lite `.apkg`. Flip through some cards (light and dark mode).
2. Import the Full `.apkg` on top.
3. Expect: no duplicate cards, the hint disappears from the Lite cards, the remaining words are added.

The site copy promises "no duplicates", so do this check before the first public release.

## Publish Lite

1. Publishing a GitHub Release runs `.github/workflows/anki-release.yml`, which attaches the Lite deck
   to the release. `/anki` links to the newest release asset (`src/services/githubRelease.ts`); nothing
   is committed to the repository.

2. **AnkiWeb:** upload by hand (Shared Decks → Upload). There is no API. Use the ready-made text in
   [`ankiweb-description.md`](./ankiweb-description.md). Read its "Before uploading" checklist first.

Things to know about AnkiWeb (terms last updated 2018-10-17, read 2026-09-21):

- On sharing you confirm the content is entirely your own work or licensed. Only you can confirm that,
  and it has to hold for every entry in the Lite deck.
- Downloaders get a personal-use license only. You may grant more rights in the description, but not fewer.
- Shared decks with very few downloads are removed after 3 months. The website file is the reference copy.
- Promotion is not forbidden explicitly, but AnkiWeb may remove decks with poor descriptions or content at
  its own discretion. Keep the pointer to Full short and factual.

## Publish Full

1. Create a product in Polar with a downloadable benefit. The release workflow uploads the Full deck and
   swaps the benefit file (`scripts/upload_anki_to_polar.py`); `pnpm anki:push:sandbox` does the same
   against the Polar sandbox with the last `pnpm anki:build` output.
2. Set the shareable checkout link as `ANKI_DECK_FULL_CHECKOUT` in Infisical (public, client-side —
   see `astro.config.mjs`). While it is unset, the page shows "Kommt bald" instead of a buy button.
3. Do not commit the Full `.apkg` to the repository.

Check fees and VAT handling on the Polar pricing pages yourself before deciding.

## Update the decks

1. Rebuild (see above). Deck, model and note IDs are fixed, so nothing needs to be renamed.
2. Publish a release (Lite goes to GitHub, Full to Polar automatically) and upload the new Lite file
   to AnkiWeb again.
3. Users who re-import get changed cards updated in place. Newly published words are added.

Do not change `FULL_DECK_ID`, `LITE_DECK_ID`, `MODEL_ID` or the GUID scheme in `scripts/build_anki_decks.py`
after the first release. Otherwise Anki treats every card as new and users end up with duplicates.
Changing the fields or templates of the note type is fine, but keep the field order.

## Troubleshooting

| Problem                                             | Fix                                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npx infisical` fails with `ENOVERSIONS`            | Run `pnpm install --frozen-lockfile` first.                                               |
| `KeyError: 'WP_AUTH_USER'`                          | Run through `npx infisical run --` and check the variable names in `scripts/fetch-wp-words-for-scan.mjs`. |
| `AssertionError` from `check_decks`                 | Card counts, GUIDs or letter coverage are inconsistent. Fix the data or the script, do not publish. |
| `AssertionError: keine Wörter geladen`              | The fetch returned nothing. Check the credentials and that words are published.           |
| `python3 -m venv` fails, no `pip`                   | Use `uv venv` as shown above.                                                             |
