## 1. Implement the detection utility

- [x] 1.1 Create `src/utils/historyNavigationFallback.ts` exporting `shouldForceReload(state: unknown): boolean` — returns `true` when `state` is not a non-null object with a numeric `.index` property (treat `index: 0` as valid, not falsy-invalid), `false` otherwise
- [x] 1.2 In the same module, export `initHistoryNavigationFallback(): void` — registers a single `window.addEventListener('popstate', ...)` listener that calls `shouldForceReload(event.state)` and, if true, calls `window.location.reload()`
- [x] 1.3 Make `initHistoryNavigationFallback()` idempotent (guard against being called more than once, e.g. a module-level boolean flag) as a defensive measure per design.md's risk note

## 2. Wire the fallback into the layout

- [x] 2.1 Add a `<script>` block to `src/layouts/Layout.astro` that imports and calls `initHistoryNavigationFallback()` from `@utils/historyNavigationFallback.ts`
- [x] 2.2 Add a code comment at the call site explaining explicitly why this is NOT wrapped in `document.addEventListener('astro:page-load', ...)` — the listener must attach exactly once per tab session, not re-attach on every transition (see design.md Decisions)

## 3. Unit tests for the detection function

- [x] 3.1 Add `src/tests/unit/utils/historyNavigationFallback.test.ts` covering `shouldForceReload`: `null` → true; `undefined` → true; non-object (`string`, `number`) → true; object without `.index` → true; object with `.index` as non-number (e.g. string) → true; valid `{index: 1, scrollX: 0, scrollY: 0}` → false; valid `{index: 0, scrollX: 0, scrollY: 0}` → false (regression guard against a naive truthiness check on `index`)
- [x] 3.2 Run `pnpm vitest run src/tests/unit/utils/historyNavigationFallback.test.ts` and confirm all cases pass — 7/7 pass

## 4. Live verification of the fix

- [ ] 4.1 Using Chrome DevTools MCP (or manual browser testing), reproduce the exact originally-reported sequence: fresh hard load of a page → client-side link click to another page → browser back button — confirm the page now correctly displays the original page's content (title, DOM) matching the address bar
- [ ] 4.2 Confirm `history.state` inspection: the fallback should have fired specifically because `event.state` was `null`/non-conforming for that entry
- [ ] 4.3 Verify the already-working case is unaffected: navigate via client-side link clicks across two or more pages (producing Astro-tracked entries with `{index, ...}` state), then use browser back/forward between those entries — confirm the existing smooth Astro transition still occurs and the fallback does NOT trigger an extra reload
- [ ] 4.4 Confirm the fallback listener is attached only once (e.g. by checking it doesn't double-fire / cause multiple reloads) even after several client-side transitions have occurred

## 5. Final checks

- [ ] 5.1 Run `pnpm lint` and `pnpm typechecking`
- [ ] 5.2 Run `pnpm test:unit` (full suite) to confirm no regressions
- [ ] 5.3 Run `pnpm build:local` and smoke-test the production build (`pnpm server:preview`) for the same back/forward scenarios verified in section 4
