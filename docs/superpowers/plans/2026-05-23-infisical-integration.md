# Infisical Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Infisical secret management into local dev workflows and GitHub Actions CI, replacing hardcoded GitHub Secrets for app-level vars.

**Architecture:** `.infisical.json` defines workspace + branch-to-environment mapping. `infisical run --` wraps local dev/codegen scripts. GitHub Actions `release.yml` uses GitHub OIDC to fetch Sentry secrets from Infisical at runtime. Cloudflare Pages build and CI-meta secrets (GH_TOKEN, CODECOV_TOKEN) are unaffected.

**Tech Stack:** `@infisical/cli` (already installed), `infisical/secrets-action@v1`, GitHub OIDC, pnpm scripts.

---

## Prerequisites (manual — not scripted)

Before running any task, verify in the Infisical dashboard:

1. Project slug matches what you'll put in the workflow (e.g. `berliner-schnauze` — check the URL in the Infisical UI)
2. A **Machine Identity** exists with **GitHub OIDC** auth method, scoped to this repository (`felix-berlin/berliner-schnauze`)
3. The identity has at least `secrets:read` permission on the project
4. Secrets exist in Infisical under environments `dev`, `staging`, `prod`:
   - `WP_API`, `WP_REST_API`, `WP_AUTH_USER`, `WP_AUTH_PASS`, `WP_AUTH_REFRESH_TOKEN`
   - `SUGGEST_WORD_FORM_ID`, `TURNSTILE_SITE_KEY`, `WIKIMEDIA_API_AUTH_TOKEN`
   - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
   - `ENABLE_ANALYTICS`, `SHOW_TEST_DATA`, `PWA_DEBUG`

---

## Files

| Action | File | Change |
|--------|------|--------|
| Create | `.infisical.json` | Workspace + env mapping |
| Modify | `package.json` | `infisical run --` on `dev`, `gql:generate`, `gql:generate:watch` |
| Modify | `.github/workflows/release.yml` | OIDC permission + Infisical secrets step + dynamic Sentry env |

---

## Task 1: Create `.infisical.json`

**Files:**
- Create: `.infisical.json`

- [ ] **Step 1: Create the config file**

```json
{
  "workspaceId": "dd800c9d-5001-42e3-92c4-283106d8dbcb",
  "defaultEnvironment": "dev",
  "gitBranchToEnvironmentMapping": {
    "main": "prod",
    "beta": "staging"
  }
}
```

> Note: `workspaceId` comes from the existing `feature/infisical` branch commit `40bb41b`. If the Infisical project was recreated, update this value from the Infisical dashboard URL.

- [ ] **Step 2: Verify infisical CLI picks it up**

```bash
cd /home/felix/workspace/berliner-schnauze
npx infisical secrets --env=dev
```

Expected: lists secrets from the `dev` environment (requires being logged in: `npx infisical login`).

- [ ] **Step 3: Commit**

```bash
git add .infisical.json
git commit -m "build(infisical): add workspace config with branch-to-env mapping"
```

---

## Task 2: Wrap local dev scripts in `package.json`

**Files:**
- Modify: `package.json`

**Why these three scripts only:**
- `dev` — astro dev server needs all env vars at startup
- `gql:generate` — codegen.ts uses `loadEnv` to fetch `WP_API` + `WP_AUTH_REFRESH_TOKEN` for schema fetch
- `gql:generate:watch` — same as above, runs continuously in parallel with dev
- `predev` stays unchanged — it calls `pnpm run gql:generate` (which already has infisical) + `pnpm run supportedBrowsers` (no secrets needed)
- `build` stays unchanged — Cloudflare Pages calls this; CF Pages has no infisical CLI

- [ ] **Step 1: Update the three scripts**

In `package.json`, change:

```json
"dev": "infisical run -- astro dev",
"gql:generate": "infisical run -- graphql-codegen --config codegen.ts",
"gql:generate:watch": "infisical run -- graphql-codegen --config codegen.ts --watch",
```

The surrounding scripts for reference (do not change these):
```json
"predev": "pnpm run gql:generate && pnpm run supportedBrowsers",
"build": "pnpm run supportedBrowsers && astro build",
```

- [ ] **Step 2: Verify local dev works**

```bash
pnpm dev
```

Expected: infisical prompts for login if not already authenticated, then starts astro dev server with secrets injected. No "undefined" values in env.

If you see `Error: infisical: command not found`, run `pnpm install` first (it installs `@infisical/cli`).

- [ ] **Step 3: Verify codegen works standalone**

```bash
pnpm gql:generate
```

Expected: graphql-codegen connects to `WP_API` with auth token and regenerates `src/gql/` without network errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "build(infisical): inject secrets via infisical run for dev and codegen scripts"
```

---

## Task 3: Update `release.yml` — OIDC + Infisical secrets

**Files:**
- Modify: `.github/workflows/release.yml`

**What changes:**
1. Add `id-token: write` permission (required for GitHub OIDC)
2. Add Infisical secrets fetch step before the Sentry release step
3. Make Sentry `environment` dynamic (production for `main`, staging for `beta`)
4. Remove hardcoded `${{ secrets.SENTRY_* }}` references from the Sentry step env

- [ ] **Step 1: Replace the full `release.yml` content**

```yaml
name: Release
on:
  push:
    branches:
      - main
      - beta

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write  # required for GitHub OIDC with Infisical

    steps:
      - name: Checkout ✅
        uses: actions/checkout@v6
        with:
          fetch-depth: 0
          token: ${{ secrets.GH_TOKEN }}

      - name: Setup pnpm 🛠️
        uses: pnpm/action-setup@v6

      - name: Setup Node.js 🛠️
        uses: actions/setup-node@v6
        with:
          node-version: "lts/*"

      - name: Install dependencies
        run: pnpm install --ignore-scripts

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
        run: npx semantic-release

      - name: Fetch secrets from Infisical 🔐
        uses: infisical/secrets-action@v1
        with:
          method: oidc
          project-slug: berliner-schnauze
          env-slug: ${{ github.ref_name == 'main' && 'prod' || 'staging' }}

      - name: Create Sentry release
        uses: getsentry/action-release@v3
        env:
          SENTRY_AUTH_TOKEN: ${{ env.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ env.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ env.SENTRY_PROJECT }}
        with:
          environment: ${{ github.ref_name == 'main' && 'production' || 'staging' }}
```

> **Important:** Replace `berliner-schnauze` with the actual project slug from your Infisical dashboard URL if it differs.

> **Note:** `infisical/secrets-action@v1` injects secrets as environment variables into all subsequent steps. The Sentry step reads them via `env.SENTRY_*` (injected by Infisical action) instead of `secrets.SENTRY_*` (GitHub Secrets).

- [ ] **Step 2: Verify the workflow file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci(infisical): fetch Sentry secrets via GitHub OIDC instead of GitHub Secrets"
```

---

## Task 4: Verify and cleanup

- [ ] **Step 1: Push the branch and check the workflow triggers**

Push to a non-main branch first to check for YAML errors. The `release.yml` only triggers on `main`/`beta`, so it won't run — but GitHub validates YAML on push.

```bash
git push origin improvement/secret-manager
```

Check the GitHub Actions tab for any workflow syntax errors.

- [ ] **Step 2: Check that GitHub Secrets to remove are no longer referenced**

After the pipeline runs successfully once on `main`/`beta`, these GitHub Secrets can be removed from the repository settings (Settings → Secrets and variables → Actions):

```
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

Keep: `GH_TOKEN`, `CODECOV_TOKEN`

> Do NOT delete GitHub Secrets until the Infisical-based pipeline has successfully run at least once.

- [ ] **Step 3: Update CLAUDE.md dev commands section**

In `CLAUDE.md`, update the development commands section:

```markdown
# Development
pnpm dev                     # Start dev server (requires infisical login; auto-runs codegen + supportedBrowsers via predev)
pnpm gql:generate:watch      # Run in parallel with dev to regenerate types on schema changes (requires infisical login)
```

Add a note after the commands block:

```markdown
## Secrets

Secrets are managed via [Infisical](https://infisical.com). Run `npx infisical login` once before local development. The `dev`, `gql:generate`, and `gql:generate:watch` scripts automatically inject secrets via `infisical run --`.

For Cloudflare Pages builds, env vars are configured separately in the CF Pages dashboard.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document infisical secret management for local dev"
```
