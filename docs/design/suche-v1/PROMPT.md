# Auftrag für Claude Code: Suche v1

Baue die Suchseite von berliner-schnauze.wtf (Repo `felix-berlin/berliner-schnauze`, Astro + Vue + Payload) nach Suche v1 neu. Sie ersetzt die heutige Wortsuche mit Fraktur-Überschrift, linker Filterspalte und großen Karten.

**Lies zuerst:**
1. `SPEC.md` ganz. Das ist der verbindliche Stand.
2. `design/SucheV1.dc.html` (bzw. lesbarer: `design/generator-suchev1.py`) für Markup, Maße, Texte und Filterlogik.
3. `assets/boards/*.jpg` und `assets/zustaende/*.jpg` als Sichtvergleich.
4. Bereits vorhanden bzw. eigene Handoffs: Palette v13 und Fira (Startseite v20), Footer v21, Kalle (`BerlinerBaer.vue`), Lücken-Logik und Umfrage-Aggregat (Wortseite v18).

**Vorgehen:**
1. Bestandsaufnahme: Finde die heutige Suchseite, den Suchindex bzw. die Such-API, die Filter und die Tastatur-Navigation. Schreib kurz auf, was bleibt und was ersetzt wird. Zeig mir das, bevor du löschst.
2. Backend: Suche über Wort **und** Bedeutungen mit Rangfolge nach SPEC §6.2. Facetten für die Filter, Umfrage-Aggregat nach §13. URL-Parameter nach §7.4.
3. Frontend nach SPEC §2–§7 und §9–§12. Die erste Trefferseite wird per SSR gerendert, die Seite funktioniert also auch ohne JS.
4. Chrome-KI (SPEC §8) als eigene, dynamisch geladene Komponente. Ohne `LanguageModel` darf davon nichts im Bundle landen und nichts sichtbar sein. Teste mit einem Mock von `LanguageModel`.
5. Tests aus SPEC §17.

**Regeln:**
- Texte wörtlich aus der SPEC bzw. der `.dc.html`. Nie „wir/uns/unser/wa“, denn die Seite betreibt eine Einzelperson.
- Keine Emojis, kein Fraktur.
- Orange nur nach SPEC §4. Kein Text unter 13px.
- Die KI-Suche startet nur nach einem Klick oder `Shift+Enter`, nie automatisch.
- Keine echten Namen oder Texte aus der Produktions-Datenbank in Tests oder Fixtures. Die Dev-Datenbank ist ein Produktions-Backup.
- Offene Punkte (SPEC §16) nicht selbst entscheiden: frag mich oder setz `TODO(suche):`.
