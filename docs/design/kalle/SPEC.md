# Handoff: Kalle, der Berliner Bär

Stand 18.11.2026, Update 1 · Quelle: Design-Canvas, Seite „v3 · Bären-Maskottchen“, Board „Kalle · Berliner Bär“

**Änderungen in Update 1:** Die Schiebermütze der Stimmung `gangster` ist neu gezeichnet: gewölbte Haube mit drei Nähten und Knopf, eigenes Band, Schirm vorn über der Stirn. Betroffen sind `src/BerlinerBaer.vue`, `assets/kalle*.svg`, `assets/kalle.css`, `tools/kalle_svg.py`, `design/Kalle.dc.html` und `assets/kalle-alle-stimmungen.png`. API, Klassen und Tests sind unverändert, alle 14 Tests grün. Wer Update 0 schon eingebaut hat, ersetzt nur `BerlinerBaer.vue`.

## 1. Überblick

Kalle ist das Maskottchen von berliner-schnauze.wtf. Er ist an den Berliner Wappenbären angelehnt, steht frontal, hat rote Krallen und rote Zunge und spricht Berlinerisch. Er begleitet die Nutzer an Stellen, an denen die Seite sonst stumm wäre: leere Suche, keine Treffer, Laden, Fehler, Offline, Spiel-Feedback, Begrüßung.

**Warum:** Ein Wörterbuch hat viele Wartezustände und Sackgassen. Eine Figur, die dort reagiert, gibt der Seite Charakter, ohne Platz für Erklärtexte zu brauchen.

**Entscheidungen (fest):**

| Thema | Entscheidung |
|---|---|
| Figur | Der stehende Bär „Fassung 2“. Profil-Bär (Wappen-SVG) und Bär auf allen vieren sind verworfen. |
| Name | Kalle |
| Augenbrauen | Nur ab 200px Breite. Darunter strenge Lider wie bisher. |
| Zeigefinger | Gibt es nicht. Zeigen = offene Tatze, Pst! = Faust vor dem Maul. |
| Technik | Eine Vue-Komponente, inline-SVG, CSS-Animationen, kein GSAP, kein JavaScript für Bewegung. |

## 2. Dateien in diesem Paket

| Datei | Zweck |
|---|---|
| `src/BerlinerBaer.vue` | Die fertige Komponente. Generiert, nicht von Hand umbauen (§12). |
| `tests/BerlinerBaer.spec.ts`, `tests/ssr.spec.ts` | 14 Vitest-Tests, laufen grün mit Vue 3.5, Vitest 2, happy-dom. |
| `demo/Demo.vue`, `demo/demo.ts` | Alle Stimmungen und Größen, hell und dunkel. |
| `assets/kalle-alle-stimmungen.png` | Screenshot der Demo als Referenz. |
| `assets/kalle.svg`, `kalle-kopf.svg`, `kalle-lugen.svg`, `kalle.css` | Rohdaten ohne Vue, z. B. für OG-Bilder. `-ID` und `%ARIA%` sind Platzhalter. |
| `design/Kalle.dc.html` | Board aus dem Canvas: Bühne, 28 Stimmungen, Einsatz-Karten, Lugen. |
| `design/KalleBrauenExperiment.dc.html` | Vergleich ohne/mit Brauen, Grundlage der Entscheidung. |
| `tools/kalle_svg.py`, `tools/make_vue.py`, `tools/css_to_scss.py`, `tools/build.sh` | Generator. Ändert man Figur oder Bewegung, dann hier und mit `build.sh` neu erzeugen. `css_to_scss.py` übersetzt das Roh-CSS in das Design-System der Website. |

## 3. Komponente: API

```vue
<BerlinerBaer stimmung="nuescht" :groesse="160" label="Kalle zuckt mit den Schultern" />
```

| Prop | Typ | Standard | Wirkung |
|---|---|---|---|
| `mood` | `BearMood` (28 Werte, §5) | `'idle'` | Pose und Bewegung |
| `size` | `number` (px) | `200` | Breite. Höhe folgt aus dem Seitenverhältnis (voll ≈ 1,19 × Breite). |
| `variant` | `'auto' \| 'full' \| 'head' \| 'peek'` | `'auto'` | `auto`: unter 64px nur der Kopf |
| `disc` | `boolean` | `false` | Farbige Scheibe hinter dem Bären |
| `calm` | `boolean` | `size < 200` | Bewegung endet nach rund 6 s, bei Hover läuft sie wieder |
| `tappable` | `boolean` | `false` | Klick lässt ihn zucken, jeder 3. Klick: 2 s „Schnauze!“, dann zurück |
| `gazeX`, `gazeY` | `number` −1…1 | `0` | Blickrichtung für `mood="follow"`, wird auf −1…1 begrenzt |
| `label` | `string` | `''` | Gesetzt: `role="img"` + `aria-label`. Leer: `aria-hidden="true"` |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | `auto` folgt `[data-theme]` der Seite |

| Event / Methode | Wann |
|---|---|
| `@done(mood)` | 900 ms nach `enter`, 2000 ms nach `exit` |
| `tap()` (über `ref`) | Zucken auslösen, z. B. beim Absenden |
| `keystroke()` (über `ref`) | Ohrenzucken, z. B. bei jedem Tastendruck im Suchfeld |

Abgeleitet (nicht selbst setzen), Wurzel `c-berliner-baer`: `data-variant` trägt `brows` ab 200px, `small` unter 96px, `head` unter 64px, `peek`, `calm` wenn ruhig, `plain` ohne Scheibe, `dark`/`light` bei `theme`. `data-state` trägt die Stimmung plus `sw-a/b` beim Wechsel, `zuck-a/b` und `tipp-a/b` bei Reaktionen. Teile heißen klein und mit Bindestrich (`.arm-l`, `.prop-pils`).

## 4. Größenregeln

| Breite | Form | Was passiert | Warum |
|---|---|---|---|
| ≥ 200px | voll + Brauen | alle Details, Bewegung läuft dauerhaft | Großer Auftritt (Startseite, 404, leere Suche). Brauen sind erst hier lesbar. |
| 96–199px | voll | ohne Brauen, Bewegung endet nach ~6 s | Karten und Hinweise neben Text sollen nicht dauernd zappeln. |
| 64–95px | voll, vereinfacht | ohne Weste-Streifen, Knöpfe, Uhrkette, Rauch, Münze, Krümel, Bläschen, „Hick!“, Schallbögen, Denkpunkte | Diese Details werden unter 96px zu Flimmern. |
| < 64px | nur Kopf | Rumpf, Arme, Beine entfallen | Bei Icon-Größe ist nur das Gesicht lesbar. |

Mindestgröße für Ganove, Pils und Futtern: 64px. Darunter ist der Kopf ohne Requisit zu sehen. Für diese Stimmungen deshalb ab 96px einsetzen.

## 5. Stimmungen

Dauer = Länge einer Schleife. „einmal“ = läuft genau einmal und hält dann.

| Gruppe | `mood` | Bild | Dauer | Einsatz |
|---|---|---|---|---|
| Grundlagen | `idle` | Wappenpose, Arme hoch | 6,1 s | Bühne Startseite |
| | `relaxed` | Arme hängen, ein Knie entspannt | 8 s | Ruhezustand in Karten |
| | `enter` | springt von unten ins Bild, landet in den Knien | einmal 0,9 s | erstes Erscheinen |
| | `exit` | winkt, holt aus den Knien Schwung, taucht ab, danach unsichtbar | einmal 2 s | Hinweis schließen |
| | `follow` | Kopf und Pupillen folgen `gazeX/Y` | – | Bühne mit Mausverfolgung |
| Antworten | `wave` | | 0,6 s | Begrüßung |
| | `nod` | | 2,2 s | Ja / bestätigt |
| | `shake` | Kopfschütteln | 2,2 s | Nein / abgelehnt |
| | `thumbs-up` | Faust mit Daumen, Zwinkern | 1,4 s | gespeichert, Umfrage gesendet |
| | `point` | gestreckter Arm, offene Tatze | 1,2 s | Hinweis auf ein Ergebnis |
| | `dismiss` | | 1,5 s | 404, Abbrechen |
| | `shush` | Faust vor dem Maul, „Pst!“ | 1,6 s | Datenschutz, Cookies |
| Suche & Spiel | `look` | Tatze über den Augen | 4 s | Suche läuft |
| | `listen` | Tatze hinter dem Ohr, Schallbögen | 3 s | Hörprobe läuft |
| | `think` | Faust am Kinn, Denkpunkte | 3 s | längeres Laden |
| | `blank` | Schulterzucken, „?“ | 2,4 s | keine Treffer |
| | `cheer` | aus der Hocke hoch, Beine angezogen | 0,6 s hin und her | Spiel: richtig |
| | `facepalm` | Tatze über einem Auge | 3 s | Spiel: falsch |
| | `scare` | Sprung, große Augen, „!“ | einmal 2 s | Fehler |
| Leerlauf | `scratch` | | 0,28 s | Leerlauf-Variation |
| | `yawn` | Maul ohne Zähne, streckt sich | 4 s | lange Inaktivität |
| | `doze` | nickt weg, schreckt hoch | 5 s | lange Inaktivität |
| | `nap` | Augen zu, Z | 5 s | Offline, Wartung |
| Berlin | `roar` | brüllt, Zähne, Zittern | Zittern 8 Durchläufe, dann hält die Pose | Antippen (3.), Akzent |
| | `dance` | Knie im Wechsel, Maul zu | 1 s | Wochenende, Feier |
| | `eat` | beißt in eine Schrippe | 1,6 s | Thema Essen, Laden |
| | `beer` | schwankt, Flasche ohne Marke, „Hick!“ | 3,4 s | Thema Kneipe |
| | `gangster` | Schiebermütze, Zigarre, Weste, schnippt Münze | 1,1 s | Spiel-Teaser |

`idle` heißt in der Oberfläche „Ruhig“. Die Werte sind englisch und ASCII, damit sie als CSS-Klassen taugen.

## 6. Texte (Stimme)

Kalle duzt, spricht Berlinerisch, kurz, nie spöttisch gegenüber dem Nutzer. Anrede „Keule“. Die Texte stehen neben dem Bären, nicht in einer Sprechblase im SVG.

| Einsatz | Stimmung | Text |
|---|---|---|
| Begrüßung | `wave` | Na, Keule! Wat suchste? |
| Suche läuft | `look` | Ick kieke ma … |
| Keine Treffer | `blank` | Nüscht jefunden. Schlag ditt Wort doch vor! |
| Spiel richtig | `cheer` | Jenau richtig! |
| Spiel falsch | `facepalm` | Knapp vorbei is ooch daneben. |
| Gespeichert | `thumbs-up` | Jespeichert. Danke dir! |
| 404 | `dismiss` | Hier is nüscht. Ab zur Startseite? |
| Laden | `eat` oder `think` | Momentchen … |
| Offline | `nap` | Keen Netz? Ick wart so lange. |
| Datenschutz | `shush` | Bleibt unter uns. |

Längere Texte gehören in den normalen Fließtext daneben, nicht in Kalles Mund. Keine echten Namen oder Vorschlagstexte aus der Produktions-Datenbank in Beispielen.

## 7. Farben

Kalle nutzt eigene semantische Tokens `--color-mascot-<name>` (Quelle `website/tokens/semantic.*.tokens.json`), damit er auf jeder Fläche gleich aussieht. Die Komponente liest sie über private `--_<name>`. Die Seitenfarben kommen aus dem Design-System.

| Variable | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `color-mascot-ink` | `#2b333b` | `#14181c` | Fell |
| `color-mascot-ink2` | `#3a454f` | `#252d35` | Schnauze, Hinterseiten |
| `color-mascot-nose` | `#12161a` | `#000` | Nase, Maulstrich |
| `color-mascot-red` | `#f2391d` | gleich | Krallen, Zunge, Zeichen (Berlin-Rot) |
| `color-mascot-mouth` | `#7d170b` | gleich | Mundraum |
| `color-mascot-disc` | `#fad0b0` | `#566676` | Scheibe |
| `color-mascot-brow` | `#6f7d8a` | `#5c6975` | Augenbrauen |
| `color-mascot-edge` | – | `#a9b8c6` | Kontur im Dunkeln ohne Scheibe |
| `color-mascot-vest`, `-cap`, `-cap2` | `#4a5560`, `#8b6f4e`, `#69523a` | Weste `#2c353e` | Ganove |

Dunkel folgt `color-scheme` (Klasse `dark` am `html`, später auch Bänder mit `color-scheme: dark`) oder `theme="dark"`. Die helle Kontur gilt in allen Formen ohne Scheibe (voll, kopf, lugen); sie ist im Hellen transparent, der Filter bleibt dort aber aktiv (siehe §12).

**Gemessener Kontrast (WCAG, Nicht-Text-Kontrast mindestens 3:1):**

| Fläche | Fell | Kontur | Ergebnis |
|---|---|---|---|
| Hell, alle Flächen (`--color-background-body` … `--surface-callout`) | 11,0–12,8 : 1 | – | besteht |
| Dunkel, Seite und Karten | 1,5–1,9 : 1 | 4,6–6,0 : 1 | besteht nur dank Kontur |
| Scheibe hell / dunkel | 9,0 / 3,0 : 1 | – | besteht (dunkel knapp) |
| Brauen auf Fell | 3,0–3,2 : 1 | – | besteht |

**Regel:** Im Dunkeln ohne Scheibe muss die Kontur bleiben. Nicht entfernen, nicht dünner als 1,2px.

## 8. Bewegung

Die Bewegung läuft in Ebenen, damit sich nichts gegenseitig abschaltet:

| Ebene | Element | Bewegung | Dauer |
|---|---|---|---|
| Wechsel | `.pop` | federt beim Stimmungswechsel ein und hoch | 500 ms, `cubic-bezier(.3,1.3,.5,1)` |
| Reaktion | `.react`, `.earin`, `.nod`, `.wide` | Zucken, Ohrenzucken, Augen auf | 300–400 ms |
| Stimmung | `.all`, Arme, Beine, Kopf | Pose und Schleife aus §5 | siehe §5 |
| Atmen | `.breath` | immer | 4 s |
| Blinzeln | `.blink` | immer, unregelmäßig | 7 s, aus bei Gähnen, Einnicken, Pennen |
| Umsehen | `.glance` | Pupillen kurz links, rechts | 9 s, aus bei Nee, Kieken, Schreck, Schnauze!, Folgen |

Posen gleiten über `transition: transform .35s`, Requisiten blenden über `opacity .2s`. Beine knicken über drei Gelenke (Hüfte, Knie, Fuß), die Füße bleiben dabei am Boden.

## 9. Barrierefreiheit

- **Dekorativ oder Bild:** Ohne `label` ist Kalle `aria-hidden`. Die Information steht im Text daneben (§6). Nur wenn Kalle allein steht, z. B. als einziges Element einer 404-Seite, `label` setzen.
- **`prefers-reduced-motion: reduce`:** Alle Animationen und Übergänge aus, die Pose bleibt als Standbild. Lugen zeigt den Kopf statisch.
- **Zittern:** Schnauze! zittert maximal 8 Durchläufe (≈ 1–2,4 s), Schreck läuft genau einmal. Auch bei Hover nicht endlos.
- **Dauerbewegung:** Unter 200px endet die Bewegung nach rund 6 s (WCAG 2.2.2, Bewegung über 5 s muss anhaltbar sein).
- **Klickfläche:** `tappable` ist Spielerei, keine Funktion. Kalle ist nie der einzige Weg zu einer Aktion und bekommt keinen Fokus.
- **Kontrast:** §7.

## 10. Einbau in Astro

- **Insel:** `<BerlinerBaer client:visible … />`. Für rein statische Stellen ohne Reaktion reicht SSR ohne `client:*`, die CSS-Animationen laufen trotzdem.
- **Masken-IDs:** Die Fugen zwischen Arm und Körper sind eine SVG-Maske. Ihre ID entsteht erst nach dem Mounten über einen seitenweiten Zähler (`bv-1-m`, `bv-2-m` …). Grund: `useId()` vergibt pro Vue-App dieselben IDs, und jede Astro-Insel ist eine eigene App. Vor der Hydration fehlen nur die schmalen Fugen. Lugen braucht keine ID (verschachteltes SVG statt `clipPath`).
- **CSS:** Steht unscoped in der Komponente, wird einmal geladen. Alle Klassen beginnen mit `bv`.
- **Größe (gebaut, gzip):** CSS 7,8 KB, Komponente 4,6 KB JS zusätzlich zur Vue-Runtime (gemessen: Vue allein 25,5 KB, mit Kalle 30,1 KB).
- **Mehrere Instanzen:** unproblematisch, getestet mit 60 auf einer Seite.

## 11. Einsatzorte (Vorschlag, zu bestätigen)

| Ort | Stimmung | Größe |
|---|---|---|
| Startseite, Bühne | `idle` → beim ersten Besuch `enter` | 240–300px, `tappable` |
| Suche, Eingabe | `look`, `keystroke()` pro Taste | 96px |
| Suche ohne Treffer | `blank` | 160px |
| 404 | `dismiss` | 280px, `label` |
| Offline (PWA) | `nap` | 200px |
| Spiel „Berliner oder nicht?“ | `cheer` / `facepalm` | 120px |
| Vorschlag gesendet | `thumbs-up` | 120px |
| Wort des Tages | `variant="peek"` über der Karte | 150px |
| Cookie-Hinweis | `shush` | 72px |

## 12. Pflege

SVG und CSS sind generiert. Teile, Klassennamen und Drehpunkte hängen voneinander ab, Handänderungen gehen beim nächsten Erzeugen verloren.

```bash
sh docs/design/kalle/tools/build.sh   # erzeugt Komponente, _berliner-baer.scss und _berliner-baer-keyframes.scss in website/src und formatiert die SCSS
```

Intern: `kalle_svg.py` schreibt SVG und Roh-CSS, `css_to_scss.py` übersetzt das CSS in genau einen `mx.component("berliner-baer")`-Block (Wurzel `:scope`, Varianten als `data-variant`, Zustand als `data-state`, Farben über Tokens, alle Animationen in `feature("motion")`, Keyframes in der Utilities-Schicht), `make_vue.py` baut die Komponente.

**Bekannte Grenze:** `filter: drop-shadow` für die dunkle Kontur lässt sich nicht an `color-scheme` koppeln (`light-dark()` kennt nur Farben). Die Kontur ist im Hellen transparent, der Filter läuft trotzdem und rastert die Figur leicht anders. Ausweg wäre eine dritte `.dark`-Ausnahme im Design-System, wie bei `.c-select`.

Der Lauf erzeugt die Dateien Byte für Byte reproduzierbar.

## 13. Tests

```bash
npx vitest run tests/
```

Abgedeckt: Stimmung als Klasse, `aria-hidden` vs. `role="img"`, Brauen ab 200px, Kopf unter 64px, vereinfacht unter 96px, ruhig unter 200px, eindeutige Masken-IDs, Lugen ohne ID, Wechsel-Federn, Antippen inkl. Rückkehr nach 2 s, `keystroke()`, `@done`, Begrenzung von `gazeX/Y`, SSR ohne Masken-Verweis.

Nicht automatisch geprüft: wie flüssig die Bewegung wirkt. Das muss ein Mensch ansehen.

## 14. Offene Punkte

- **Einsatzorte (§11):** Vorschlag, nicht entschieden.
- **Pennen im Sitzen:** Er schläft im Stehen. Ein sitzender Körper wäre ein neuer Rumpf.
- **Denken:** Der Arm kreuzt etwas steif vor der Brust.
- **Kopfdrehung:** Der Kopf kippt nur, Schnauze und Augen verschieben sich nicht.
- **Name:** Markenrechtlich nicht geprüft.
- **Wappenbezug:** Kalle ist frei gezeichnet. Ob die Nähe zum Berliner Wappenbären rechtlich unbedenklich ist, wurde nicht geprüft.
