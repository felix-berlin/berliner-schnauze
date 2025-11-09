# Berliner Schnauze - AI Coding Agent Guide

## Tech Stack & Architecture

**Core Framework**: Astro v5 (SSG/SSR hybrid with file-based routing) + Vue 3 islands for client-side interactivity
**Package Manager**: pnpm (required - enforced via preinstall script)
**State Management**: Nanostores with persistent stores (`@nanostores/persistent`)
**Data Layer**: WordPress GraphQL backend via urql (`@urql/vue` + `@urql/core`)
**Search**: Orama in-memory search engine with German stemming (`@orama/orama`, `@orama/stemmers/german`)
**Styling**: SCSS with custom utilities from `@felix_berlin/sass-butler`
**Testing**: Vitest + jsdom + Sinon for mocking
**PWA**: `@vite-pwa/astro` with service worker + Workbox for offline support
**Icons**: `unplugin-icons` with Lucide icons loaded as async Vue components
**Analytics**: Matomo (self-hosted at analytics.webshaped.de)
**Error Tracking**: Sentry with source map uploads
**Deployment**: Cloudflare Pages (optimized build output)

## Critical Developer Workflows

### Initial Setup

```bash
pnpm install
# Create .env from .env.example with required WP_* variables
pnpm dev  # Auto-generates GraphQL types and supportedBrowsers.mjs
```

### Development Loop

```bash
pnpm dev                      # Starts Astro dev server (auto-runs GraphQL codegen + supportedBrowsers.mjs via predev)
pnpm gql:generate:watch       # Run in parallel to regenerate GraphQL types on schema changes
pnpm test:unit:watch          # Run tests with coverage in watch mode
pnpm test:unit:ui             # Run tests with Vitest UI for debugging
```

**Critical**: `predev` script runs automatically before `dev` to generate GraphQL types and browser support detection. Don't skip this.

### GraphQL Codegen Workflow

- **Schema source**: WordPress GraphQL API (configured in `codegen.ts` with auth token)
- **Documents**: Scan `src/**/*.{graphql,ts,vue}` (excluding `src/gql/`)
- **Output**: `src/gql/` (client preset) + `schema.graphql` (schema AST)
- **Usage**: Import `graphql` tagged template from `@/gql` for type-safe queries/mutations
- **Example**: See `src/services/queries/getWords.ts` - uses `GetAllWordsDocument` from generated types

### Pre-commit/Build Checks

```bash
pnpm typechecking              # Runs astro check + tsc + vue-tsc
pnpm lint                      # ESLint (JS/TS/Vue) + Stylelint (SCSS)
pnpm test:unit                 # Full test suite with coverage
pnpm build                     # Generates supportedBrowsers.mjs, then builds
```

## Import Aliases & Path Mapping

**Critical**: Always use TypeScript path aliases (configured in `tsconfig.json`):

```typescript
import Component from "@components/Component.vue"; // src/components/
import { $store } from "@stores/index.ts"; // src/stores/
import { helper } from "@utils/helpers.ts"; // src/utils/
import { fetchData } from "@services/api.ts"; // src/services/
import type { Type } from "@/gql/graphql"; // src/gql/
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

- Configures urql GraphQL client for all Vue components
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
- Use `@urql/vue`'s `useMutation` and `useQuery` for GraphQL operations
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

**Data Flow**: WordPress GraphQL → Astro API Routes → Client-side Search

1. **Build-time data fetch**: `src/services/queries/getWords.ts` uses `@urql/core` client to fetch all words from WordPress GraphQL with pagination (100 items/page)
2. **API endpoints**: `src/pages/api/search/index.json.ts` and `meta.json.ts` generate static JSON files at build time containing pre-processed Orama search indexes
3. **Client-side search**: Components use these cached JSON endpoints for instant search without hitting WordPress

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
**Coverage**: Configured to exclude `src/gql/`, `src/tests/`, `src/types/`, `src/plugins/`

**Test Structure**:

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import Component from "@components/Component.vue";

describe("Component", () => {
  it("should render correctly", () => {
    const wrapper = mount(Component, {
      props: {
        /* ... */
      },
    });
    expect(wrapper.text()).toContain("expected text");
  });
});
```

## Environment Variables

**Astro env schema** (defined in `astro.config.mjs`):

- `WP_API` / `WP_REST_API`: WordPress GraphQL/REST endpoints (client-side public)
- `WP_AUTH_REFRESH_TOKEN`: Auth token for GraphQL (client-side public, used in codegen)
- `SUGGEST_WORD_FORM_ID`: WordPress form ID for word suggestions
- `TURNSTILE_SITE_KEY`: Cloudflare Turnstile for form protection
- `SENTRY_*`: Error tracking (optional in dev)
- `WIKIMEDIA_API_AUTH_TOKEN`: Optional token for Wikimedia API
- `SHOW_TEST_DATA`: Boolean to show draft posts (default false)
- `PWA_DEBUG`: Enable PWA dev mode with service worker in development
- `BUNDLE_ANALYZER_OPEN`: Auto-open bundle analyzer visualization

**Usage**: Import via `astro:env/client` or `astro:env/server`:

```typescript
import { WP_API, TURNSTILE_SITE_KEY } from "astro:env/client";
```

## Build & Deployment Notes

- **Build output**: Cloudflare Pages compatible (file-based routing)
- **PWA**: Service worker generated at `dev-dist/sw.js` with Workbox
- **Bundle analysis**: Set `BUNDLE_ANALYZER_OPEN=true` to visualize bundle (rollup-plugin-visualizer)
- **Sentry**: Vite plugin uploads source maps on production builds (requires `SENTRY_AUTH_TOKEN`)
- **Browser support**: Generated at build time via `supportedBrowsers` script (browserslist-useragent-regexp)

## Critical Project Conventions

1. **Vite overrides**: Uses `rolldown-vite` (experimental faster Vite replacement) via pnpm overrides
2. **GraphQL**: Uses `@0no-co/graphqlsp` TypeScript plugin for inline GraphQL type checking in VSCode
3. **Store centralization**: All stores exported via `src/stores/index.ts` for unified access
4. **Utility functions**: Common helpers in `@utils/helpers.ts` (routeToWord, seoData, useViewTransition, etc.)
5. **Analytics tracking**: Use `trackEvent(category, action, label)` from `@utils/analytics` for Matomo tracking
6. **SCSS imports**: Use `@use "@styles/path"` instead of `@import` (modern SCSS module system)
