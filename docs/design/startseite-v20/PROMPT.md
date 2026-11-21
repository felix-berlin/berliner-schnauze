# Auftrag für Claude Code: Startseite v20 „Berliner Wörterbuch“

Setze die neue Startseite von berliner-schnauze.wtf um (Repo `felix-berlin/berliner-schnauze`, Astro + Vue + Payload). v20 **ersetzt** die Startseite v5 „farbig“ vollständig.

**Lies zuerst:**
1. `SPEC.md` ganz. Das ist der verbindliche Stand.
2. `design/HomeV20.dc.html` als Referenz für Aufbau, Texte und Maße. Props `size` (`desktop|tablet|mobile`), `theme`, `audio`, `suche`. Spätere CSS-Regeln im `<helmet>` überschreiben frühere.
3. `design/HomeStates20.dc.html` und `assets/v20/zustaende-*.jpg` für alle Zustände.
4. `assets/v20/*.jpg` als Sichtvergleich pro Breakpoint und Theme.
5. `ds/components-v3.md` und `ds/components/bundle.css`. Nutze vorhandene Klassen, statt neue zu erfinden.
6. Kalle: Komponente `BerlinerBaer.vue` aus dem Kalle-Handoff wiederverwenden, nicht neu bauen.

**Vorgehen:**
1. Prüfe, was im Repo schon existiert, und verwende es wieder:
   - Suche (Orama)
   - Wort des Tages
   - Umfrage „Sagste det noch?“ der Wortseite
   - BON-Endpunkte
   - Word Pulse
   - Global „Startseite (Fakten)“
   - PWA-Install-Logik
   - Anki-Decks
   - Schreibe kurz auf, was fehlt, bevor du baust.
2. Lege die Tokens aus SPEC §4 an: Palette v13, Datenfarben, Bänder. `--t3` Light ist **`#535e69`**, auch für die Wortseite. Seitenlokal mit `TODO(startseite):` für die Übernahme ins Design System.
3. Lade Fira Sans Extra Condensed aus `assets/fonts/` (600, 800, latin-ext 800 mit `unicode-range`).
4. Baue die Abschnitte in der Reihenfolge aus SPEC §2. Jeder Abschnitt braucht Dark und Light, alle drei Breakpoints (808 / 1000) und alle Leer-Fälle aus SPEC §13 und §19.
5. `WordSeal.vue` (SPEC §5.1) und `HomePoll.vue` (SPEC §6) so bauen, dass die Wortseite sie mitnutzen kann.
6. Karte: `assets/berlin-bezirke-punkte.json` + Werte aus einem aggregierten Endpunkt. Datenschutz-Regeln aus SPEC §11.3 sind verbindlich (`MIN_GROUP = 10`, nur Aggregate).
7. SEO (SPEC §14), Barrierefreiheit (§17), Animationen per IntersectionObserver und `prefers-reduced-motion` (§16).
8. Tests aus SPEC §21.

**Regeln:**
- Keine echten Namen, Kommentare, Stimmen oder Vorschlagstexte aus der Produktions-Datenbank in Tests, Fixtures oder Screenshots. Die Dev-Datenbank stammt aus einem Backup.
- Keine Emojis, nirgends.
- Orange nur für Handlung und Marke (SPEC §4.4). Datenfarben nur für Daten.
- Korrektur-Überschrift nur bei den vier Abschnitten aus SPEC §2.
- Kein Fraktur (`--font-display`) auf dieser Seite.
- Radius höchstens 4px (Ausnahmen in SPEC §4.6).
- Kein Text unter 13px.
- Hover-Inhalte nur unter `@media (hover: hover)`.
- Offene Punkte (SPEC §20) nicht selbst entscheiden: frag nach oder baue die genannte Zwischenlösung und markiere sie mit `TODO(startseite):`.
