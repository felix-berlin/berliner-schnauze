# Cache leeren bei Änderungen aus Payload: Design

Stand: 2026-11-27. Betrifft `website/` und `payload/`. Kurzes Design (kleine Änderung, zwei zusammenhängende Teile).

## Intent

Nach dem Veröffentlichen einer Jeschichte fehlte sie auf `/wort/stinkadores`. Zwei Ursachen, beide gewollt zu beheben:

1. **Server:** Seiten-Cache (`previewAwareCache.ts`, 60 s + 300 s swr) und viele 60-s-`ttl`-Zwischenspeicher in `services/` halten alte Daten. Nichts leert sie bei einer Änderung, auch das Tag `words` wird nirgends invalidiert.
2. **Browser:** Vor dieser Änderung sendete die Wortseite `Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=86400` (`pages/wort/[...wordSlug].astro`). Chrome darf damit bis zu einen Tag die alte Seite zeigen, der Service Worker (`NetworkFirst`, Cache `pages`) kann sie ablegen. Bestätigt nur indirekt: nach „Website-Daten löschen“ war alles da. Der genaue Ablauf ist nicht nachgestellt. Die Header-Änderung unten (kein `stale-while-revalidate`, kein `s-maxage`) ist genau dieser Fix.

Ziel: Eine Änderung, die die öffentliche Seite verändert, ist nach wenigen Sekunden sichtbar, egal ob sie im CMS-Container oder im Web-Container passiert ist.

## Goals

- Jede relevante Änderung (anlegen, ändern, veröffentlichen, zurückziehen, löschen) leert **alles**: Seiten-Cache und alle `ttl`/`ttlBy`-Zwischenspeicher mit CMS-Daten, in jedem Web-Container. Zwischenspeicher ohne CMS-Daten (Startseiten-Statistik, GitHub, Polar, Wakapi) bleiben stehen: `ttl(…, { external: true })`.
- Der Browser hält die Wortseite höchstens 30 s und zeigt danach nie eine Stunden alte Version.

## Non-goals

- Kein gezieltes Leeren einzelner Seiten (Footer, Menü, Wortlisten stecken in jeder Seite; zu viele Abhängigkeiten).
- Keine Signale zwischen Containern über HTTP, Webhook oder `LISTEN/NOTIFY`.
- Kein Umbau des Service Workers, außer der Test zeigt, dass er Seiten länger hält als der Header erlaubt.

## Anti-Goals

- Hochfrequente Schreibzugriffe dürfen den Cache nicht dauernd leeren (er wäre nutzlos): Votes, Reaktionen, WordStats, WordFeedback, Bon-Spiele und -Spieler lösen nichts aus.
- Ein Fehler beim Stempel-Check darf keine Seite kaputt machen oder verlangsamen: Cache bleibt, Fehler wird geloggt. Ein Check, der hängt, bricht nach 10 s ab (zählt als Fehler), damit er nicht alle späteren Checks blockiert.

## Approaches

- **A, Webhook CMS → Website:** sofort, aber Geheimnis und interne URL im Komodo-Repo, Signal geht bei einem Rollout verloren, Web-eigene Änderungen brauchen einen Zusatzweg.
- **B, Änderungsstempel in der Datenbank (gewählt):** Hooks (laufen in beiden Prozessen, gleiche Payload-Config) setzen eine Zeitmarke. Jeder Web-Container prüft sie höchstens alle 2 s und leert bei Änderung. Kein Geheimnis, kein Komodo-Eingriff, nichts geht verloren, mehrere Container funktionieren. Preis: bis 2 s Verzögerung und eine winzige Abfrage alle 2 s.
- **C, `LISTEN/NOTIFY`:** schneller, aber dauerhafte Extra-Verbindung samt Wiederverbinden; mehr Mechanik für wenige Sekunden Gewinn.

Gewählt B, auf Wunsch des Betreibers nach Abwägung von Sauberkeit und Robustheit.

## Design

**Stempel.** Ein Payload-Global (Arbeitsname `cache-stamp`) mit einem Feld `changedAt` (date). Neue Tabelle, daher eine Migration nach expand/contract (nur hinzufügen; Regeln in `.claude/rules/payload-migrations.md`). Zugriff `authenticated` plus Forbidden-Test in `payload/tests/access.test.ts`.

**Schreiben (`payload/`).** Ein Wrapper `withCacheStamp`, gebaut wie `withIndexNow` (`hooks/indexNow.ts`): hängt `afterChange` und `afterDelete` an die Collections und Globals, die die öffentliche Seite verändern (Allowlist, nicht Denylist). Der Hook setzt `changedAt = now` **in der Transaktion der Änderung** (`req` durchreichen), damit der Stempel erst mit dem Commit sichtbar wird; sonst könnte die Website vor dem Commit leeren und alte Daten neu cachen. Je Request wird nur einmal gestempelt (`req.context`, gesetzt nach dem erfolgreichen Schreiben). Kommentare stempeln nur, wenn ein veröffentlichter Kommentar erscheint, sich ändert oder verschwindet (etwa durch Meldungen ausgeblendet): zurückgehaltene Kommentare und die Zähler-Updates von Votes und Meldungen (`skipCommentHooks`) nicht. `redirects` (Plugin-Collection) bekommt die Hooks über `overrides`. Eine Zeit-Entprellung geht in einer Transaktion nicht. Der Stempel selbst löst keinen Hook aus (Schleife vermeiden).

**Lesen und Leeren (`website/`).**

- Ein kleiner Stempel-Checker liest `changedAt` (`depth: 0`, nur dieses Feld), höchstens alle 2 s. Die Anfrage, die den Check auslöst, wartet darauf, höchstens 250 ms (sonst bekäme der erste Besucher nach einer Änderung noch die alte Seite; im lokalen Test war das der Fall); nach den 250 ms läuft das Leeren eventuell noch, das Ausliefern der neuen Daten ist dann nur bestmöglich. Alle anderen Anfragen warten nicht. Ändert sich der Wert gegenüber dem zuletzt gesehenen, leert er; schlägt das Leeren fehl, wird es beim nächsten Intervall wiederholt. Ein Fehler wird höchstens einmal pro Minute geloggt (`read failed` oder `clear failed`), nach fünf Fehlern in Folge als Fehler.
- Aufgerufen aus `previewAwareCache.ts` (`onRequest`), also auch bei Cache-Treffern, die vor jedem Seitencode bedient werden.
- Leeren heißt: (a) Seiten-Cache: der Provider-Wrapper hängt jeder gerenderten Antwort das Tag `site` an (`Cache-Tag`-Header), ein `invalidate({ tags: "site" })` leert alles; die Seiten selbst bleiben unberührt; (b) `cache.ts` bekommt ein Register aller `ttl`/`ttlBy`-Instanzen (außer `external`) mit einem `clearAllMemos()`.
- Mein Entscheid: kein Sofort-Leeren im Container, in dem die Änderung passiert. Der Hook läuft im gemeinsamen Payload-Paket und kennt den Cache der Website nicht; für wenige Sekunden lohnt keine Brücke. Auch dort gilt der 2-s-Check.
- Der erste Check nach dem Start merkt sich den Wert nur, er leert nicht.

**Header (`website/`).** Jede HTML-Seite sendet `Cache-Control: public, max-age=30` (`PAGE_CACHE_CONTROL`, gesetzt von `setPageCache`; Fehlerseiten bleiben `no-store`; APIs, Sitemap und `llms.txt` behalten ihre `s-maxage`-Form). `stale-while-revalidate` und `s-maxage` entfallen: kein gemeinsamer Cache sitzt davor (Traefik cached nicht), und der Server-Cache arbeitet über `Astro.cache.set`. `max-age=30` bleibt, weil Prefetch in Firefox und Safari Cache-Header braucht (Commit 7b8434ef).

## Constraints

- Ein Web-Container hält 512 m RAM; der Stempel-Check darf nichts nennenswert Speicher oder Last kosten.
- Rolling Release: der alte `web` läuft kurz gegen das neue Schema. Das Global ist nur hinzugefügt, der alte Code ignoriert es.
- Previews (Cookie) umgehen den Cache weiterhin; daran ändert sich nichts.
- Code, Kommentare, Tests, Commits auf Englisch; nur UI-Texte Deutsch.

## Tests

- `ttl`/`ttlBy`: `clearAllMemos()` leert alle Instanzen außer `external`, der nächste Aufruf lädt neu; ein Refresh, der schon lief, schreibt nichts Altes zurück.
- Stempel-Checker: Throttle (höchstens eine Abfrage pro 2 s), Wechsel leert genau einmal, erster Check leert nicht, ein fehlgeschlagener oder hängender Read lässt den Cache stehen, Fehler tragen den Namen des Schritts.
- Provider: die Anfrage wird auch bei einer ablehnenden Prüfung bedient; ein End-to-End-Test mit echtem Poller prüft, dass nach einem Stempelwechsel der Seiten-Cache vor dem Ausliefern geleert ist.
- Allowlist: jede Collection und jedes Global der echten Config ist entweder in `STAMPED_*` oder in einer ausdrücklichen Nicht-öffentlich-Liste; jede gelistete trägt die Hooks.
- `withCacheStamp`: Allowlist greift; Votes, Reaktionen, WordStats, WordFeedback, Bon lösen nichts aus; mehrere Änderungen in einem Request stempeln einmal.
- Header: `setPageCache` sendet für HTML `public, max-age=30`, für Fehler `no-store`, für Nicht-HTML die alte Form; die Wortseite nutzt dieselbe Konstante.
- Migration läuft hoch und runter (`scripts/migration-upgrade-test.sh`).

## Dem Builder überlassen

- Dateinamen und Feinheiten, soweit sie nichts am Verhalten ändern.
- Ob der Service Worker nach dem Header-Fix noch etwas braucht: im Browser mit Playwright gegen einen lokalen Build prüfen, nur bei Befund anfassen.

## Entscheidungen

- Bis 2 s Verzögerung sind akzeptabel; `max-age=30` im Browser bleibt (wegen Prefetch).
- Allowlist statt Denylist (neue Collections leeren nichts, bis sie eingetragen sind): ein Test zwingt zu einer Entscheidung für jede Collection und jedes Global.
- Entschieden (Option B): `setPageCache` sendet für alle HTML-Seiten `public, max-age=30` statt `max-age=0, s-maxage=300, stale-while-revalidate=86400`.
