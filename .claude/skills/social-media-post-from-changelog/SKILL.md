---
name: social-media-post-from-changelog
description: Use when converting a berliner-schnauze user changelog into social media posts. Invoke with args "brand" for Berliner Schnauze channels or "personal" for Felix's personal developer profiles. Triggers on requests like "mach einen Social-Media-Post", "schreib einen Post für Instagram", "Post für mein Profil".
---

# Social-Media-Post aus User-Changelog

## Parameter

Beim Aufruf `args` übergeben — zwei Modi:

| Arg | Modus |
|---|---|
| `brand` | Berliner Schnauze Kanäle — App spricht zu ihren Nutzern |
| `personal` | Felix' persönliche Profile — Entwickler spricht zur Dev-Community |

Kein Arg angegeben? Nachfragen.

## Quelle

User-Changelog lesen: `docs/user-changelog/v{VERSION}.md`  
Version aus dem Dateinamen oder Kontext entnehmen.

## Plattform-Gruppen

Plattformen sind nach Format gruppiert — ein Template pro Gruppe:

| Gruppe | Plattformen | Limit |
|---|---|---|
| **Microblogging** | Twitter/X, Bluesky, Mastodon | 280 / 300 / 500 Zeichen |
| **Visual & Long-form** | Instagram, Facebook | Unbegrenzt, visuell-first |
| **Professional** | LinkedIn | Unbegrenzt, professionell |

Mastodon erlaubt mit 500 Zeichen etwas mehr Luft — optional einen Satz ergänzen. Sonst identisches Format innerhalb der Gruppe.

---

## Modus: `brand` — Berliner Schnauze

**Publikum:** App-Nutzer, Berlin-Fans, Dialekt-Interessierte  
**Stimme:** Die App kommuniziert — nicht Felix persönlich  
**Sprache:** Deutsch, gerne mit Berliner Flair. Emojis okay, sparsam.

### Instagram & Facebook

Gleicher Post, auf beiden verwendbar. Hashtags auf Facebook optional/kürzen.

```
[Hook — Hauptfeature in einer Zeile, Neugier wecken]

[2–4 Sätze was neu ist, aus Nutzersicht]

[Optional: kurzer Aufruf zum Ausprobieren + Link]

.
.
.
#BerlinerSchnauze #BerlinerDialekt #Berlin #Berlinisch #BerlinerSlang
```

### Twitter/X, Bluesky & Mastodon

Max. 280 Zeichen (auf Mastodon optional bis 500). Eine Kernaussage — kein Feature-Aufzählen.

```
[Feature in einem Satz] — [kurze Reaktion oder Kontext]. [Link]
```

---

## Modus: `personal` — Felix' Profile

**Publikum:** Developer-Community, Indie-Hacker, Tech-Interessierte  
**Stimme:** Felix, Ich-Form, locker und direkt  
**Sprache:** Denglish okay, dev-nah aber allgemeinverständlich

### Twitter/X, Bluesky & Mastodon

Ein Post oder kurzer Thread (max. 3):

```
Post 1: Shipped: [Was] — [eine Zeile warum interessant oder tricky]

Post 2 (optional): [Technisches Detail in Klartext]

Post 3 (optional): [Link zum Changelog oder zur App]
```

Mastodon: Post 1 + 2 lassen sich ggf. in einem einzigen Post zusammenfassen.

### LinkedIn

Länger, aber kein Essay. Strukturiert, trotzdem persönlich.

```
[Hook — was habe ich gebaut?]

[2–3 kurze Bullets: was steckt dahinter, was hat mich interessiert, was war nervig]

[Abschluss: was kommt als nächstes oder was ich dabei mitgenommen habe]

#WebDev #Astro #SideProject #IndieHacker
```

### Instagram & Facebook

Weniger relevant für personal/dev-Content — nur auf Nachfrage erstellen.

---

## Mapping: Changelog-Section → Post-Fokus

| Changelog-Section | brand | personal |
|---|---|---|
| Neues Feature | Was können Nutzer jetzt tun? | Was war technisch interessant? |
| Redesign | Wie fühlt sich die App an? | Was habe ich neu gebaut und warum? |
| Bugfixes | "Läuft jetzt viel smoother" | "Hat mich länger genervt als gedacht" |
| Hintergrund / Tech | Weglassen oder sehr kurz | Kurz erwähnen wenn relevant |

## Humanizer-Pass (vor der Ausgabe)

Jeden Post vor der Ausgabe einmal auf KI-Schreibmuster durchgehen. Warum: Social-Media-Feeds sind voll mit generierten Posts, die Muster sind dort noch verbrannter als anderswo. Ein Post, der nach LLM klingt, kostet genau die Glaubwürdigkeit, von der ein kleines Indie-Projekt lebt.

**Diese Muster rausschreiben:**

1. **Gedankenstriche (`—` und `–`) komplett vermeiden.** Das zuverlässigste Erkennungszeichen. Ersetzen durch Komma, Punkt, Doppelpunkt oder Klammern. Vor der Ausgabe per Suche prüfen: null Treffer. (Die Templates oben nutzen `—` nur als Platzhalter-Trenner, nicht als Vorgabe für den fertigen Text.)
2. **Keine Verkündungs-Floskeln.** "Stolz zu verkünden", "Ich freue mich, mitteilen zu dürfen", "Big news", "Exciting update". Einfach sagen, was neu ist. "Shipped: Themen-Filter" schlägt jede Fanfare.
3. **Kein LinkedIn-Broetry.** Nicht jede Zeile ein eigener Absatz. Keine Staccato-Dramatik ("Kein Plan. Keine Roadmap. Nur Code."). Normale Absätze mit normalen Sätzen.
4. **Kein Engagement-Bait als Abschluss.** "Was denkt ihr? Lasst es mich wissen! 👇" riecht nach Reichweiten-Optimierung. Wenn eine echte Frage da ist, stellen. Wenn nicht, einfach aufhören.
5. **Keine negativen Parallelismen.** "Nicht nur ein Update, sondern ein Statement" sagt nichts. Konkret bleiben: Was kann man jetzt tun?
6. **Emoji-Disziplin.** Kein Emoji vor jedem Bullet, kein 🚀 als Ausrufezeichen-Ersatz. Brand-Modus: höchstens ein bis zwei, wo sie inhaltlich tragen. Personal-Modus: im Zweifel keins.
7. **Keine erzwungenen Dreierreihen.** "Schneller, schöner, stabiler" klingt nach Waschmittel. Zwei konkrete Punkte schlagen drei generische.
8. **Werbe-Superlative dämpfen.** "Game-Changer", "revolutionär", "nahtlos", "auf ein neues Level" durch die konkrete Aussage ersetzen, die dahintersteckt.
9. **Kein Fake-Candid-Opener.** "Ehrlich?", "Real talk:", "Unpopular opinion:" als Theatereinstieg weglassen. Wer ehrlich ist, sagt einfach den Satz.

**Nicht wegbügeln (das ist Stimme, kein Muster):** Denglish ("shipped", "gebaut", "buggy"), Meinung und Genervtsein ("hat mich zwei Abende gekostet"), Berliner Flair im Brand-Modus, kurze Fragmente als bewusster Rhythmus. Ein Post darf Ecken haben. Glattpoliert fällt im Feed mehr auf als ruppig.

## Toncheck

- **brand:** Würde das ein Berlin-Fan gerne lesen? Klingt es nach der App, nicht nach dem Entwickler?
- **personal:** Klingt das wie Felix redet — direkt, locker, kein PR-Sprech?
- **beide:** Humanizer-Pass gelaufen? Suche nach `—`/`–` im fertigen Post: null Treffer
