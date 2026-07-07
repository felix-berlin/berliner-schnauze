# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tool Activation (mandatory at session start)

Pre-load deferred tool schemas before any work — eliminates 2-step friction for the whole session:

```text
ToolSearch("select:mcp__serena__initial_instructions,mcp__serena__find_symbol,mcp__serena__find_declaration,mcp__serena__find_implementations,mcp__serena__find_referencing_symbols")
→ call mcp__serena__initial_instructions

ToolSearch("select:mcp__plugin_claude-mem_mcp-search____IMPORTANT,mcp__plugin_claude-mem_mcp-search__search,mcp__plugin_claude-mem_mcp-search__get_observations,mcp__plugin_claude-mem_mcp-search__smart_search,mcp__plugin_claude-mem_mcp-search__observation_search")
→ call mcp__plugin_claude-mem_mcp-search____IMPORTANT
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Serena (symbol navigation)

BEFORE using Grep/Glob/Read to find symbol definitions, implementations, or references:

Use `mcp__serena__find_symbol`, `mcp__serena__find_declaration`, or `mcp__serena__find_implementations` — schemas pre-loaded via Tool Activation above.

## Claude-Mem (past session context)

For questions about past sessions, prior decisions, observations, or history:

Use `mcp__plugin_claude-mem_mcp-search__search` or `mcp__plugin_claude-mem_mcp-search__smart_search` — schemas pre-loaded via Tool Activation above.

Workflow: search() → timeline(anchor=ID) → get_observations([IDs]) — never fetch full details without filtering first.

## Project Overview

Berliner Schnauze is a Berlin dialect translator web app. Data lives in a WordPress GraphQL backend; the frontend is a static Astro site with Vue 3 islands for interactivity. Deployed to Cloudflare Pages.

## Commands

```bash
# Development
pnpm dev                     # Start dev server (requires infisical login; auto-runs codegen + supportedBrowsers via predev)
pnpm gql:generate:watch      # Run in parallel with dev to regenerate types on schema changes (requires infisical login)

# Testing
pnpm test:unit               # Run full test suite with coverage
pnpm test:unit:watch         # Watch mode
pnpm test:unit:ui            # Vitest UI for debugging
pnpm test:ci                 # CI mode: coverage + JUnit reporter

# Linting & type checking
pnpm lint                    # Oxlint (JS/TS/Vue/Astro) + Stylelint (SCSS)
pnpm typechecking            # astro check + vue-tsc  (slow — run targeted, not after every edit; tsc can't resolve .vue imports)

# Build
pnpm build                   # Production build (Cloudflare Pages output) — no infisical, env vars must already be set
pnpm build:local             # Production build locally — wraps build with infisical to inject env vars
pnpm build:strict            # Strict build with full type checking

# GraphQL
pnpm gql:generate            # One-shot codegen run

# Formatting
pnpm format                  # Format with oxfmt
pnpm format:check            # Check formatting without writing

# Cloudflare Pages local preview (run after build)
pnpm server:preview          # Serve ./dist with Wrangler Pages

# WordPress auth
pnpm refreshAuthToken        # Refresh WP_AUTH_REFRESH_TOKEN (exception: needs local .env file, not Infisical)
```

Run a single test file: `pnpm vitest run src/tests/unit/path/to/file.test.ts`

Update snapshots: `pnpm vitest:update`

## Secrets

Secrets are managed via [Infisical](https://infisical.com). Run `npx infisical login` once before local development. The `dev`, `gql:generate`, and `gql:generate:watch` scripts automatically inject secrets via `infisical run --`.

For Cloudflare Pages builds, env vars are configured separately in the CF Pages dashboard.

## Architecture

**Data flow**: WordPress GraphQL API → Astro API routes (static JSON at build time) → Orama in-browser search → Vue components

- **Astro** handles routing, SSG, and static pages (`src/pages/`)
- **Vue 3** islands handle all interactive UI (`src/components/`) — flat files for standalone components, subdirs for feature groups (`games/`, `word/`, `toast/`, `header/`, `accordion/`, `filter/`, `modals/`, `word-search/`). Use **VueUse** (`@vueuse/core`) for browser APIs and Vue utilities before writing custom logic
- **BON game** (`src/components/games/`) — "Berliner oder Nicht" dialect card game (BerlinerOderNicht.vue, BonCard.vue, BonHUD.vue, BonResult.vue, BonShareView.vue). State in `$bonStats` (persistent high scores/streaks) and `$savedBon` (session resume snapshot). Sharing via URL query params (`src/utils/bonShare.ts`)
- **Nanostores** manage client state (`src/stores/`) — import directly from individual store files (e.g. `@stores/darkMode.ts`, `@stores/modal.ts`). Do NOT import from `@stores/index` barrel unless the component specifically needs `wordList.ts` exports — the barrel's `computedAsync` side effect triggers `api/search/index.json` on every chunk that imports it.
- **urql** handles GraphQL queries/mutations from Vue components
- **Orama** provides full-text search with German stemming — index built at build time in `src/pages/api/search/index.json.ts`
- **Composables** in `src/composable/` — Vue composables wrapping browser APIs (Cache Storage, Service Worker)
- **View Transitions**: `ClientRouter` is enabled globally in `src/components/BaseHead.astro`. Header and Footer use `transition:persist`. `<script>` tags in `.astro` files run **only once** on initial load — re-initialize them with `document.addEventListener('astro:page-load', fn)` for subsequent client-side navigations.
- **Global Vue app setup** in `src/pages/_app.ts` — configures urql client, registers `vTooltip` directive globally, and Nanostores devtools

## Import Aliases

Always use TypeScript path aliases — never relative paths like `../../stores/`:

| Alias            | Maps to           |
| ---------------- | ----------------- |
| `@components/*`  | `src/components/` |
| `@stores/*`      | `src/stores/`     |
| `@utils/*`       | `src/utils/`      |
| `@services/*`    | `src/services/`   |
| `@composables/*` | `src/composable/` |
| `@layouts/*`     | `src/layouts/`    |
| `@lib/*`         | `src/lib/`        |
| `@assets/*`      | `src/assets/`     |
| `@styles/*`      | `src/styles/`     |
| `@/*`            | `src/`            |

## Key Conventions

**Nanostores**: All store exports use `$` prefix (`$isDarkMode`, `$wordList`). Use `useStore()` from `@nanostores/vue` in Vue components; use `.get()/.set()` for direct access in Astro/TS. For async computed stores, use `computedAsync` from `@nanostores/async` (see `$oramaSearchResults` in `src/stores/wordList.ts`). Avoid deprecated `computed() + task()` pattern. Key stores: `darkMode.ts`, `modal.ts`, `wordList.ts`, `toastNotify.ts`, `installApp.ts`, `wordOfTheDay.ts`, `bonStats.ts` (persistent game stats), `savedBon.ts` (session resume snapshot), `notificationPermission.ts`, `pushSubscription.ts`.

**Vue components**: Composition API only — `<script setup lang="ts">`. Block order: `<template>`, `<script>`, `<style>`. Styles are NOT scoped — BEMIT class naming provides isolation instead. Use `<style lang="scss">` without `scoped`. Each component owns its SCSS file at `src/styles/components/_name.scss` and loads it via `@use "@styles/components/name"` inside its own `<style>` block — not globally.

**CSS / BEMIT naming**: This project uses [BEMIT](https://gist.github.com/stephenway/a6145d9b4430e8c55a77) — BEM enhanced with namespaces:

| Prefix          | Purpose                     | Example                          |
| --------------- | --------------------------- | -------------------------------- |
| `.c-`           | Components (reusable UI)    | `.c-word-card__title--active`    |
| `.o-`           | Objects (structural)        | `.o-grid__item`                  |
| `.u-`           | Utilities (single-purpose)  | `.u-hidden`                      |
| `.is-` / `.has-`| State                       | `.is-active`, `.has-dropdown`    |
| `.js-`          | JS hooks (no styling)       | `.js-scroll-target`              |

Pattern: `.c-block__element--modifier`. Hyphens separate words within each part (`c-my-component`, not `c-myComponent`). Never use plain BEM without a namespace prefix.

**JS & CSS feature targeting**: Always use native JS and CSS features that are [Baseline Widely Available or Newly Available](https://web.dev/baseline). No polyfills for Baseline features.

**Icons**: Load asynchronously via `defineAsyncComponent(() => import("virtual:icons/lucide/icon-name"))`. All icons from Lucide.

**Analytics**: Track user interactions with `trackEvent(category, action, label)` from `@utils/analytics`.

**SCSS imports**: Use `@use "@styles/path"` — not `@import`. Global styles (base resets, typography, utilities) belong in `src/styles/app.scss`. Component styles follow the pattern in **Vue components** above.

**VueUse** ([vueuse.org/functions](https://vueuse.org/functions.html)): ALWAYS check VueUse before writing any browser API wrapper or Vue utility manually. It covers event listeners, debounce, scroll, storage, clipboard, keyboard shortcuts, swipe, breakpoints, reduced-motion, mutation observer, intersection observer, resize, geolocation, animations, and much more. Do NOT implement manually what VueUse already provides. Already in use: `useBreakpoints`, `usePreferredReducedMotion`, `useDebounceFn`, `onKeyStroke`, `useMutationObserver`, `useSwipe`, `useMagicKeys`, `onClickOutside`, `useClipboard`, `useShare`, `useEventListener`, `useTimeoutFn`, `useVibrate`.

**PWA**: Built with `@vite-pwa/astro` + Workbox. Service worker registered in `src/services/pwa.ts` via `virtual:pwa-register`. On update: shows browser Notification if permission granted, else silently reloads. On offline-ready: shows toast. Cache Storage access via `src/composable/useCacheStorage.ts`. Cache management UI in `src/components/PwaCacheOverview.vue`. Workbox caches all static assets (JS, CSS, images) up to 15 MB.

**Fonts**: All `@font-face` rules use `font-display: swap` (`src/styles/base/_typo.scss`). Do NOT change to `optional` — on cold cache the 100ms block period makes all text invisible then appear as fallback, causing severe CLS (0.65 observed).

**Modal system**: Open modals via `open()` from `@stores/modal.ts` using `defineAsyncComponent` for dynamic component loading. See `src/components/WordSuggestHint.vue` for reference.

**Composables**: Live in `src/composable/` (note: singular, but alias is `@composables/*`). Use for encapsulating Vue lifecycle + reactive logic that VueUse does not cover — custom composables are for project-specific logic only; prefer VueUse when it exists. Import `createToastNotify` from `@stores/toastNotify.ts` directly for toast notifications — do NOT import from `@stores/index` as the barrel re-exports `wordList.ts` which has module-level side effects that trigger unnecessary fetches.

**GraphQL**: Import the `graphql` tagged template from `@/gql` for type-safe queries. Generated types live in `src/gql/` (do not edit manually — output of codegen).

**Astro scripts + View Transitions**: `<script>` in `.astro` files compiles to `<script type="module">` and runs only once — never re-runs after client-side navigation. Wrap any DOM-querying logic in `astro:page-load` so it re-runs on every navigation:

```js
document.addEventListener('astro:page-load', () => {
  // re-initialize observers, querySelectorAll, etc.
});
```

Also guard `ResizeObserver` / `getBoundingClientRect` callbacks against transitional zero-heights: `if (h > 0) { ... }` — View Transition animations can briefly report `height: 0` for persistent elements.

## Environment Variables

Import from `astro:env/client` or `astro:env/server` (schema in `astro.config.mjs`). Key vars: `WP_API`, `WP_REST_API`, `WP_AUTH_REFRESH_TOKEN`, `SUGGEST_WORD_FORM_ID`, `TURNSTILE_SITE_KEY`, `SENTRY_*`, `WAKAPI_API_KEY`. Full list defined in the `env` schema in `astro.config.mjs`. See [Secrets](#secrets) for how vars are injected.

## Testing

- Tests live in `src/tests/unit/` using Vitest + jsdom + `@vue/test-utils`
- Coverage excludes `src/gql/`, `src/types/`, `src/tests/`, `src/plugins/`

**Shared helpers** (`src/tests/unit/helpers/`):

- `createAstroRender(Component)` — creates an `AstroContainer` once and returns a reusable `render(props)` fn. Always call in `beforeAll` with a **30 s timeout** (`AstroContainer.create()` costs ~10-15 s). Exception: tests that call `vi.resetModules()` per-test must create the container per-test.
- `createStoreMockImpl(storeMap)` — builds a `useStore` mock impl that returns the right `ref` per store
- `createComponentStub(template?)` — Proxy-safe module mock for `vi.mock()` factories; includes `[Symbol.toStringTag]: 'Module'` so Vue's `defineAsyncComponent` correctly extracts `.default` (omitting it causes "Component is missing template or render function" warn)
- `createSlotStub(name, template?)` — lightweight stub for `config.global.stubs`

**Testing gotchas:**

- **Icons**: `virtual:icons/*` are auto-stubbed by the Vitest plugin in `vitest.config.ts` — they render as `<span data-testid="icon-lucide-<name>" />`. No per-file `vi.mock` needed.
- **`markRaw()`**: Wrap any component object stored in `ref()` or passed as a reactive prop. Without it Vue makes it a Proxy and warns about missing template/render function.
- **`config.global.stubs`**: Preferred way to stub `defineAsyncComponent` components in `mount()` — avoids `vi.mock` hoisting issues.
- **Proxy `vi.mock` factories**: Must include `[Symbol.toStringTag]: 'Module'` in the target object; use `createComponentStub` from helpers instead of rolling your own.

## Git Commit Conventions

Format: `<type>(<scope>): <description>` — imperative, lowercase, no trailing period.

| Type       | When to use                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | New feature (bumps minor version)                |
| `fix`      | Bug fix (bumps patch)                            |
| `refactor` | Code restructure, no behavior change             |
| `perf`     | Performance-focused refactor                     |
| `style`    | Formatting only, no logic change                 |
| `test`     | Adding or correcting tests                       |
| `docs`     | Documentation only                               |
| `build`    | Dependencies, tooling, version changes           |
| `chore`    | Maintenance (initial commits, config, CI tweaks) |

Breaking change: append `!` before colon → `feat(api)!: remove endpoint`. Footer must include `BREAKING CHANGE: <description>`.

Scope is optional but encouraged for this project: `bon`, `pwa`, `search`, `toast`, `word`, `auth`, `ai`.

Reference: [Conventional Commits](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)

## Package Manager

This project uses **pnpm only**. Never use `npm` or `yarn`. The `preinstall` script enforces this via `only-allow pnpm`.

pnpm supply-chain policy: freshly published packages (< 24h) trigger a lockfile age-gate. Fix: `pnpm clean --lockfile && pnpm install` — rebuilds the lockfile from scratch.

## Astro v7 / Vite 8 Notes

- `compressHTML: true` is set explicitly — v7 changed default to `'jsx'` which strips spaces between inline elements
- `build.cssMinify: "esbuild"` kept — LightningCSS 1.32.0 has a deeper tokenizer bug with this project's bundled CSS: fails with `Unexpected token Function("hsl")` and `Unexpected token IDHash(...)` even on plain hex colors. Converting `$danger` from `hsl()` to hex did not help. LightningCSS bug — revisit when upstream fixes it
- `build.rolldownOptions` replaces deprecated `build.rollupOptions` (Vite 8 moved from Rollup → Rolldown)
- `Uint8Array<ArrayBuffer>` (not plain `Uint8Array`) required for `PushManager.subscribe()` — TS 6 made `Uint8Array` generic
- `@vueuse/core` emits `INVALID_ANNOTATION` Rolldown warnings about `#__PURE__` comment positions — upstream issue, build still succeeds, ignore

## AI / Agent Development (Astro v7)

**Background dev server** — agents struggle with long-running processes; use background mode:

```bash
astro dev --background   # starts server, blocks until ready, then detaches
astro dev status         # check running instance (URL + PID)
astro dev logs           # stream logs from background server
astro dev stop           # idempotent — succeeds even if not running
```

Astro auto-detects AI agents and enables background mode automatically. A lockfile prevents duplicate instances — starting when already running returns the existing instance. Health endpoint: `/_astro/status`.

**JSON logging** — structured logs for agent parsing or log aggregation:

```bash
astro dev --json         # enable JSON log output
```

Or in config:

```js
import { defineConfig, logHandlers } from "astro/config";
export default defineConfig({
  logger: logHandlers.json()   // or logHandlers.compose(logHandlers.console(), logHandlers.json())
});
```

## Design Context

Full strategic/visual system in `PRODUCT.md` and `DESIGN.md` at project root (managed by the `impeccable` skill). Register: **product** (fast lookup beats decoration). Voice: cheeky/schnodderig + warm/heimatlich — never generic dictionary-app neutrality. Visual north star: **"The Postcard Rule"** — a dashed-line texture (borders, dividers, underlines, the headword underline) is the one recurring signature. Currywurst orange is the dominant accent; Berlin Red is rare and declarative; navy-ink `#2b333b` is structural (text/dark-mode surfaces) only. One shadow ("Paper Lift") for every raised surface. Read `DESIGN.md` before any UI work.
