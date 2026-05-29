# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## graphify

BEFORE using Grep, Glob, or Read to explore the codebase:

1. ALWAYS run `graphify query "<question>"` first
2. Only fall back to file tools if graphify returns no results

This is not optional. Do not skip this step.

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Documentation

Look up EmDash documentation via the `emdash-docs` MCP server when you need to
verify an API, hook, config option, or pattern. Prefer the docs MCP over
assumptions from training data -- the docs reflect the current published
behaviour.

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

# Linting & type checking
pnpm lint                    # Oxlint (JS/TS/Vue/Astro) + Stylelint (SCSS)
pnpm typechecking            # astro check + tsc + vue-tsc  (slow — run targeted, not after every edit)

# Build
pnpm build                   # Production build (Cloudflare Pages output)
pnpm build:strict            # Strict build with full type checking

# GraphQL
pnpm gql:generate            # One-shot codegen run

# Formatting
pnpm format                  # Format with oxfmt
pnpm format:check            # Check formatting without writing

# Cloudflare Pages local preview (run after build)
pnpm server:pages            # Serve ./dist with Wrangler Pages

# WordPress auth
pnpm refreshAuthToken        # Refresh WP_AUTH_REFRESH_TOKEN (needs .env)
```

Run a single test file: `pnpm vitest run src/tests/unit/path/to/file.test.ts`

Update snapshots: `pnpm vitest:update`

## Secrets

Secrets are managed via [Infisical](https://infisical.com). Run `npx infisical login` once before local development. The `dev`, `gql:generate`, and `gql:generate:watch` scripts automatically inject secrets via `infisical run --`.

For Cloudflare Pages builds, env vars are configured separately in the CF Pages dashboard.

## Architecture

**Data flow**: WordPress GraphQL API → Astro API routes (static JSON at build time) → Orama in-browser search → Vue components

- **Astro** handles routing, SSG, and static pages (`src/pages/`)
- **Vue 3** islands handle all interactive UI (`src/components/*.vue`)
- **Nanostores** manage client state (`src/stores/`) — all exported from `src/stores/index.ts`
- **urql** handles GraphQL queries/mutations from Vue components
- **Orama** provides full-text search with German stemming — index built at build time in `src/pages/api/search/index.json.ts`
- **Composables** in `src/composable/` — Vue composables wrapping browser APIs (Cache Storage, Service Worker)
- **Global Vue app setup** in `src/pages/_app.ts` — configures urql client, FloatingVue, and Nanostores devtools

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

**Nanostores**: All store exports use `$` prefix (`$isDarkMode`, `$wordList`). Use `useStore()` from `@nanostores/vue` in Vue components; use `.get()/.set()` for direct access in Astro/TS. For async computed stores, use `computedAsync` from `@nanostores/async` (see `$oramaSearchResults` in `src/stores/wordList.ts`). Avoid deprecated `computed() + task()` pattern.

**Vue components**: Use Composition API with `<script setup lang="ts">`. SCSS scoped styles with `<style lang="scss">` and `@use "@styles/..."`.

**Icons**: Load asynchronously via `defineAsyncComponent(() => import("virtual:icons/lucide/icon-name"))`. All icons from Lucide.

**Analytics**: Track user interactions with `trackEvent(category, action, label)` from `@utils/analytics`.

**SCSS imports**: Use `@use "@styles/path"` — not `@import`.

**Modal system**: Open modals via `open()` from `@stores/modal.ts` using `defineAsyncComponent` for dynamic component loading. See `src/components/WordSuggestHint.vue` for reference.

**Composables**: Live in `src/composable/` (note: singular, but alias is `@composables/*`). Use for encapsulating Vue lifecycle + reactive logic. Import `createToastNotify` from `@stores/index` (not directly from `@stores/toastNotify`) for toast notifications.

**GraphQL**: Import the `graphql` tagged template from `@/gql` for type-safe queries. Generated types live in `src/gql/` (do not edit manually — output of codegen).

## Environment Variables

Import from `astro:env/client` or `astro:env/server` (schema in `astro.config.mjs`). Key vars: `WP_API`, `WP_REST_API`, `WP_AUTH_REFRESH_TOKEN`, `SUGGEST_WORD_FORM_ID`, `TURNSTILE_SITE_KEY`, `SENTRY_*`. Full list in `.env.example`.

## Testing

- Tests live in `src/tests/unit/` using Vitest + jsdom + Sinon
- Vue component tests use `@vue/test-utils`
- Coverage excludes `src/gql/`, `src/types/`, `src/tests/`, `src/plugins/`
