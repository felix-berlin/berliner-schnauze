# „Übernommen“ übernimmt wirklich: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setting a suggestion to „Übernommen“ writes its content into the published word (example, fact, related) or creates and publishes the new word, in the same transaction, and examples show a „Beitrag von …“ credit.

**Architecture:** The existing `beforeChange` hook `adoptSuggestion` gets a second branch for `example`/`fact`/`related` that appends a row to the target word and publishes it through the Local API with the request's `req` (one transaction, rollback on any error). A pure helper builds the row. `examples` gets the credit fields `facts`/`related` already have, via one expand-only migration, and the word page renders them.

**Tech Stack:** Payload 3 (Local API, versions/drafts), Postgres migrations, Astro 7, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-27-suggestion-adoption-design.md`

## Global Constraints

- Code, comments, tests, commits in English; admin error messages in German (like `adoptSuggestion`).
- Commit format `<type>(<scope>): <description>`, scope `word` for all commits here.
- Migrations are expand/contract: only nullable columns (`.claude/rules/payload-migrations.md`); `pnpm --filter payload-app generate:types`, then `pnpm cms:migrate:create <name>`, commit the migration.
- Payload tests run through `scripts/with-env.sh` against the worktree test database: `scripts/with-env.sh sh -c 'cd payload && pnpm vitest run tests/<file>'`.
- Website unit tests: `pnpm vitest run <file>` in `website/` (add `--coverage.enabled=false`).
- A new `contributorName` is hidden from MCP (`access: { read: notOverMcp, update: notOverMcp }`), like on `facts`/`related`.
- Only the transition to `status: "accepted"` triggers adoption; a suggestion that is already accepted is never adopted again.
- `req.context.skipCacheStamp` code paths are untouched; adoption passes `req` so the stamp lands in the same transaction.

## Review Focus

- A suggestion accepted through the MCP: `mcpDraftOnly` refuses a published write to `words`; the save must fail with that readable error and leave status and word unchanged. Test in Task 4.
- Target word with a newer unpublished draft, never published, or in the trash: abort, nothing written, status unchanged. Test in Task 4.
- Saving an accepted suggestion again (any field edit) must not add the entry twice. Test in Task 4.
- A fact with a blank text or an example without text: refuse with a readable message instead of writing an empty row. Test in Task 3.
- „Neues Wort“ whose published word fails validation (a required field missing): the save aborts and no word remains. Test in Task 5.

---

### Task 1: Credit fields on `examples`

**Files:**

- Modify: `payload/src/collections/Words.ts` (the `examples` array, ~line 87)
- Create: `payload/src/migrations/<timestamp>_example_contributor.ts` and `.json` via `pnpm cms:migrate:create example_contributor`; update `payload/src/migrations/index.ts` (generated)
- Modify: `payload/src/payload-types.ts` (generated)
- Test: `payload/tests/exampleContributor.test.ts`

**Interfaces:**

- Produces: `words.examples[]` rows may carry `contributorName?: string | null` (max 40) and `contributorSuggestion?: number | null` (relationship to `suggestions`). Later tasks and the website rely on exactly these names.

- [ ] **Step 1: Write the failing test** `exampleContributor.test.ts`: a word created with `examples: [{ example: "x", contributorName: "Betty" }]` returns `contributorName` `"Betty"` through the Local API; a request with `payloadAPI: "MCP"` context cannot write it (mirror how `facts.contributorName` is covered in the existing words tests; reuse that helper). Name: `examples keep a contributor name, hidden from MCP`.
- [ ] **Step 2: Run it.** Expected: FAIL (field unknown or ignored).
- [ ] **Step 3: Implement** the two fields on `examples`, copying the field definitions and the comment of `facts` (`contributorName`, `contributorSuggestion`) so both stay identical.
- [ ] **Step 4:** `pnpm --filter payload-app generate:types`, then `pnpm cms:migrate:create example_contributor`; open the SQL and check it only adds two nullable columns (and the foreign key and index for the relationship) to the examples table, no drops.
- [ ] **Step 5: Run** the test and `scripts/migration-upgrade-test.sh`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(word): credit fields on word examples`.

### Task 2: Word page shows the credit under an example

**Files:**

- Modify: `website/src/services/payload/words.ts` (`WordExample` type ~line 28 and the `examples` mapping ~line 151)
- Modify: `website/src/services/payload/wordPage.ts` (reuse its `contributor()` helper, line 65)
- Modify: `website/src/components/word/WordExamplesCard.astro`
- Test: `website/src/tests/unit/services/wordPage.test.ts` (extend) and the card's existing render test, if there is one (`WordExamplesCard`), else a new render test following `createAstroRender` in `src/tests/unit/helpers/`

**Interfaces:**

- Consumes: Task 1 fields on `examples`.
- Produces: `WordExample` gains `contributor?: Contributor` (same shape facts use: `{ name?: string; suggestionId: string }`); the card prints the same line as `WordFactsCard.astro:37` (`Beitrag von <name>` or the anonymous variant that file uses).

- [ ] **Step 1: Write the failing tests:** (a) the page model maps `contributorName`/`contributorSuggestion` of an example to `contributor` and drops both raw fields from the public model; (b) the card renders „Beitrag von Betty“ for a credited example and nothing for an uncredited one.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the mapping next to the existing `facts` mapping (do not duplicate `contributor()`; move it to a shared spot only if the file layout needs it) and render the line in the card with the class `facts` uses (`by`), adding the style next to the card's styles if missing.
- [ ] **Step 4: Run** the two tests and `pnpm vitest run src/tests/unit/services src/tests/unit/components`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(word): show the contributor under an example`.

### Task 3: Build the word row from a suggestion

**Files:**

- Create: `payload/src/lib/suggestionEntry.ts`
- Test: `payload/tests/suggestionEntry.test.ts`

**Interfaces:**

- Produces:
  - `export type SuggestionEntry = { field: "examples"; row: { example: string; exampleExplanation?: string; contributorName?: string; contributorSuggestion: number } } | { field: "facts"; row: { kind: string; text: SerializedLexical; contributorName?: string; contributorSuggestion: number } } | { field: "related"; row: { label: string; relation?: string; contributorName?: string; contributorSuggestion: number } }`
  - `export const suggestionEntry = (s: { id: number; type?: string | null; text?: string | null; highdeutsch?: string | null; kind?: string | null; relation?: string | null; relatedText?: string | null; userName?: string | null }): SuggestionEntry` — throws `APIError` (400, German message) for a blank `text` on `example`/`fact`, a blank `relatedText` on `related`, or an unknown type.
  - `export const textToLexical = (text: string) => SerializedLexical` — paragraphs split at blank lines, no HTML parser (jsdom must not enter the bundle; reuse the node shape of `payload/src/seed/e2e.ts:358-363`).

- [ ] **Step 1: Write the failing tests:** example → `exampleExplanation` from `highdeutsch`, credit `Betty` and the suggestion id; fact → Lexical root with one paragraph per blank-line block and the `kind`; related → `label` from `relatedText`; blank text for example/fact throws with the German message; a missing `userName` omits `contributorName`.
- [ ] **Step 2: Run.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement** both exports.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(word): build word rows from suggestions`.

### Task 4: Accepting an example, fact or related writes it into the word

**Files:**

- Modify: `payload/src/hooks/adoptSuggestion.ts` (the early `return data` for non-`word` types)
- Modify: `payload/src/collections/Suggestions.ts` (help text of `status` and `targetWord`)
- Test: `payload/tests/suggestionAdopt.test.ts`

**Interfaces:**

- Consumes: `suggestionEntry` (Task 3), Task 1 fields.
- Produces: in `adoptSuggestion`, for `type` in `example`/`fact`/`related` when `data.status === "accepted" && originalDoc?.status !== "accepted"`: load the target (`data.targetWord ?? originalDoc.targetWord`), abort with `APIError` 400 when it is missing, in the trash, never published, or its latest version is newer than the published one; otherwise append `entry.row` to the word's array and `payload.update({ collection: "words", id, data: { [field]: [...existing, row], _status: "published" }, req })`. Detection: `find` with `draft: false` finds only a published doc; `findByID` with `draft: true` returns the latest version, whose `_status` is `"draft"` when a newer draft exists. Messages (German): not published → „Das Wort „X“ ist nicht veröffentlicht. Erst das Wort veröffentlichen, dann übernehmen.“; newer draft → „Das Wort „X“ hat unveröffentlichte Entwurfsänderungen. Erst das Wort veröffentlichen, dann übernehmen.“; trash → „Das Wort „X“ liegt im Papierkorb.“

- [ ] **Step 1: Write the failing tests** (real DB, helpers as in `tests/suggestions.test.ts:84-100`): per type, accepting appends the row with credit and the word stays published; accepting through the Local API with `req.payloadAPI = "MCP"` fails with the readable error and leaves status `new` and the word unchanged; target with a newer draft, never published, and trashed each abort with the message and change nothing (status stays `new`); saving an accepted suggestion again (change `userName`) does not append a second row; the `cache-stamp` changes after a successful accept (helper pattern in `tests/cacheStamp.test.ts`); a failing publish (invalid word) rolls back the status.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the branch in `adoptSuggestion` as specified; keep the `word` type branch unchanged in this task. Replace the help text of `status` (it currently says to copy by hand) with: accepting writes the entry into the target word and publishes it; the word must be published and have no unpublished changes.
- [ ] **Step 4: Run** the new file and `tests/suggestions*.test.ts`, `tests/cacheStamp.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(word): accepting an example, fact or relation writes it into the word`.

### Task 5: Accepting a new word publishes it

**Files:**

- Modify: `payload/src/hooks/adoptSuggestion.ts` (the create call of the `word` branch)
- Modify: `payload/tests/suggestions.test.ts` (tests that expect a draft word after accepting; ~lines 160-260)
- Test: `payload/tests/suggestionAdopt.test.ts`

**Interfaces:**

- Consumes: nothing new. Produces: the word created on acceptance has `_status: "published"` (create with `draft: false`, `_status: "published"`); slug and duplicate checks stay as they are.

- [ ] **Step 1: Write the failing tests:** accepting a `word` suggestion without `word` yields a published word with translation and example; a word that fails validation when published (set up a suggestion whose word would miss a required field, if none exists use the validation the collection enforces for published words) aborts the save, no word remains and status stays `new`; after accepting, the suggestion is locked (`lockedByWord`). Update the existing assertions that expected `_status: "draft"`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the create change.
- [ ] **Step 4: Run** `tests/suggestions*.test.ts`, `tests/suggestionAdopt.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(word): accepting a new word suggestion publishes the word`.

### Task 6: Docs and full verification

**Files:**

- Modify: `payload/CLAUDE.md` (bullet „Suggestions → words“: example, fact and related are now written into the word on „Übernommen“, abort rules, credit fields on `examples`)
- Modify: `website/CLAUDE.md` (word page: example credit)
- Modify: `docs/test-words.md` only if it names the draft behaviour

- [ ] **Step 1:** Update the three docs; remove the sentence that says examples, facts and related are copied by hand.
- [ ] **Step 2:** Run `pnpm format`, `pnpm lint`, `pnpm test:unit`, the whole payload suite via `scripts/with-env.sh`, `pnpm typecheck` (root `typechecking`), and `scripts/migration-upgrade-test.sh`. Also migrate an empty database from scratch (as in the last CI fix) to confirm the new migration works on a fresh DB.
- [ ] **Step 3: Commit** `docs(word): document suggestion adoption`, push, and watch the pipeline.
- [ ] **Step 4:** Tell the operator: the privacy policy must name the public credit under examples too (not code).
