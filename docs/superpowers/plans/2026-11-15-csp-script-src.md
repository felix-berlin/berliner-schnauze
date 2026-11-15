# SEC-02: CSP ohne `'unsafe-inline'` und `data:` in `script-src` — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (Schritte in einer Sitzung, Browser-Prüfung nötig).

**Goal:** `script-src` ohne `'unsafe-inline'` und ohne `data:`, erst als Report-Only neben der heutigen Policy.

**Spec:** `docs/audit-2026-11-13.md` (SEC-02) und `docs/superpowers/specs/2026-11-14-audit-fixes-roadmap.md` (Schritt 13).

## Befund (lokaler Build, `NODE_ENV=production`, 2026-11-15)

- Der Header kommt aus `website/server/index.mjs` (`SECURITY_HEADERS`), also nach dem Rendern. Astro kennt keinen Nonce; Nonces per Regex auf gerendertes HTML zu stempeln verbietet die modern-web-guidance (`security` §3.2).
- Astros `security.csp` ist nicht aktiv (`astro.config.mjs` hat nur `allowedDomains`). Es erzeugt Hashes pro Seite als `<meta http-equiv>`; Header und Meta gelten dann **beide**.
- Inline-Skripte je Seite (ohne JSON-LD, das `script-src` nicht betrifft): ca. 10. Eigene: Farbmodus (`SetColorMode.astro`, 1,7 KB, überall), BON-Fragment (`bonFragment.ts`, nur Spiel-Seite). Rest von Astro: Hydrations-Helfer (`Astro.load`/`only`, Island-Direktiven; Länge variiert je Seite) und inline gebündelte Module (Header, Breadcrumbs, Client-Router).
- Style: Seiten tragen `style="…"`-Attribute (6 bis 34 je Seite) und `<style>`-Blöcke. Hashes in `style-src` würden `'unsafe-inline'` dort aufheben und die Attribute brechen.
- Prod (Startseite, per `scripts/prod-curl.sh`, 2026-11-15): Header identisch zum Repo. Die gerenderte Seite hat dieselben Inline-Skripte plus zwei Inline-Module mit einem `globalThis`-Snippet (1,1 und 1,7 KB; Sentry-Plugin beim Prod-Build, lokal nicht vorhanden). Der Inline-Satz hängt also vom Build ab: Hashes von Hand in den Header zu schreiben, wäre brüchig; sie müssen zur Buildzeit entstehen (Astro `security.csp`).
- `data:` in `script-src`: In den gebauten Client-Dateien kommt `data:` nur in Strings vor (Sentry, Vue, Filter), nirgends als Skriptquelle. Streichen ist wahrscheinlich sicher, bleibt aber durch Aufgabe 3 und 4 zu belegen.

## Entscheidung

Astro `security.csp` (Hashes, `scriptDirective` mit den Ressourcen für Turnstile und Pulse) nur für **Skripte**, `style-src` bleibt `'unsafe-inline'`. `strictDynamic` erst nach Prüfung gegen `.browserslistrc` (Import-Map-Integrität: Chrome 127, Firefox 138, Safari 18) und gegen die `<script src>` von Turnstile und Matomo.

## Aufgaben

- [ ] **1. Report-Only-Header.** In `server/index.mjs` `Content-Security-Policy-Report-Only` mit strengem `script-src` (ohne `'unsafe-inline'`/`data:`) neben die bestehende Policy; `report-uri` im Header (Meta ignoriert es). Sentry-Endpoint-Format prüfen. Test: Unit-Test, dass beide Header gesetzt sind.
- [ ] **2. Astro-Hashes.** `security.csp` aktivieren, den globalen Hash-Satz für Client-Router-Navigation prüfen (Inline-Skripte einer anderen Seite, z. B. BON-Fragment, dürfen nach Client-Navigation nicht blockiert werden).
- [ ] **3. Browser-Prüfung** am lokalen Build (Infisical dev, nie Prod-Matomo-ID): Islands hydratisieren, Dark-Mode-Umschalter, Navigationskette bis zur BON-Seite, Kommentarformular mit Turnstile. Konsole auf Verstöße prüfen.
- [ ] **4. `data:` klären** und streichen, wo nichts darauf angewiesen ist.
- [ ] **5. Durchsetzen** (Schritt 16, nach Report-Only-Beobachtung auf Prod): Report-Only-Policy zur Policy machen.

## Review Focus

- Client-Navigation auf eine Seite mit eigenem Inline-Skript (BON) nach Start auf der Startseite.
- Hydration einer Insel, die nur auf einer Seite vorkommt.
- Turnstile-Widget lädt nach strengerer Policy noch.
