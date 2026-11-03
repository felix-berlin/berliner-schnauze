---
paths:
  - "website/src/tests/**"
  - "website/**/*.test.ts"
  - "website/vitest.config.ts"
---

# Testing (website/)

- Unit tests live in `src/tests/unit/` (Vitest + `@vue/test-utils`). Two projects (`vitest.config.ts`): `node` for the pure-logic folders `utils`, `services`, `server`, `pages`, `lib`, `jsdom` for the rest. A DOM test in a node folder needs a `// @vitest-environment jsdom` docblock.
- Run one file in `website/`: `pnpm vitest run src/tests/unit/path/to/file.test.ts`.

**Shared helpers** (`src/tests/unit/helpers/`):

- `createAstroRender(Component)` — creates an `AstroContainer` once and returns a reusable `render(props)` fn. Always call in `beforeAll` with a **30 s timeout** (`AstroContainer.create()` costs ~10-15 s). Exception: tests that call `vi.resetModules()` per-test must create the container per-test.
- `createStoreMockImpl(storeMap)` — builds a `useStore` mock impl that returns the right `ref` per store
- `createComponentStub(template?)` — Proxy-safe module mock for `vi.mock()` factories; includes `[Symbol.toStringTag]: 'Module'` so Vue's `defineAsyncComponent` correctly extracts `.default` (omitting it causes "Component is missing template or render function" warn)
- `createSlotStub(name, template?)` — lightweight stub for `config.global.stubs`

**Gotchas:**

- **Icons**: `virtual:icons/*` are auto-stubbed by the Vitest plugin in `vitest.config.ts` — they render as `<span data-testid="icon-lucide-<name>" />`. No per-file `vi.mock` needed.
- **`markRaw()`**: Wrap any component object stored in `ref()` or passed as a reactive prop. Without it Vue makes it a Proxy and warns about missing template/render function.
- **`config.global.stubs`**: Preferred way to stub `defineAsyncComponent` components in `mount()` — avoids `vi.mock` hoisting issues.
- **Proxy `vi.mock` factories**: Must include `[Symbol.toStringTag]: 'Module'` in the target object; use `createComponentStub` from helpers instead of rolling your own.

**Playwright agents**: they use the `mcp__playwright-test__*` MCP server (not `mcp__plugin_playwright_playwright__*`), which must be allowed in `.claude/settings.json`. Without it a background agent can't get approval, a `browser_click` is rejected and its run ends silently — it looks hung. If an agent seems stuck, check its `.output` (last timestamp/tool result) before waiting. Scroll via `browser_run_code_unsafe`/`browser_evaluate` (`window.scrollTo(0, document.body.scrollHeight)`), give a fixed checklist, and tell it to report rejected tools instead of retrying. Animated/`ResizeObserver` elements and toasts also make clicks flaky. Never point a browser tool at berliner-schnauze.wtf (production Matomo).

**E2E in CI**: the Playwright job starts `node server/index.mjs` against a Postgres service that is migrated and seeded with `payload/src/seed/e2e.ts` (invented words; the repo is public). Specs target that data set: `E2E_WORD_SLUGS` in the seed (aasen, anmachen, wa, …). A search needs ≥ 2 results for the `N Ergebnisse` text (1 shows `1 Ergebnis`). `E2E_BUILD=1` only skips the Sentry/Codecov upload plugins. Local E2E runs: `website/CLAUDE.md`.
