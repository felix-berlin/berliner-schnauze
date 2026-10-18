# Berliner Schnauze - AI Coding Agent Guide

> The Astro app lives in `website/`; the `src/…` paths below are relative to it.

## Tech Stack & Architecture

**Core Framework**: Astro v7 (every page rendered on demand, Node adapter, file-based routing) + Vue 3 islands for client-side interactivity
**Package Manager**: pnpm (required - enforced via preinstall script)
**State Management**: Nanostores with persistent stores (`@nanostores/persistent`)
**Data Layer**: Payload CMS (`payload/`, Postgres) read through the Local API in the Astro server (`src/services/payload/`)
**Search**: Orama in-memory search engine with German stemming (`@orama/orama`, `@orama/stemmers/german`)
**Styling**: SCSS with custom utilities from `@felix_berlin/sass-butler`
**Testing**: Vitest + jsdom + Sinon for mocking
**PWA**: `@vite-pwa/astro` with service worker + Workbox for offline support
**Icons**: `unplugin-icons` with Lucide icons loaded as async Vue components
**Analytics**: Matomo (self-hosted at analytics.webshaped.de)
**Error Tracking**: Sentry with source map uploads
**Deployment**: Docker image (Node adapter, every page renders on demand)

## Critical Developer Workflows

### Initial Setup

```bash
pnpm install
# Create .env from .env.example; start Postgres and fill it (see payload/README.md)
pnpm dev  # Generates supportedBrowsers.mjs
```

### Development Loop

```bash
pnpm dev                      # Starts Astro dev server (auto-runs supportedBrowsers.mjs via predev)
pnpm --filter website test:unit:watch   # Run tests with coverage in watch mode
pnpm --filter website test:unit:ui      # Run tests with Vitest UI for debugging
```

**Critical**: `predev` script runs automatically before `dev` to generate the browser support detection. Don't skip this.

### Content types

- Hand-written in `src/types/cms.ts`, produced by the adapters in `src/services/payload/`
- **Example**: See `src/services/payload/words.ts` (`toWord`, `fetchAllWords`)

### Pre-commit/Build Checks

```bash
pnpm typechecking              # Runs astro check + tsc + vue-tsc
pnpm lint                      # Oxlint (JS/TS/Vue/Astro) + Stylelint (SCSS)
pnpm test:unit                 # Full test suite with coverage
pnpm build                     # Generates supportedBrowsers.mjs, then builds
```

## Import Aliases & Path Mapping

**Critical**: Always use TypeScript path aliases (configured in `tsconfig.json`):

```typescript
import Component from "@components/Component.vue"; // src/components/
import { fetchData } from "@services/api.ts"; // src/services/
import { $store } from "@stores/index.ts"; // src/stores/
import { helper } from "@utils/helpers.ts"; // src/utils/

import type { Word } from "@/types/cms"; // src/types/
```

**Never** use relative imports like `../../stores/index.ts` - this breaks the codebase conventions.

## Nanostores Pattern

**Convention**: All store exports use `$` prefix for reactive atoms/maps:

```typescript
// Stores (src/stores/*.ts)
export const $isDarkMode = persistentAtom<boolean>("darkMode", false);
export const $wordSearch = persistentMap<WordList>("wordList", defaultState);

// In Vue components
import { useStore } from "@nanostores/vue";
const isDarkMode = useStore($isDarkMode); // Returns Ref<boolean>

// In Astro components or plain TS
import { $isDarkMode } from "@stores/darkMode.ts";
const value = $isDarkMode.get(); // Direct access
```

**Key Stores**:

- `$wordSearch` (src/stores/wordList.ts): Complex filter/search state with Orama integration
- `$isOpen`, `$view`, `$props` (src/stores/modal.ts): Modal system with dynamic component loading
- `$toastNotify` (src/stores/toastNotify.ts): Toast notification queue

## Vue App Configuration

**Global setup** in `src/pages/_app.ts`:

- Registers FloatingVue for tooltips/dropdowns (custom theme: `word-options`)
- Sets up Nanostores devtools in development (all stores visible)

Import this in Astro integration: `vue({ appEntrypoint: "src/pages/_app" })`

## Modal System Pattern

Modals use dynamic component loading with `defineAsyncComponent`:

```typescript
import { open } from "@stores/modal.ts";
import { defineAsyncComponent } from "vue";

open({
  view: {
    component: defineAsyncComponent(() => import("@components/MyForm.vue")),
    props: { initialData: data },
    events: { onSubmit: handleSubmit },
  },
  props: { width: "600px", closeOnClickOutside: false },
});
```

**Modal stores** (`src/stores/modal.ts`):

- `$isOpen`: Boolean for modal visibility
- `$view`: Contains component + props + events
- `$props`: Modal configuration (width, position, closeOnClickOutside, etc.)
- `$element`: HTMLDialogElement reference
- Uses `markRaw()` to prevent Vue reactivity on component definitions

See `src/components/WordSuggestHint.vue` for reference implementation.

## Vue Component Guidelines

**Mandatory**:

- Use Composition API with `<script setup lang="ts">`
- Use `defineAsyncComponent` for code-splitting heavy components (icons, modals, lazy-loaded features)
- Use `@nanostores/vue`'s `useStore()` for reactive store access
- Talk to the server with `fetch` against the site's own API routes (see `SuggestWordForm.vue`)
- SCSS scoped styles: `<style lang="scss">` with `@use "@styles/path"`
- Track user interactions with `trackEvent` from `@utils/analytics`

**Common Patterns**:

```vue
<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $someStore } from "@stores/index.ts";
import { trackEvent } from "@utils/analytics";
import { defineAsyncComponent } from "vue";

// Lazy-load icons for better code splitting
const Icon = defineAsyncComponent(() => import("virtual:icons/lucide/icon-name"));

const storeValue = useStore($someStore);
const handleClick = () => {
  trackEvent("category", "action", "label");
  // ...
};
</script>
```

**Icon Usage**: All icons are from Lucide (`virtual:icons/lucide/*`) and should be loaded asynchronously. Default size is 24x24 (configured in `astro.config.mjs`).

## Data Architecture & API Routes

**Data Flow**: Payload (Local API) → adapters → on-demand pages and API routes → Client-side Search

1. **Data fetch**: `src/services/payload/words.ts` pages the Local API and is memoized for 60 s (`ttl()` in `src/services/cache.ts`, stale-while-revalidate)
2. **API endpoints**: `src/pages/api/search/index.json.ts` and `meta.json.ts` assemble the slim Orama search index per request from stored fields
3. **Client-side search**: Components use these endpoints for instant search without hitting the CMS

**API Route Pattern**:

```typescript
import type { APIRoute } from "astro";
export const GET: APIRoute = async () => {
  // Data processing at build time
  return new Response(JSON.stringify(data));
};
```

**Workbox caching**: API routes have NetworkFirst caching strategy (3-hour cache, 10s timeout) configured in `astro.config.mjs`

## Testing Conventions

**Location**: `src/tests/unit/**/*.{test,spec}.ts`
**Framework**: Vitest with jsdom environment
**Mocking**: Sinon for spies/stubs
**Coverage**: Configured to exclude `src/tests/`, `src/types/`, `src/plugins/`

**Test Structure**:

```typescript
import Component from "@components/Component.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";

describe("Component", () => {
  it("should render correctly", () => {
    const wrapper = mount(Component, {
      props: {/* ... */},
    });
    expect(wrapper.text()).toContain("expected text");
  });
});
```

## Environment Variables

**Astro env schema** (defined in `astro.config.mjs`):

- `PAYLOAD_SERVER_URL`: base URL of the CMS (runtime secret; `DATABASE_URL` and `PAYLOAD_SECRET` are read from `process.env` by `payload.config`)
- `OG_CACHE_DIR`, `SMTP_URL`, `SUGGEST_MAIL_TO`: runtime secrets (OG image cache, suggest-word mail)
- `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile for form protection (the secret verifies tokens server-side)
- `SENTRY_*`: Error tracking (optional in dev)
- `WIKIMEDIA_API_AUTH_TOKEN`: Optional token for Wikimedia API
- `SHOW_TEST_DATA`: Boolean to show draft posts (default false)
- `PWA_DEBUG`: Enable PWA dev mode with service worker in development
- `BUNDLE_ANALYZER_OPEN`: Auto-open bundle analyzer visualization

**Usage**: Import via `astro:env/client` or `astro:env/server`:

```typescript
import { TURNSTILE_SITE_KEY } from "astro:env/client";
```

## Build & Deployment Notes

- **Build output**: `dist/` (Node adapter server entry + assets), served by `server/index.mjs` in the Docker image
- **PWA**: Service worker generated at `dev-dist/sw.js` with Workbox
- **Bundle analysis**: Set `BUNDLE_ANALYZER_OPEN=true` to visualize bundle (rollup-plugin-visualizer)
- **Sentry**: Vite plugin uploads source maps on production builds (requires `SENTRY_AUTH_TOKEN`)
- **Browser support**: Generated at build time via `supportedBrowsers` script (browserslist-useragent-regexp)

## Critical Project Conventions

1. **Vite overrides**: Uses `rolldown-vite` (experimental faster Vite replacement) via pnpm overrides
2. **CMS**: `payload/` is a pnpm workspace package (`payload-app`); schema changes need `pnpm cms:migrate:create <name>`
3. **Store centralization**: All stores exported via `src/stores/index.ts` for unified access
4. **Utility functions**: Common helpers in `@utils/helpers.ts` (routeToWord, seoData, useViewTransition, etc.)
5. **Analytics tracking**: Use `trackEvent(category, action, label)` from `@utils/analytics` for Matomo tracking
6. **SCSS imports**: Use `@use "@styles/path"` instead of `@import` (modern SCSS module system)
