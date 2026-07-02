# Plan: Restore GraphQL Authentication (build-safe on Cloudflare Pages)

**Created:** 2026-07-02
**Trigger:** WordPress GraphQL endpoint (`WP_API`) now requires authentication for all requests — anonymous access has been disabled server-side. Every `astro build` run (including on Cloudflare Pages) and the one browser-side mutation now fail without a valid credential.

## Phase 0 — Documentation Discovery (findings)

### Current architecture (confirmed by reading source, not assumed)

Five separate, duplicated `urql` `Client` instances hit `WP_API`, **none of them send any auth header** today:

| File | Client | Used for |
| --- | --- | --- |
| `src/services/queries/getWords.ts:45-54` | own `Client` | word list (build-time, SSG) |
| `src/pages/[legalPages].astro:12` | own `Client` | legal pages (build-time, SSG) |
| `src/services/queries/getThemen.ts:12` | own `Client` | topic taxonomy (build-time, SSG) |
| `src/services/queries/getAffiliate.ts:9` | own `Client` | affiliate data (build-time, SSG) |
| `src/services/queries/getSitemapWordDates.ts` | raw fetch to `WP_API` | sitemap lastmod (build-time, SSG) |
| `src/pages/_app.ts:9-17` | global Vue urql plugin | **runtime, in the visitor's browser** |

`getWords.ts:16-43` already contains a **dev-only** JWT fetch (`fetchDevAuthToken`) that:

1. POSTs `WP_AUTH_USER` / `WP_AUTH_PASS` (already `context: "server", access: "secret"` in `astro.config.mjs:113-122`) to `${WP_REST_API}/jwt-auth/v1/token`.
2. Gets a JWT back and attaches it as `Authorization: Bearer <token>` on the urql `fetchOptions`.
3. Only runs when `SHOW_TEST_DATA` is true, to reveal `DRAFT` posts in dev.

This proves the **"JWT Authentication for WP-API"** plugin's token is already accepted by WPGraphQL on this WP install (it hooks `determine_current_user`, which WPGraphQL's own permission checks respect). **You do not need the separate "WPGraphQL JWT Authentication" plugin** unless you specifically want a GraphQL-native `login` mutation — confirm by temporarily setting `SHOW_TEST_DATA=true` locally and checking a draft renders; if it still does, the second plugin is redundant and can stay deactivated.

There is also a **separate, static-token path**, unrelated to the above:

- `WP_AUTH_REFRESH_TOKEN` — `context: "client", access: "public"` in `astro.config.mjs:133-136`. **This means it is already inlined into the public browser bundle today** — a pre-existing exposure, independent of the current breakage.
- `src/utils/refreshToken.js` — a manual script (`pnpm refreshAuthToken`) that logs in via `WP_AUTH_USER`/`WP_AUTH_PASS` against the same `/jwt-auth/v1/token` REST endpoint and **rewrites `.env`** with a fresh token. The script itself prints: *"Make sure to add this token to the server environment as well!"* — i.e. it must be manually copied into the Cloudflare Pages dashboard. This is the brittle manual step that most likely caused the current breakage (token expired, dashboard not updated).
- `codegen.ts:6-33` also uses `WP_AUTH_REFRESH_TOKEN` to authenticate schema introspection for `pnpm gql:generate`. This only runs locally (via `infisical run --`), never during the Cloudflare build (`pnpm build` = `astro build`, no codegen step — confirmed in `package.json:39`). Lower priority, but will break the same way for local dev.
- `src/services/fetchApi.ts` and `src/services/mutations/sendMail.ts` also send `Authorization: Bearer ${WP_AUTH_REFRESH_TOKEN}`, but **neither is called from any live code path** — `fetchApi.ts` has no importers, and `sendMail.ts`'s `sendEmailViaContactForm7()` is only referenced from its own dead test file (`src/tests/unit/services/sendMail.test.ts`). Confirmed via repo-wide grep. Both are dead code — candidates for deletion in a follow-up cleanup, out of scope for this plan.

**The actual live mutation path** is `src/components/SuggestWordForm.vue:148,202,218` — it calls `useMutation(SendEmailDocument)` from `@urql/vue`, which runs through the **global, unauthenticated `_app.ts` client, in the browser**, protected only by Cloudflare Turnstile (`TurnStile.vue`). This is the "suggest a word" public form.

**Deployment shape** (confirmed): no `@astrojs/cloudflare` adapter, no `output: "server"`/`"hybrid"` in `astro.config.mjs` — this is a pure static build, deployed as static files to Cloudflare Pages. **There is no server compute at runtime.** That means the browser-side mutation cannot be fixed by adding a same-origin server proxy without also adding Cloudflare Pages Functions (which do not require Astro's SSR adapter and can be added independently).

### Allowed APIs (per WPGraphQL docs the user provided: <https://www.wpgraphql.com/docs/security#authentication-with-wpgraphql>)

- **Application Passwords** (WordPress core, no plugin) → `Authorization: Basic <base64(user:app_password)>`. Explicitly documented as accepted by WPGraphQL without a nonce.
- **JWT** (via "JWT Authentication for WP-API", already installed) → `Authorization: Bearer <jwt>`. Already proven to work (see `getWords.ts` dev flow).
- **HTTP Basic Auth** via `WP-API/Basic-Auth` plugin — not needed, Application Passwords supersede this and don't require a separate plugin.
- Cookie/nonce auth is browser-session-based and not applicable to a build process or a stateless public form.

Anti-patterns to avoid: do not invent a `refreshJwtAuthToken` GraphQL mutation (that belongs to the *other* plugin, not the one in use); do not assume Application Passwords need any plugin — they are WP core since 5.6.

---

## Phase 1 — Decision: build-time authentication mechanism — RESOLVED

**Decision (2026-07-02):** Option A — Application Passwords. The existing `WP_AUTH_USER` / `WP_AUTH_PASS` server secrets (`astro.config.mjs:113-122`) will be reused as-is: `WP_AUTH_PASS` gets its value replaced with the Application Password string generated in wp-admin (Users → Profile → Application Passwords), `WP_AUTH_USER` stays the same. **No new env vars, no `astro.config.mjs` schema changes, no Infisical/Cloudflare dashboard changes** — this is purely an application-code change (how the existing secrets get used) plus a one-time wp-admin action outside this repo.

### What to implement (once a decision is made)

1. Create one shared, authenticated urql client factory: `src/services/wpGraphqlClient.ts`, replacing the 4 duplicated `new Client(...)` call sites.
   - Copy the `fetchOptions: () => ({ headers: {...} })` pattern from `src/services/queries/getWords.ts:47-52` (lazy headers, so the credential can be injected without recreating the client).
   - Body: `headers: { Authorization: \`Basic ${Buffer.from(\`${WP_AUTH_USER}:${WP_AUTH_PASS}\`).toString("base64")}\` }` — same two vars as today, just Basic instead of Bearer/JWT.
2. Update these files to import the shared client instead of constructing their own:
   - `src/services/queries/getWords.ts` — replace the `fetchDevAuthToken`/JWT branch with the shared Basic-Auth client; keep the `SHOW_TEST_DATA` → draft `stati` filter, that's unrelated content filtering, not auth. See the anti-pattern guard below before deleting the JWT flow outright.
   - `src/pages/[legalPages].astro:12`
   - `src/services/queries/getThemen.ts:12`
   - `src/services/queries/getAffiliate.ts:9`
   - `src/services/queries/getSitemapWordDates.ts` (raw `fetch` — attach the same header manually, or switch it to the shared urql client for consistency)
3. No `astro.config.mjs` changes — `WP_AUTH_USER`/`WP_AUTH_PASS` already exist with the correct `context: "server", access: "secret"`.
4. Update `codegen.ts:6-33` to build the same Basic-Auth header from `WP_AUTH_USER`/`WP_AUTH_PASS` instead of `WP_AUTH_REFRESH_TOKEN`, so `pnpm gql:generate` stops depending on the manually-refreshed token.
5. Tell the user to replace the value of `WP_AUTH_PASS` in Infisical with the new Application Password string (generated in wp-admin) instead of the WP login password — this is a secret **value** rotation, not a schema change, and cannot be done by an agent.

### Phase 2 verification checklist

- `pnpm build:local` succeeds and produces non-empty word/page/themen/affiliate JSON output (spot-check `dist/` or the relevant `api/*.json` output).
- Temporarily break the credential (wrong password) and confirm the build fails with a 401 from WPGraphQL, then restore it and confirm success — proves the header is actually required and actually works, rather than assuming a passing build means auth worked (a stale cache could mask a real failure).
- `pnpm test:unit` still passes (check `src/tests/unit/services/wikimediaApi.test.ts:9`, which stubs `WP_AUTH_REFRESH_TOKEN` — confirm it isn't asserting on a token path that no longer exists).
- `pnpm lint` clean.

### Phase 2 anti-pattern guards

- Do not add a 6th independent `new Client()`. If a new query file is needed later, it must import the shared factory.
- Do not touch `WP_AUTH_REFRESH_TOKEN`'s `context: "client"` declaration in this phase — that variable is only relevant to Phase 3/the dead code paths, not to build-time reads.
- Application Passwords authenticate as a real WP user and can see drafts too (same as the JWT flow did) if that user has the right capability — so the `SHOW_TEST_DATA` dev-draft-preview behavior should keep working unchanged once the shared client is wired up. If it doesn't, that's a signal the WP user behind `WP_AUTH_USER` lacks the `edit_posts` capability, not an auth-mechanism problem — don't work around it by re-adding the JWT branch.

---

## Phase 2 — Implement build-time authentication

Execute the "What to implement" list from Phase 1 for the chosen option. Self-contained — a fresh session can start here once Phase 1's decision is recorded above.

**Documentation references:** all file:line references are listed in Phase 1's "What to implement" section above — copy those patterns, don't reinvent them.

---

## Phase 3 — The browser-side mutation (`SuggestWordForm.vue`) — RESOLVED

**Decision (2026-07-02):** Option A — keep the `sendEmail` mutation publicly callable (anonymous, no credential) on the WPGraphQL side, while the rest of the schema stays locked down. Turnstile remains the anti-abuse layer, unchanged. **No changes needed in this repo** — `SuggestWordForm.vue:202,218` keeps calling `useMutation(SendEmailDocument)` through the existing unauthenticated `_app.ts` client exactly as it does today.

This confirms the earlier finding: this repo has no WordPress backend code (`find` for `wp-content`/`mu-plugins` under the project root returned nothing) — the WP install is a separate, headless backend. So this fix is a WP-side action, not an app code change. Documented here anyway since it's a required step to close out the plan.

### What to implement (WP side, outside this repo)

Whatever mechanism currently makes WPGraphQL require auth for everything (a custom `mu-plugin`, a filter in a theme's `functions.php`, or an access-control plugin) needs a **named exception for the `SendEmail` operation** — that's the operation name declared in `src/services/mutations/sendMail.ts:6` (`mutation SendEmail($input: SendEmailInput = {})`), matching `SendEmailDocument` in the generated types.

WPGraphQL's documented hook for this is `graphql_request_data`, which fires before execution and exposes the incoming operation name/query string — this is the standard, supported extension point (not a guess at an undocumented API):

```php
// mu-plugins/allow-anonymous-send-email.php
add_filter( 'graphql_request_data', function ( $request_data ) {
    $operation_name = $request_data['operationName'] ?? null;

    if ( $operation_name === 'SendEmail' ) {
        // Let this one operation through without requiring an authenticated user,
        // even if another filter/plugin blocks anonymous requests schema-wide.
        // (Exact shape depends on how the schema-wide auth requirement was implemented —
        // if it's a separate filter checking is_user_logged_in(), that filter needs the
        // same operation-name exception added to it instead of/alongside this one.)
    }

    return $request_data;
}, 5 ); // priority 5: run before whatever added the blanket auth requirement
```

**Before writing this**, find the actual filter/plugin that introduced the blanket auth requirement (it's what broke the build in the first place) and add the `SendEmail` exception there directly — the snippet above is a starting point, not a guaranteed drop-in, since the blocking logic's exact shape is unknown from this repo alone.

### Phase 3 verification checklist

- Submit the suggest-a-word form against the real (or staging) WP instance with **no** `Authorization` header sent (confirm via browser devtools network tab) and confirm the mutation still succeeds end-to-end — check the resulting WP entry/email, not just that the HTTP request returns 200.
- Confirm every *other* query/mutation still requires auth (i.e. the exception is scoped to `SendEmail` only, not a schema-wide bypass) — try an anonymous `berlinerWords` query and confirm it still 401s/errors.
- Confirm Turnstile still gates submission (test with an invalid/missing Turnstile token, expect rejection) — this is the only anti-abuse layer left on this mutation, so it must still work.

### Phase 3 anti-pattern guards

- Do not widen the exception beyond the exact operation name `SendEmail` — a broader bypass (e.g. "allow all mutations", "allow this IP range") defeats the point of locking the schema down.
- Do not attach any of the Phase 1/2 server credentials to this mutation from the browser — it must stay credential-free, relying on Turnstile alone.

---

## Final Phase — Verification

1. Re-run `pnpm test:unit`, `pnpm lint`, `pnpm typechecking` — all clean.
2. `pnpm build:local` (local, with Infisical) and a Cloudflare-shaped `pnpm build` (no Infisical, env vars exported manually in the shell to simulate the CF Pages build environment) both succeed.
3. Grep the built output (`dist/`) for the `WP_AUTH_PASS` value to confirm the Application Password never leaked into client-shipped files (it must only ever be read at build time, never bundled).
4. Confirm the value currently stored for `WP_AUTH_PASS` in the Cloudflare Pages dashboard is the new Application Password, not the old WP login password — this cannot be checked from the repo and must be confirmed with whoever has dashboard access before merging.
5. Confirm the Phase 3 WP-side exception is live on the production WP instance (not just staging) before this ships — an app-code deploy with no matching WP-side change would leave the suggest-word form broken in prod.
