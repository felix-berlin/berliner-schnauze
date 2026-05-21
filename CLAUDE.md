# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Berliner Schnauze is a Berlin dialect translator web app. Data lives in a WordPress GraphQL backend; the frontend is a static Astro site with Vue 3 islands for interactivity. Deployed to Cloudflare Pages.

## Commands

```bash
# Development
pnpm dev                     # Start dev server (auto-runs codegen + supportedBrowsers via predev)
pnpm gql:generate:watch      # Run in parallel with dev to regenerate types on schema changes

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

## Architecture

**Data flow**: WordPress GraphQL API → Astro API routes (static JSON at build time) → Orama in-browser search → Vue components

- **Astro** handles routing, SSG, and static pages (`src/pages/`)
- **Vue 3** islands handle all interactive UI (`src/components/*.vue`)
- **Nanostores** manage client state (`src/stores/`) — all exported from `src/stores/index.ts`
- **urql** handles GraphQL queries/mutations from Vue components
- **Orama** provides full-text search with German stemming — index built at build time in `src/pages/api/search/index.json.ts`
- **Global Vue app setup** in `src/pages/_app.ts` — configures urql client, FloatingVue, and Nanostores devtools

## Import Aliases

Always use TypeScript path aliases — never relative paths like `../../stores/`:

| Alias | Maps to |
| --- | --- |
| `@components/*` | `src/components/` |
| `@stores/*` | `src/stores/` |
| `@utils/*` | `src/utils/` |
| `@services/*` | `src/services/` |
| `@composables/*` | `src/composable/` |
| `@layouts/*` | `src/layouts/` |
| `@lib/*` | `src/lib/` |
| `@assets/*` | `src/assets/` |
| `@styles/*` | `src/styles/` |
| `@/*` | `src/` |

## Key Conventions

**Nanostores**: All store exports use `$` prefix (`$isDarkMode`, `$wordList`). Use `useStore()` from `@nanostores/vue` in Vue components; use `.get()/.set()` for direct access in Astro/TS.

**Vue components**: Use Composition API with `<script setup lang="ts">`. SCSS scoped styles with `<style lang="scss">` and `@use "@styles/..."`.

**Icons**: Load asynchronously via `defineAsyncComponent(() => import("virtual:icons/lucide/icon-name"))`. All icons from Lucide.

**Analytics**: Track user interactions with `trackEvent(category, action, label)` from `@utils/analytics`.

**SCSS imports**: Use `@use "@styles/path"` — not `@import`.

**Modal system**: Open modals via `open()` from `@stores/modal.ts` using `defineAsyncComponent` for dynamic component loading. See `src/components/WordSuggestHint.vue` for reference.

**GraphQL**: Import the `graphql` tagged template from `@/gql` for type-safe queries. Generated types live in `src/gql/` (do not edit manually — output of codegen).

## Environment Variables

Import from `astro:env/client` or `astro:env/server` (schema in `astro.config.mjs`). Key vars: `WP_API`, `WP_REST_API`, `WP_AUTH_REFRESH_TOKEN`, `SUGGEST_WORD_FORM_ID`, `TURNSTILE_SITE_KEY`, `SENTRY_*`. Full list in `.env.example`.

## Testing

- Tests live in `src/tests/unit/` using Vitest + jsdom + Sinon
- Vue component tests use `@vue/test-utils`
- Coverage excludes `src/gql/`, `src/types/`, `src/tests/`, `src/plugins/`
