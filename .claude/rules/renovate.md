---
paths:
  - "renovate.json"
  - "pnpm-workspace.yaml"
  - ".github/workflows/**"
---

# Renovate and dependency age gates

`renovate.json` (validate with `npx --yes --package renovate@latest -- renovate-config-validator renovate.json`; a cached older Renovate misreports options):
- Only **patch** updates of stable (non-0.x) packages automerge. Minor/major stay PRs for review; GitHub Actions and Docker images never automerge (they reach release/prod). `platformAutomerge` is off so Renovate merges itself only on a green branch, not GitHub on enable.
- `minimumReleaseAge` must stay **above pnpm's own gate** (1 day): 3 days for patch, 2 for minor/major. Renovate proposing a version pnpm rejects breaks `pnpm install` on main (happened with `@iconify-json/lucide@1.2.150`).
- Packages that must move together are grouped (astro, payload + next/react, vue, sentry, test tooling, …). A new dependency family gets a group rule there, not a separate PR stream.
- `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` is a short-lived exception for one specific version: remove it once the version is old enough.
- The CI step running `scripts/migration-upgrade-test.sh` sets `pnpm_config_minimum_release_age: 0`: the base ref is installed without the age gate, so a base lockfile with too-young packages cannot fail the upgrade test. The PR's own install keeps the gate.
