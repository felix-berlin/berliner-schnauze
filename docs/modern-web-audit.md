# Modern-Web-Audit (2026-11-15)

Geprüft mit `modern-web-guidance legacy-scan` (`website/src`, `payload/src`) plus manuelle Stichproben in `website/src` (ohne Tests). Der Scan deckt nur ca. 20 % des Guide-Katalogs ab (35 Regeln, 33 Guides); alles andere ist Stichprobe, keine Vollprüfung.

## Ergebnis

**Das Repo ist auf modernem Stand. Keine Pflichtfunde.** `legacy-scan` meldet 0 Findings in `website/src` und `payload/src`. Die Stichproben bestätigen das, mit drei kleinen Optimierungen (unten).

## Scan

| Ziel                       | Findings                                              |
| -------------------------- | ----------------------------------------------------- |
| `website/src`              | 0                                                     |
| `payload/src`              | 0                                                     |
| `scripts/`, `docs/`, Tests | nicht gescannt (Tests werden vom Scanner ausgelassen) |

## Bereits modern umgesetzt

| Bereich                | Befund                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout                 | 29 `@container`-Regeln, 0 viewport-basierte `@media (min/max-width)`. Komponenten reagieren auf ihren Container.                                               |
| CSS-Struktur           | `@layer` in 68 Dateien, `:has()` in 8, `@scope` (`:scope`) in Komponenten, `@supports` für 4 Fallbacks.                                                        |
| Logische Eigenschaften | 119× logische Eigenschaften (`-inline`/`-block` bei margin, padding, inset), 0× physische `-left/-right`.                                                      |
| Theming                | `color-scheme: light/dark` in `_colors.scss`, `prefers-color-scheme`/`light-dark()` in 24 Dateien.                                                             |
| Dialoge                | `Modal.vue` und `Lightbox.vue` nutzen natives `<dialog>` + `showModal()`; `Modal.vue` setzt `closedby`.                                                        |
| Popover                | `directives/tooltip.ts` nutzt die Popover-API (`showPopover`).                                                                                                 |
| View Transitions       | `utils/viewTransition.ts` prüft `startViewTransition` und `prefers-reduced-motion`.                                                                            |
| Bilder                 | Alle `<img>` lazy oder gezielt `preload` mit `fetchpriority="high"` (`WordImages.astro`).                                                                      |
| Fokus                  | `:focus-visible` in 11 Dateien, kein `outline: none/0`.                                                                                                        |
| Dokument               | `<html lang="de">`, Viewport-Meta vorhanden.                                                                                                                   |
| Sicherheit             | `set:html` nur für JSON-LD und CMS-HTML (`contentHtml`, `excerpt`), kein `innerHTML` im Produktivcode.                                                         |
| JS                     | Kein `XMLHttpRequest`, kein `document.write`. Das einzige `var` steht in einem Inline-Script-String (`utils/bonFragment.ts`, Classic-Script im Head, bewusst). |
| Browser-Support        | `supportedBrowsers`-Script erzeugt die Liste (`browserslist-useragent-regexp`).                                                                                |

## Kleine Optimierungen (optional)

1. **Reduced Motion**: erledigt, kein Handlungsbedarf. `styles/base/_body.scss` hat einen globalen Reset für `animation`, `transition` und `scroll-behavior` (Feature `no-motion`), zusätzlich prüft `viewTransition.ts` die Einstellung. Die direkten Treffer waren nur ein Teil der Abdeckung. _(Korrigiert, erster Entwurf sah hier einen offenen Punkt.)_
2. **`Lightbox.vue`**: umgesetzt. Der handgeschriebene `@click.self`-Handler wurde durch `closedby="any"` ersetzt, wie in `Modal.vue`. Ohne Browser-Support bleiben Schließen-Button und Esc.
3. **`Modal.vue`**: umgesetzt. Das redundante `aria-modal="true"` ist entfernt (`showModal()` macht den Dialog bereits modal), der Unit-Test prüft jetzt das Fehlen.

## Nicht geprüft

- `scripts/`, Payload-Admin-UI (Next.js, von Payload vorgegeben), Docker/CI.
- Barrierefreiheit im Detail (Kontraste, Screenreader-Tests), Core Web Vitals (Messung am Live-System, nicht im Code).
- Die ca. 80 % des Guide-Katalogs ohne deterministische Scan-Regel (z. B. Formulare, Anchor Positioning, Scroll-driven Animations) nur über die Stichproben oben.
