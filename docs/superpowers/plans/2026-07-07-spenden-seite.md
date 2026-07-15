# Plan: Spenden-Seite (`/spenden`) + Footer-Funding aus CMS

**Branch:** `improvement/footer-plus-funding`
**Datum:** 2026-07-07
**Status:** Bereit zur Ausführung — jede Phase ist self-contained und kann in einem frischen Chat-Kontext ausgeführt werden.

Ziel: Eine eigene Spenden-Seite, die alle Funding-Optionen aus dem WordPress-CMS rendert (Plattform-Links + Krypto-Wallets mit Copy-Button), und das Footer-Funding-Menü von `package.json` auf CMS-Daten umstellen.

---

## Phase 0: Documentation Discovery (ERLEDIGT — konsolidierte Findings)

### Live-API-Daten (verifiziert am 2026-07-07 gegen WP_API)

Query (funktioniert, verifiziert):

```graphql
query Funding {
  company {
    companyInformations {
      funding {
        adresse
        link
        name
      }
    }
  }
}
```

Antwort: **15 Einträge, zwei Sorten** (diskriminiert dadurch, welches Feld gesetzt ist):

1. **Plattformen** (`link` gesetzt, `adresse: null`) — 4 Stück:
   GitHub Sponsors, Ko-fi, PayPal, Buy me a coffee
2. **Krypto-Wallets** (`adresse` gesetzt, `link: null`) — 11 Stück:
   - `0x4A21…1eeE` geteilt von **8 EVM-Chains**: Ethereum, Linea, Base, BNB Chain, Sei, Polygon, OP, Arbitrum
   - Bitcoin `bc1qdp6…`, Solana `HUj6…`, Tron `TRww…` je eigene Adresse

⚠️ Dedupe-Anforderung: Die 8 EVM-Einträge teilen dieselbe Adresse → auf der Seite **eine** Adress-Karte mit Chain-Badges, nicht 8 identische Karten. Gruppierung datengetrieben über identische `adresse`.

### Vorhandene Patterns (Datei:Zeile — kopieren, nicht neu erfinden)

| Was | Quelle |
|---|---|
| Service-Query-Pattern (fetch + map + error→`[]`) | `src/services/queries/getCompanySocialMedia.ts` (Commit `a3279112`, gleiche Session) |
| Query mit Variable | `src/services/queries/getMenu.ts` |
| urql-Client (Build-Time, Basic Auth) | `src/services/wpGraphqlClient.ts` |
| Statische Seite mit Layout | `src/pages/wort-vorschlagen.astro` (Frontmatter: `const page = { title }`, `<Layout content={page}>`) |
| Layout-Props | `src/layouts/Layout.astro:12-19` — `content: { seo?: SeoProps; title: string }` |
| SEO-Props-Shape | `src/components/BaseHead.astro` (`SeoProps`-Export) |
| Copy-to-Clipboard | `src/components/word/WordOptionDropdown.vue` — nutzt VueUse `useClipboard` |
| Toast nach Copy | `createToastNotify` aus `@stores/toastNotify.ts` (direkt importieren, NICHT `@stores/index`) |
| Analytics | `trackEvent(category, action, label)` aus `@utils/analytics` |
| Icons | `defineAsyncComponent(() => import("virtual:icons/lucide/<name>"))` |
| Footer-Funding aktuell | `src/components/Footer.astro` — `fundingMenu` aus `package.json` `funding`-Feld |
| Service-Test-Pattern | `src/tests/unit/services/fetchApi.test.ts` |
| Astro-Render-Testhelper | `src/tests/unit/helpers/` — `createAstroRender()` in `beforeAll` mit **30 s Timeout** |

### Design-Vorgaben (aus `DESIGN.md` — vor UI-Arbeit erneut lesen)

- **Postcard Rule**: gestrichelte Linien als einzige wiederkehrende Signatur (Borders, Divider, Link-Unterstreichung)
- **Section-Cards**: weiß (light) / ink-tint (dark), 1px dashed grey Border, Radius `4px 4px 0 0`, **Paper Lift**-Schatten exakt `0 0.5px 0.6px rgb(0 0 0/8%), 0 4px 5px rgb(0 0 0/16%)` — kein eigener Schatten
- **Buttons**: eckig (0 radius), Hover = Border solid→dashed + Orange-Glow
- **Badges**: Currywurst-200 Hintergrund, uppercase Label-Typo 0.7rem — perfekt für Chain-Badges
- **Farben**: Currywurst-Orange dominant; Berlin Red NICHT als Akzent verwenden; Gold sparsam
- **Typo**: Headings Berliner, Body Berlin (1px letter-spacing) — nie tauschen
- **Voice**: schnodderig + heimatlich, keine generische Spenden-Seiten-Neutralität
- **CSS**: BEMIT (`.c-donation-…`), SCSS-Datei `src/styles/components/_donation-page.scss`, geladen via `@use` im eigenen `<style lang="scss">`-Block (nicht scoped, nicht global)

### Allowed APIs (nur diese, alle verifiziert vorhanden)

- `graphql()` aus `@/gql` (Codegen-Tagged-Template)
- `wpGraphqlClient.query(Document, vars).toPromise()` aus `@services/wpGraphqlClient`
- `useClipboard` aus `@vueuse/core` (bereits projektweit in Nutzung)
- `createToastNotify` aus `@stores/toastNotify.ts`
- `trackEvent` aus `@utils/analytics`
- Sitemap: `@astrojs/sitemap` nimmt statische Seiten automatisch auf — nichts zu tun

### Anti-Patterns (NICHT tun)

- ❌ `@stores/index`-Barrel importieren (triggert `api/search/index.json`-Fetch)
- ❌ `<style scoped>` in Vue-Komponenten — BEMIT isoliert
- ❌ Eigenen Schatten/Radius erfinden — Paper Lift + 4px sind fix
- ❌ `navigator.clipboard` manuell wrappen — VueUse `useClipboard` existiert
- ❌ Relative Imports (`../../`) — immer Aliase (`@services/*`, `@components/*`, …)
- ❌ Felder im GraphQL-Query erfinden — nur `adresse`, `link`, `name` existieren (verifiziert)
- ❌ npm/yarn — nur pnpm

### Offene Entscheidungen (vor Phase 2 vom Menschen bestätigen lassen, Default in Klammern)

1. URL-Slug (**Default: `/spenden`**)
2. Footer-Funding-Sektion: nur CMS-Plattform-Links, oder zusätzlich Link zur neuen `/spenden`-Seite (**Default: Plattform-Links + „Alle Spendenwege"-Link auf `/spenden`**)
3. `funding` in `package.json` bleibt unangetastet (npm/GitHub-Standard) — Footer liest es nur nicht mehr

---

## Phase 1: Funding-Service + Codegen

**Was:** `src/services/queries/getCompanyFunding.ts` — 1:1 nach dem Muster von `getCompanySocialMedia.ts` kopieren und anpassen.

1. Query registrieren (exakt die Felder aus Phase 0, Operation-Name `CompanyFunding`):

   ```graphql
   query CompanyFunding {
     company {
       companyInformations {
         funding {
           adresse
           link
           name
         }
       }
     }
   }
   ```

2. Typen + Mapping exportieren:

   ```ts
   export interface FundingPlatform { link: string; name: string }
   export interface FundingWallet { address: string; chains: string[] }
   export interface FundingData { platforms: FundingPlatform[]; wallets: FundingWallet[] }
   ```

   - `platforms`: Einträge mit `link !== null`
   - `wallets`: Einträge mit `adresse !== null`, **gruppiert nach identischer `adresse`** (`chains` = alle `name`s dieser Adresse, CMS-Reihenfolge erhalten)
   - Fehlerfall: `console.error` + `{ platforms: [], wallets: [] }` (Pattern aus `getAffiliate.ts:22-25`)

3. `pnpm gql:generate` ausführen (braucht Infisical-Login) → `CompanyFundingDocument` entsteht in `src/gql/graphql.ts`.

**Verifikation:**
- [ ] Serena-Diagnostics auf der neuen Datei: leer
- [ ] Live-Test (Muster aus dieser Session):
  `npx infisical run -- node -e "<fetch gegen WP_API mit query CompanyFunding>"` → 15 Einträge
- [ ] `grep -n "CompanyFundingDocument" src/gql/graphql.ts` → Treffer

**Anti-Pattern-Guards:** keine zusätzlichen Query-Felder erfinden; kein eigener urql-Client — `wpGraphqlClient` importieren.

---

## Phase 2: Seite `/spenden` + Wallet-Island

**Was:**

1. **`src/pages/spenden.astro`** — Struktur von `wort-vorschlagen.astro` kopieren:
   - Frontmatter: `fetchFundingData()` aus Phase 1 aufrufen, `page = { title: "Spenden - Berliner Schnauze", seo: { description: … } }` (SeoProps-Shape aus `BaseHead.astro` übernehmen)
   - `<h1>` in Schnauze-Voice (z. B. „Haste mal nen Euro?") + kurzer Intro-Absatz: warum spenden, was es kostet (Hosting, Zeit), alles freiwillig
   - Sektion 1 „Plattformen": Links als Button-Liste (`.c-button`-Pattern, eckig, dashed Hover) — statisch in Astro, kein JS nötig
   - Sektion 2 „Krypto": Vue-Island `<DonationWallets client:visible wallets={wallets} />`
   - Beide Sektionen als Section-Cards (dashed Border, Paper Lift)

2. **`src/components/DonationWallets.vue`** (neu, `<script setup lang="ts">`):
   - Props: `wallets: FundingWallet[]`
   - Pro Wallet-Karte: Chain-Badges (Badge-Pattern aus DESIGN.md), gekürzte Adresse (`0x4A21…1eeE`, mittig ellipsiert), Copy-Button
   - Copy: `useClipboard` (Pattern aus `WordOptionDropdown.vue` kopieren) → bei Erfolg `createToastNotify` („Adresse kopiert, danke dir!") + `trackEvent("Donation", "copy-address", chainName)`
   - Icon: `virtual:icons/lucide/copy` bzw. `check` nach Copy, via `defineAsyncComponent`

3. **`src/styles/components/_donation-page.scss`** — BEMIT `.c-donation-…`; nur DESIGN.md-Bausteine (Section-Card, Badge, Button, Paper Lift, dashed Divider). Laden via `@use "@styles/components/donation-page"` im `<style>`-Block der beteiligten Komponenten.

4. **`src/components/Footer.astro`** — `fundingMenu` umstellen:
   - `fetchFundingData()` importieren, `fundingMenu = platforms.map(p => ({ link: p.link, title: p.name }))` + Eintrag `{ link: "/spenden", title: "Alle Spendenwege" }` (Entscheidung 2)
   - `package.json`-Import `funding` entfernen, falls sonst ungenutzt
   - `data-content-target={fundingMenu[0].link}` — Guard gegen leeres Array (`fundingMenu[0]?.link ?? "/spenden"`)

**Dokumentation-Referenzen:** `DESIGN.md` §5 (Components), `wort-vorschlagen.astro`, `WordOptionDropdown.vue`, `NavList.vue:28-32` (Item-Shape).

**Verifikation:**
- [ ] `astro dev --background` → `/spenden` rendert: 4 Plattform-Buttons, 4 Wallet-Karten (1× EVM mit 8 Badges, Bitcoin, Solana, Tron)
- [ ] Copy-Button kopiert korrekte volle Adresse (nicht die gekürzte Anzeige!) + Toast erscheint
- [ ] Footer zeigt CMS-Plattformen + „Alle Spendenwege"
- [ ] Dark Mode geprüft (Section-Card = ink-tint, Cream-Text)
- [ ] `npx astro check` → 0 errors

**Anti-Pattern-Guards:** kein `client:load` für die Wallets (unter dem Fold → `client:visible`); Adresse nie nur gekürzt ins Clipboard; keine Berlin-Red-Akzente; kein solid Border auf Cards.

---

## Phase 3: Tests

**Was:**

1. **`src/tests/unit/services/getCompanyFunding.test.ts`** — Muster von `fetchApi.test.ts`:
   - urql-Client mocken; Fixture = die 15 Live-Einträge aus Phase 0
   - Asserts: 4 platforms; 4 wallets; EVM-Wallet hat `chains.length === 8`; Fehlerfall → leere Arrays; `null`-Einträge werden gefiltert
2. **`src/tests/unit/components/DonationWallets.test.ts`**:
   - `@vue/test-utils` mount mit Props-Fixture
   - Asserts: Karten-Anzahl, Badge-Rendering, Copy-Klick ruft Clipboard mit **voller** Adresse, Toast-Store-Mock aufgerufen
   - Icons sind auto-gestubbt (`data-testid="icon-lucide-copy"`), kein `vi.mock` nötig
3. Optional: `spenden.astro`-Rendertest via `createAstroRender` (30 s Timeout in `beforeAll`) — nur wenn Service dafür mockbar; sonst weglassen (Seite ist dünn, Logik steckt in Service + Island).

**Verifikation:**
- [ ] `pnpm vitest run src/tests/unit/services/getCompanyFunding.test.ts` grün
- [ ] `pnpm vitest run src/tests/unit/components/DonationWallets.test.ts` grün

**Anti-Pattern-Guards:** `markRaw()` für Komponenten-Objekte in `ref()`; `config.global.stubs` statt `vi.mock` für async Components.

---

## Phase 4: Verifikation gesamt + Abschluss

1. [ ] `pnpm lint` sauber
2. [ ] `npx astro check` → 0 errors
3. [ ] `pnpm test:unit` komplett grün
4. [ ] `pnpm build:local` läuft durch; `pnpm server:preview` → `/spenden` im Prod-Build prüfen (inkl. Sitemap: `dist/sitemap-*.xml` enthält `/spenden`)
5. [ ] Grep-Checks gegen Anti-Patterns:
   - `grep -rn "from \"@stores/index\"" src/components/DonationWallets.vue` → leer
   - `grep -n "scoped" src/components/DonationWallets.vue` → leer
   - `grep -rn "box-shadow" src/styles/components/_donation-page.scss` → nur Paper-Lift-Wert
6. [ ] `graphify update .`
7. [ ] Commit: `feat(footer): donation page with CMS funding data` (oder Scope `donation`)

---

## Kontext für Ausführende

- Secrets via Infisical (`npx infisical login` einmalig); `pnpm gql:generate` und Live-Tests brauchen es
- Dev-Server für Agents: `astro dev --background` / `astro dev logs` / `astro dev stop`
- Verwandter Commit dieser Session: `a3279112` — Social-Links + Nav-Menüs bereits auf CMS umgestellt; dieselben Patterns gelten hier
