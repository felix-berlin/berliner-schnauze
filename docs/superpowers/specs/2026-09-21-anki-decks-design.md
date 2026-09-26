# Anki-Decks (Lite + Full) — Design

Stand: 2026-09-21

## Ziel

Zwei `.apkg`-Decks aus den Wörtern in WordPress:

- **Lite** (kostenlos): ca. 10 % der Wörter, gleichmäßig über das Alphabet. Veröffentlicht auf AnkiWeb (Shared Decks) und als Download auf der Website. Beide verweisen auf Full.
- **Full** (kostenpflichtig): alle Wörter mit Übersetzung. Verkauf über einen Drittanbieter-Checkout-Link, ohne SDK.

## Festlegungen

| Thema           | Entscheidung                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quellen         | Alles, was aktuell in WordPress veröffentlicht ist (Option B), ohne Einträge ohne Übersetzung. Felder `sources`/`quelle` erscheinen nicht auf den Karten.                          |
| Kartenrichtung  | Nur Berlinerisch → Deutsch. Rückrichtung ist bewusst nicht enthalten.                                                                                                              |
| Bibliothek      | `genanki` (Python), Skript `scripts/build_anki_decks.py` (Unterstriche wie `scan_schlobinski.py`, damit es importierbar ist).                                                       |
| Verkaufsplattform | Polar (Merchant of Record, teilbarer Checkout-Link, Datei als Benefit). Lemon Squeezy wäre gleichwertig, nur der Link ändert sich. Gebühren vor der Entscheidung selbst prüfen. |
| Website-Einbau  | Nur `<a href>` auf den Checkout-Link. Kein SDK, kein Webhook.                                                                                                                      |

## Datenfluss

1. Skript lädt per GraphQL (`WP_API`, Basic Auth wie `scripts/fetch-wp-words-for-scan.mjs`) alle `berlinerWords` mit Status `PUBLISH`.
   Felder: `databaseId`, `slug`, `title`, `wordProperties { berlinerisch, article, translations{translation}, examples{example exampleExplanation}, alternativeWords{alternativeWord} }`.
2. Filter: mindestens eine nicht leere Übersetzung. HTML wird aus den Feldern entfernt oder bleibt nur als einfache Auszeichnung erhalten (`<b>`, `<i>`).
3. Full = alle gefilterten Wörter. Lite = Auswahl nach Abschnitt „Lite-Auswahl“.
4. Ausgabe: `dist-anki/berlinerisch-full.apkg`, `dist-anki/berlinerisch-lite.apkg` (Verzeichnis in `.gitignore`).

## Karte

Ein Notiz-Modell, für beide Decks identisch (feste Modell-ID).

Felder: `Berlinerisch`, `Artikel`, `Uebersetzungen`, `Beispiele`, `Alternativen`, `Link`, `Hinweis`. Sortierfeld: `Berlinerisch`.

- **Vorderseite:** `Artikel` (falls vorhanden) und `Berlinerisch`.
- **Rückseite:** `Uebersetzungen` als Liste, dann `Beispiele` (höchstens zwei, mit Erklärung), `Alternativen`, dann `Link` auf `/wort/<slug>` der Website. Am Ende `Hinweis`, nur wenn gefüllt (`{{#Hinweis}}…{{/Hinweis}}`).
- `Hinweis` ist im Lite-Deck gefüllt („Lite-Version mit 10 % der Wörter. Alle Wörter: <URL>“), im Full-Deck leer. Die URL ist standardmäßig die Website-Seite `/anki`, nicht der Polar-Link: Sie bleibt stabil, auch wenn sich der Checkout-Link ändert, und bereits verteilte Decks müssen nicht neu gebaut werden. `ANKI_FULL_URL` überschreibt sie.
- Tags: Anfangsbuchstabe (`A`–`Z`, `Sonstige`).
- Styling: eigenes CSS im Modell, Farben nach `DESIGN.md` (Currywurst-Orange als Akzent, Navy-Tinte für Text). Erster Wurf darf schlicht sein.

## Lite-Auswahl

- Wörter nach Anfangsbuchstabe gruppieren, wie das `wordGroup` der Website: `Ä`, `Ö`, `Ü` sind eigene Buchstaben, alles außer `a–z` und `ä/ö/ü` landet in `Sonstige`.
- Pro Gruppe nach Vollständigkeit absteigend sortieren: `2 * Beispiele + Alternativwörter + (Übersetzungen - 1)`, bei Gleichstand nach Titel.
- Pro Gruppe `max(1, ceil(0.10 * n))` Wörter übernehmen.
- Deterministisch: gleiche Daten ergeben dieselbe Auswahl.

## Updates ohne Duplikate

- Feste Deck-IDs und feste Modell-ID als Konstanten im Skript.
- GUID pro Note: `genanki.guid_for(databaseId)`, unabhängig vom Text.
- Ein Wort hat in Lite und Full denselben GUID und dasselbe Modell. Wer Lite und danach Full importiert, bekommt die Lite-Karten aktualisiert (Hinweis verschwindet) und die übrigen Wörter dazu.

## Verteilung

**Website:** `public/downloads/berlinerisch-lite.apkg` plus Download-Button und Link zum Full-Checkout auf einer passenden Seite. Vor dem Einbau prüfen, dass der PWA-Precache (`maximumFileSizeToCacheInBytes` 2 MB) die Datei nicht mitnimmt.

**Full:** Produkt bei Polar anlegen, `berlinerisch-full.apkg` als Datei-Benefit hinterlegen, den Checkout-Link in `src/pages/anki.astro` (`FULL_CHECKOUT_URL`) eintragen. Solange er leer ist, zeigt die Seite „Kommt bald“. Der Owner legt das Produkt an.

**AnkiWeb:** Manueller Upload durch den Owner (keine API). Es wird eine fertige Beschreibung (Titel, Kurztext, Links) mitgeliefert.

## AnkiWeb-Bedingungen (gelesen am 2026-09-21, Stand der Bedingungen 2018-10-17)

Quelle: <https://ankiweb.net/account/terms>

- **Eigenleistung:** Beim Teilen muss man bestätigen, dass der Inhalt „entirely your own work“ ist oder lizenziert wurde. **Das betrifft jeden Wortinhalt aus WordPress mit fremdem Ursprung.** Vor dem AnkiWeb-Upload muss der Owner sicher sein, dass alle Lite-Einträge diese Aussage tragen. Für die Lite-Auswahl gilt die Festlegung B; die Bestätigung bleibt trotzdem seine persönliche Aussage.
- **Lizenz für Herunterladende:** Nur persönlicher Gebrauch, keine Weitergabe. Zusätzliche Rechte darf man in der Beschreibung einräumen, zusätzliche Einschränkungen sind nicht erlaubt.
- **Werbung:** Die Bedingungen verbieten Verweise auf ein Bezahlprodukt nicht ausdrücklich. AnkiWeb behält sich aber das Entfernen von Decks mit „poor quality descriptions or content“ nach eigenem Ermessen vor. Der Hinweis auf Full bleibt deshalb kurz und sachlich; das Deck muss als eigenständiges, brauchbares Lite-Deck funktionieren.
- **Auto-Löschung:** Shared Decks mit sehr wenigen Downloads werden nach 3 Monaten entfernt. Konten ohne Login werden nach 6 Monaten gelöscht. Die Website-Version ist deshalb die Referenz, AnkiWeb ist ein zusätzlicher Kanal.
- **Änderungsrecht:** AnkiWeb darf geteilte Decks verändern (z. B. Auszüge bilden).
- **Nur für alle nützlich:** Decks, die nur für eine kleine Gruppe taugen, dürfen entfernt werden. Ein Deck mit Berliner Dialekt ist davon nicht betroffen.

## Prüfung

Asserts am Ende des Skripts:

- Kartenzahl Full = Anzahl veröffentlichter Wörter mit Übersetzung.
- Kartenzahl Lite liegt bei 10 % ± Rundung pro Buchstabe (mindestens 1 je vorhandenem Buchstaben).
- Alle GUIDs sind eindeutig; jeder Lite-GUID kommt auch in Full vor.
- Jeder vorhandene Anfangsbuchstabe ist im Lite-Deck vertreten.

Manuell: Beide Dateien in Anki importieren, Karten stichprobenartig ansehen; danach zuerst Lite, dann Full importieren und prüfen, dass keine Duplikate entstehen und der Hinweis verschwindet.

## Bewusst nicht enthalten

Rückrichtung Deutsch → Berlinerisch, Bilder und Audio, `infoText` auf den Karten, CI-Build, automatischer AnkiWeb-Upload, Webhook oder Lizenzschlüssel für Full, Verkaufsbereich auf der Website über den Link hinaus.
