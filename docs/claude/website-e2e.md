# Website E2E (detail)

Moved verbatim from `website/CLAUDE.md`. Read before running or writing E2E specs.

**E2E (Playwright)**: specs in `src/tests/e2e/`. They run against the invented data set of `pnpm --filter payload-app seed:e2e` (never real words; the seed refuses a non-local database), so use a throwaway database, never the worktree's real one. Playwright only reads `E2E_PORT` from the environment (default 4321), so every command goes through `with-env.sh`, which loads this worktree's `.env.worktree`:

```bash
# once: throwaway DB on bs-dev-postgres (127.0.0.1:5433), named bsw_<workspace>_e2e (a fixed bs_e2e would collide between worktrees)
#   migrate + seed it with DATABASE_URL pointing there: NODE_ENV=production pnpm --filter payload-app migrate; pnpm --filter payload-app seed:e2e   (Infisical overwrites NODE_ENV: set it inside the injected shell, otherwise Payload pushes the schema and asks interactively)
E2E_BUILD=1 pnpm build        # then: node server/index.mjs with E2E_SERVER=1, PORT=$E2E_PORT, DATABASE_URL (the e2e DB), PAYLOAD_SECRET, PAYLOAD_SERVER_URL=http://localhost:$E2E_PORT
../scripts/with-env.sh npx playwright test <file> --project=chromium
```

`E2E_SERVER=1` (`src/utils/e2eServer.ts`, honoured only with a localhost `PAYLOAD_SERVER_URL`) makes the server deterministic: /anki shows a fixed "120+ Std. Coding-Zeit" instead of live Wakapi hours, and every in-memory rate limit is off, the middleware rules and the per-route caps alike (`rateLimited` in `utils/rateLimit.ts` returns 0 under `isE2eServer()`, `rateLimitedBy` goes through it; every spec comes from one address; the limits have unit tests). **Which test words exist and what each one is for: `docs/test-words.md`.** **`/wort/abjang` is the full word** of the seed: every card of the v18 word page has data (IPA, stress, voices, four images, word of the day, trend badge, O-Ton with three more Jeschichten, facts and related rows with credits, grammar, all four relation kinds, a row without a word, similar spelling and sound via `abjank`, a book, a poll with votes). For a manual check open it on an e2e server (this is the manual test data now; there is no separate `testwort`); new features that need data extend that word. It is the word of the day on the pinned e2e day (index = day number mod word count), so the seed keeps exactly 28 words (28 and 34 keep it on `abjang`): an added word must be paid for with a dropped filler, and the seed deletes nothing: rebuild the e2e database after removing a word. `infoText` and `sources` are not shown by the v18 page (their content lives in `facts`, see `payload/CLAUDE.md`). The seed can be rerun on a fresh database any time: it overwrites its upload files in `payload/media` instead of storing `stimme-m-1.wav` beside the old ones. Reseed before the visual baseline: the trend data is written relative to the seed's day.

`scripts/with-env.sh` re-sources `.env.worktree` after Infisical, so it overrides `DATABASE_URL` and cannot be pointed at the e2e DB; use the recipe's own env (Infisical + `DATABASE_URL` set after sourcing `.env.worktree`) for migrate, seed and the server.

Or against a dev server of your own: `NO_DEV_TOOLBAR=1 ASTRO_DEV_BACKGROUND=0 ../scripts/with-env.sh sh -c 'astro dev --ignore-lock --port $E2E_PORT'`. Don't run the full suite against the user's dev server — it starves it. Always start with `NO_DEV_TOOLBAR=1` (the Astro dev toolbar overlay distorts agent/Playwright results); it is on by default locally, and a server already running without it must be restarted.
