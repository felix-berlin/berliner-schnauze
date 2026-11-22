# Footer v21 „Wort zum Abschied“ — Umsetzungsdesign

Stand: 2026-11-22 · Quelle: Handoff `footer-v21-handoff.zip` (SPEC.md, PROMPT.md, `.dc.html`-Boards). Die SPEC dort ist für Optik, Texte, Maße und Zustände verbindlich. Dieses Dokument legt fest, **wie** sie im Repo gebaut wird und wo sie davon abweicht.

## Intent

Der alte Footer (Bär-Foto, Fraktur-Satz, vier Linkspalten, orange Streifen) wird komplett ersetzt. Der neue Footer verabschiedet den Besucher mit Kalle und einem wechselnden „Wort für unterwegs“ (Schild), bietet knappe Orientierung (5 Links, Unterstützen, Über, Social) und die Pflichtangaben. Jede Seite endet so mit einem weiteren internen Link. Optional steht über dem Band ein Abschluss-Aufruf je nach Seite.

## Ziele / Nicht-Ziele / Anti-Ziele

- **Ziele:** Optik und Verhalten wie SPEC; ausschließlich Design-System-Tokens und `c-button`; Tests nach SPEC §14; barrierefrei (axe sauber, Ziele ≥ 44px mobil).
- **Nicht-Ziele:** Spiel-Aufruf (offen, `TODO(footer):`), Seite „So arbeite ick“, Umbau der Unterstützen-Seite, Wortzahl-Quelle neu bauen.
- **Anti-Ziele:** Eine zweite Kartensprache im Footer (das Schild ist die einzige Karte). „wir/uns/unser“, Emojis, Fraktur, Marken-Logos, Aussagen über Quellen. Laufzeit-API pro Klick.

## Entscheidungen des Nutzers

1. **Ansatz A:** `transition:persist` am Footer entfällt. Der Footer rendert bei jeder Navigation neu (neues Wort, Wort der Seite ausgeschlossen, Aufruf der Seite, Einblend-Animation läuft erneut).
2. **Die Seite ist nicht mehr statisch:** Die Wortliste (SPEC §5.3: rund 30 zufällige veröffentlichte Wörter) wird **pro Request auf dem Server** gezogen, nicht zur Build-Zeit. Keine API-Abfrage pro Klick: die Liste steht als Prop im HTML.
3. **Alles, was die SPEC nicht nennt, entfällt:** CarbonBadge, WakapiStats, „Hergestellt mit 🐻-Kräften“, App-Install-Sektion im Footer, CMS-Menüs `footer1`/`footer2` und das Funding-Menü aus dem CMS (Unterstützen führt nur auf `/spenden`), alter Bär, `o-footer-*`-Styles.
4. **Einstellungen-Link immer zeigen:** Link „Einstellungen“ → `/settings` in der Fußzeile, unabhängig vom Installationsstatus. (Ergänzung zur SPEC §7, ohne Mock; Position siehe Aufbau.)
5. **Design System zuerst:** Tokens wiederverwenden, neue nur wo nötig. Browser-Floor laut CLAUDE.md (Baseline widely available, Firefox ≥ 146), neuere Features nur als Progressive Enhancement mit Fallback.

## Ansätze (verworfen)

- **B – Persist behalten, Schild lädt nach `astro:page-load` neue Wörter per Endpunkt:** zusätzlicher Endpunkt, doppelte Logik, Aufruf müsste trotzdem außerhalb persistieren.
- **C – Hybrid (Band persistent, Schild/Aufruf nicht):** komplexer als B ohne Gewinn.

## Aufbau (Komponenten)

| Datei | Art | Aufgabe |
|---|---|---|
| `components/footer/SiteFooter.astro` | Astro | Band, drei Spalten, Fußzeile; Slot `aufruf` (benannt) erzeugt die Section darüber; entscheidet Schild ja/nein |
| `components/footer/FooterWordSign.vue` | Vue, `client:visible` | Schild; Prop `words` (Liste), „Noch eens“ (gemischt, ohne Wiederholung bis die Liste durch ist); `aria-live="polite"`; Klapp-Animation |
| `components/footer/FooterCalloutApp.vue` | Vue (Insel) | „Hol dir de Schnauze uffs Handy“ + „App installieren“, nur wenn installierbar (`$showInstallButton`) und nicht installiert |
| `components/footer/FooterCalloutAnki.astro` | Astro | „Na los, ab uff die Karten.“ + Kaufen-Button, aus `anki.astro` verschoben (Wortzahl/Preis live wie bisher) |
| `components/kalle/BerlinerBaer.vue` | vorhanden | `mood="wave"`, `size` 150 / 120, ohne `disc`, `aria-hidden` |
| `services/payload/footerWords.ts` | Service | `fetchFooterWords(excludeSlug?)`: mischt ~30 Wörter aus dem gecachten `fetchAllWords()` (nur Speicher) → `{slug, lemma, artikel/wortart, bedeutung, beispiel?}`, gekürzt auf das Nötige |
| `utils/footerWords.ts` | Util (rein, testbar) | mischen ohne Wiederholung, Seitenwort ausschließen, Bedeutung kürzen |
| `styles/layouts/_footer.scss` (ersetzt), `styles/components/_footer-word-sign.scss`, `_footer-callout.scss` | SCSS | nur Tokens |

`Layout.astro`: Slot `footer-farewell` wird zu `footer-aufruf` (Prop-/Slot-Weitergabe an `SiteFooter`); `Footer.astro`, `FooterAppSection.vue`, `WordPageFooter`-Anteile, `_footer-app-section.scss` und die alten Tests/E2E (`global-footer.spec.ts`, `FooterAppSection.test.ts`) werden entfernt bzw. ersetzt. Die Wortseite übergibt ihren Slug an den Footer (Ausschluss), alle anderen Seiten nichts.

Aufruf-Zuordnung (SPEC §4): Anki → Anki-Aufruf · Startseite → keiner · Spiel → `TODO(footer):` (vorerst keiner) · alle übrigen → App-Aufruf, wenn installierbar. Mit Aufruf entfällt das Schild, Abschied wie SPEC §5.2 (anderer Satz, Kalle rechts außen). Leere Wortliste verhält sich genauso.

Fußzeile (SPEC §7 + Entscheidung 4): „Ein Projekt von Webshaped / Felix Scholze“ · Version (aus `package.json`, → `/changelog`) · Impressum · Datenschutz · **Einstellungen** (→ `/settings`). Mobil zwei Zeilen wie SPEC §7 beschrieben, Einstellungen steht in Zeile 2.

Linkziele: Wort-Index `/wort`, Themen `/themen`, Berliner oder nich? `/games/berliner-oder-nicht`, Magazin `/magazin`, Wort vorschlagen `/wort-vorschlagen`, Unterstützen `/spenden`, Fehler melden GitHub-Issues (`…/issues/new`, aus dem bisherigen Menü), Social aus `fetchSocialMenu()` (GitHub, Mastodon, Bluesky, Facebook; `rel="me"` bleibt), „So arbeite ick“ entfällt (`TODO(footer):`). Wortzahl live aus dem Global „Startseite (Fakten)“.

## Tokens

Wiederverwenden: `--band-dark-bg`, `--band-text`, `--band-line`, `--color-orange-300/500/600/700`, `--color-focus-ring`, `--page`, `--color-body`, Fira-Fonts (bereits in `astro.config.mjs`), `c-button` (Varianten `primary`, `secondary`).
Neu (in `website/tokens/*.tokens.json`, dann `build-tokens`): `--band-text-strong` (#fff), `--band-text-quiet` (#a8b2bc), `--band-dot` (#5d6873) und eine kleine Gruppe `--sign-*` (Fläche #fff8f0, Text #2b333b, leise #5d6873, Beispiel #3d464f, Linie #e8dccd, Rand gestrichelt #b9ac9c, Hover-Fläche #f5e9da). Die Schild-Werte sind identisch zur Spielkarte der Startseite (`TODO(startseite)` in `_home-bon.scss`): ein Token-Satz, beide Stellen nutzen ihn. Namen und Aliase prüft der Bauende gegen `scripts/build-tokens.mjs` und `_legacy-aliases.scss`.

## Modern-Web-Vorgaben (aus den Guides)

- Band in beiden Themes dunkel: `color-scheme: only dark` auf dem `<footer>`, geerbte Farben (`color`, `accent-color`) dort neu setzen (`light-dark()` vererbt sonst nur einen Wert). Hintergrund ist gesetzt.
- Bewegung nur über `transform`/`opacity` bzw. einzelne Transform-Properties; Ausgangszustand statisch, Animation nur in `@media (prefers-reduced-motion: no-preference)`; Endzustand bleibt bei abgeschalteter Animation sichtbar. Kein `animation-duration: 0.01ms` global.
- Einblenden einmalig per IntersectionObserver (SPEC §9), nicht per `animation-timeline: view()` (scrubt mit der Scrollposition, Firefox erst ab 159).
- „Noch eens“: CSS-Animation (`rotateX`) per Klassen-Retrigger; keine Element-scoped View Transitions (nur Chromium).
- Keine `text-decoration-skip-spaces`; Striche sind Pseudo-Elemente.

## Offene Punkte der SPEC (so entschieden)

1. Spiel-Aufruf: kein Aufruf, `TODO(footer):` im Code.
2. Unterstützen-Seite: `/spenden` existiert (Plattformen + Wallets); Button zeigt dorthin, Unterzeile nennt „GitHub Sponsors, Ko-fi, PayPal oder Krypto“ wörtlich.
3. „So arbeite ick“: Link entfällt, `TODO(footer):`.

## Tests (SPEC §14)

Vitest: `utils/footerWords` (mischen ohne Wiederholung, Ausschluss, Kürzung), Slot-Logik (Aufruf ⇒ kein Schild, anderer Satz; leere Liste), Footer-Text ohne „wir/uns/unser“. Playwright: Screenshots 390/834/1280 × Dark/Light (neu gegen die Basis-Bilder aus dem Paket aufnehmen), „Noch eens“ wechselt das Wort und der Fokus bleibt, keine Höhenänderung, alle Links mobil ≥ 44px, kein Text < 13px, `reducedMotion: 'reduce'`. axe ohne Verstöße. Fixtures ohne echte Namen oder Texte aus der Produktions-DB.

## Dem Bauenden überlassen

Klassen- und Prop-Namen (BEM `c-footer-*`), SCSS-Aufteilung, genaue Token-Namen, `min-height` des Schilds (am längsten Eintrag gemessen, Wert aus den Fixtures), Kürzung auf 2 Zeilen per `line-clamp`, Position der Einstellungen in der Fußzeile auf Tablet/Desktop (dort einfach hinter Datenschutz).

## Meine Entscheidungen (zum Gegenlesen)

- Fehler melden → bisheriges GitHub-Issues-Ziel; Einstellungen hinter Datenschutz; Schild-Tokens mit der Spielkarte der Startseite zusammenlegen.
- **Cache:** kein eigener. `fetchFooterWords` zieht pro Request die Zufallsauswahl (~30) aus dem bereits gecachten `fetchAllWords` (`ttl(60_000)` mit Fingerprint) im Speicher: keine zusätzliche DB-Abfrage. Das fertige Ergebnis wird bewusst **nicht** gecacht, sonst sähen alle Besucher dieselben Wörter.
