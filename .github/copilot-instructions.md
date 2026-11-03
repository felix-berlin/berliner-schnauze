# Berliner Schnauze - AI Coding Agent Guide

Die vollständigen Regeln stehen in [`CLAUDE.md`](../CLAUDE.md) (repo-weit), [`website/CLAUDE.md`](../website/CLAUDE.md) (Astro/Vue), [`payload/CLAUDE.md`](../payload/CLAUDE.md) (CMS) und [`.claude/rules/`](../.claude/rules/) (nach Dateityp). Bitte dort lesen und dort pflegen.

Kern, falls Links nicht verfolgt werden:

- Nur `pnpm` (nie `npm`/`yarn`). pnpm-Workspace: `website/` (Astro 7 + Vue 3 Islands), `payload/` (Payload CMS 3, Postgres).
- Imports über Aliase (`@components/*`, `@stores/*`, `@utils/*`, `@services/*`, …), nie relativ über Ordnergrenzen.
- Vue: nur `<script setup lang="ts">`, Styles nicht scoped, CSS-Klassen nach BEMIT (`c-`, `o-`, `u-`, `is-`/`has-`, `js-`). Breakpoints nur über `mx.breakpoint()`.
- Jede Site-Query auf Payload nutzt `siteRead()`/`siteDocs()` (sonst lesen Drafts durch).
- Schema-Änderungen brauchen eine committete Migration, expand/contract (neue Spalten nullable/mit Default, Löschen erst im Folge-Release).
- Commits: Conventional Commits (`feat(scope): …`, klein, Imperativ).
