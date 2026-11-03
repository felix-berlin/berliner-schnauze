---
paths:
  - "payload/src/migrations/**"
  - "payload/src/collections/**"
  - "payload/src/globals/**"
  - "payload/src/payload.config.ts"
---

# Payload schema changes and migrations

- **Migrations are expand/contract**: during a rolling release the old `web` runs against the new schema for a while. Add columns nullable or with a default; drop or rename them only in a later release, once no running code reads them. Write a working `down` (`DROP … IF EXISTS` after a `DROP TABLE … CASCADE`); `scripts/migration-upgrade-test.sh` runs it.
- Schema change: edit → `pnpm --filter payload-app generate:types` → `pnpm cms:migrate:create <name>`, commit the migration (CI fails on drift). New collections/globals get `authenticated` access from `payload/src/access.ts` + a Forbidden test in `payload/tests/access.test.ts`.
- Dev and tests push the schema; production only runs committed migrations (`PAYLOAD_RUN_MIGRATIONS=true`, on `cms` alone). Never point a push-filled DB at the prod container.
- Comment collections (`comments`, `comment-votes`, `comment-reports`) are login-only; the site reads them outside `siteRead()` (own `status` filter, `depth: 0`, see `website/CLAUDE.md`). Keep access and that filter in step.
