# v18 refactoring backlog

Items the `/simplify` pass deliberately did not do because the risk is too high or the scope reaches past the word and start page. Each names the blocker and what unblocks it.

## Held back in the code

| Item                                                                                                                            | Why not now                                                                                                                                                                                                                            | Unblocked by                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Drop the `.o-word-v18` remap of `surface-sheet`, `surface-chip`, `text-muted`; drop the `surface.card3` fallbacks               | The warm values differ from the global ones (in dark, `sheet` equals `paper`, `chip` is darker). About 15 files read sheet, 27 chip, 50 muted, including BON and the Anki components. Making them global changes BON and Anki visibly. | BON and Anki move to the warm palette, or shared components get a public property.                                         |
| `HomePoll` `.tile` to `c-choice` tile                                                                                           | Not equivalent: the start page has no remap (chip colour instead of card2), the hover falls back to chip instead of card3, and `aria-disabled` dims the tile and dots its border.                                                      | The item above.                                                                                                            |
| `[...wordSlug].astro` with a single `Layout`                                                                                    | `Layout.astro` switches the footer to callout mode when the `footer-callout` slot is merely present, even empty. A conditional child would change the footer on every word page without a book.                                        | `Layout.astro` renders the slot and tests it for emptiness; affects all pages and island hydration in a pre-rendered slot. |
| `c-word-label` to `c-label`, `c-link` to `c-textlink`, `c-alert` to `c-state`, `WordBadges` to `c-badge`, `c-button` md variant | Not equivalent in look (`.c-label` is the bold form label; c-alert is text only, c-state a box; badge shape differs).                                                                                                                  | New variants per consumer, which would save nothing.                                                                       |
| `GET /api/word-feedback` query-less `DELETE` branch                                                                             | It is the GDPR erasure route for all words of a cookie and is covered by tests.                                                                                                                                                        | A decision to drop the all-words erasure path.                                                                             |

## Measured, not worth it

- Vue runtime chunk split in `astro.config.mjs`: the word page loads 0.1 % less, with one extra request and `WordActions` +17 KB. Reverted.
- Stories SSR props: 20 short rows already; nothing to trim.

## Behaviour changes to know about

- `GET /api/stories/mine` without a cookie answers 200 `{pending:[],reactions:{}}` for an unknown slug, no longer 404.
- `GET /api/word-feedback`: shared counts are cached for 60 s per process. A second web container can show old totals to a voter for up to 60 s; the voter's own answer is always fresh.
- Word trend queries 7 days instead of 14 (`change` was unused).
- Contribute forms load their chunk on first open (`ContributeLazy.vue`).

## Limits that differ between CMS and site (values unchanged)

- Story text: site 500, `Comments` column 1000.
- Name: site 40, `Comments.authorName` 50, `suggestions.userName` 100.
- Report email: site 200, no column limit; suggestion mail: site 254, no column limit.
- Admin descriptions in `Suggestions.ts` still hard-code "200" and "1000".

## Contract steps after `infoTextToFacts --write` ran on prod

- Drop columns `infoText` and `sources`.
- Drop the comment reply columns (`parent`, `editKeyHash`, `editedAt`, `pseudonym`) and the `legacyVisitor` hash code.
- Decide on deleting the `/api/comment-reports` route; `home_facts`.
- Privacy policy entry for `contributorName`.
