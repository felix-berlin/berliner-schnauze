---
name: social-media-post-from-changelog
description: Use when converting a berliner-schnauze user changelog into social media posts. Invoke with args "brand" for Berliner Schnauze channels or "personal" for Felix's personal developer profiles. Triggers on requests like "mach einen Social-Media-Post", "schreib einen Post für Instagram", "Post für mein Profil".
---

# Social-Media-Post aus User-Changelog

## Parameter

Beim Aufruf `args` übergeben, zwei Modi:

| Arg | Modus |
|---|---|
| `brand` | Berliner Schnauze Kanäle. Die App spricht zu ihren Nutzern |
| `personal` | Felix' persönliche Profile. Entwickler spricht zur Dev-Community |

Kein Arg angegeben? Nachfragen.

## Quelle

User-Changelog lesen: `docs/user-changelog/v{VERSION}.md`
Version aus dem Dateinamen oder Kontext entnehmen. Sollen mehrere Versionen zusammengefasst werden, die relevanten lesen und auf die zwei, drei Sachen eindampfen, die ein Nutzer wirklich merkt. Kein Vollständigkeits-Wahn: Tooltip-Fixes und Footer-Kleinkram gehören nicht in einen Post.

---

## Die Stimme ist der ganze Job

Ein Post ohne Stimme fällt im Feed durch, egal wie sauber er ist. Der Humanizer-Pass ganz unten macht einen Post nicht *schlecht*, aber *gut* macht ihn erst die Haltung. Deshalb steht die Stimme hier oben und zuerst, und nicht die Liste der Verbote. Zieh dir vor dem Schreiben den passenden Modus rein und schreib aus der Haltung heraus, nicht aus der Vermeidung.

### Modus `brand`: die App redet, und zwar berlinerisch

Die App ist keine neutrale Wörterbuch-Firma, sie *ist* die Berliner Schnauze. Trocken, direkt, ein bisschen ruppig, aber warm. Sie prahlt nicht, sie stellt hin: "Is jetzt da. Kannste haben." Understatement schlägt Hype. Ein neues Feature wird nicht "gefeiert", es wird über'n Tresen geschoben wie 'ne Currywurst.

So klingt das:

- **Dialekt als Würze, nicht als Kostüm.** Ein paar Marker streuen (nu, ooch, dit, wa, kieken, ick, nüscht, jibt, bloß), nicht jedes Wort verballhornen. Muss lesbar bleiben, auch für Zujezogene. Faustregel: ein, zwei Marker pro Satz reichen, der Rest ist normales Deutsch mit berlinerischem *Rhythmus* (kurz, blunt, understated).
- **Kurze, blunt Sätze.** "Nu kannste ooch lesen." statt "Wir freuen uns, einen neuen Lesebereich vorzustellen."
- **Trockener Schluss statt Werbe-Aufruf.** "Kiek rin: [link]" statt "Jetzt entdecken!".
- **Warm, nicht anbiedernd.** Die App mag ihre Leute, muss aber nich drum betteln.
- **Kein "wir"/"uns"/"unser".** Hinter dem Projekt steht *eine* Person, kein Team, kein Verlag. Also nix vortäuschen: Die App redet in der Ich-Form ("ick", "ick trag's bloß zusammen") oder spricht dich direkt mit "du" an ("nu kannste") oder bleibt unpersönlich ("dit Magazin is da"). "Bei uns" wirkt harmlos, impliziert aber 'ne Redaktion, gibt's nicht.
- **Vertrauen bleibt echt.** Bei Herkunft, Quellen, Zahlen sachlich bleiben. Die Schnauze ist frech, aber sie lügt nicht und labert nix schön.

**So nicht** (sauber, aber austauschbar, kein Mensch hört da die Schnauze):

> Berliner Schnauze hat jetzt was zu lesen. Das Magazin ist online: Artikel zu Geschichte, Herkunft und Kuriositäten der Berliner Schnauze. Guck rein!

**So besser:**

> Nu kannste hier nich bloß Wörter nachkieken, sondern ooch lesen, wo die janze Schnauze herkommt. Dit Magazin is da: Jeschichten über olle Redewendungen, vajessene Berolinismen und warum der Berliner redet wie er redet.
>
> Kiek rin: berliner-schnauze.wtf/magazin

Noch zwei kurze zum Gefühl kriegen:

> Wörter suchen ging schon immer. Jetzt kannste ooch stöbern: jedet Wort hat sein Thema, und du klickst dich einfach durch, wonach dir grade is.

> Hunderte neue Wörter sind reinjewandert, alle mit Übersetzung und Herkunft. Der Berliner hat ja bekanntlich für allet 'n Wort, ick trag's hier bloß zusammen.

### Modus `personal`: Felix redet, dev zu dev

Ich-Form, denglish wo's passt, trocken. Was war tricky, was hat genervt, was war eigentlich 'ne dumme kleine Sache, die drei Abende gefressen hat. Kein PR, kein "excited to share". Ein Entwickler erzählt 'nem anderen beim Bier, was er gebaut hat und warum's mehr Arbeit war als gedacht.

So klingt das:

- **"Shipped:" / "Gebaut:"** als Einstieg, dann direkt zur Sache.
- **Ehrlich über den Aufwand.** "hat länger gedauert als gedacht", "wegen X, natürlich".
- **Ein konkretes technisches Detail in Klartext.** Kein Buzzword-Bingo, aber auch nicht verstecken, dass es Handwerk war.
- **Denglish ist Stimme, kein Fehler:** shipped, gebaut, buggy, tricky, refactored.

**So nicht:**

> Ich freue mich, das neue Magazin für Berliner Schnauze vorzustellen! Ein komplett neuer Content-Bereich mit vielen spannenden Features.

**So besser:**

> Shipped: 'n Magazin für Berliner Schnauze. WordPress-Blöcke einzeln in Astro-Komponenten übersetzt, statt alles durch einen generischen Prose-Wrapper zu jagen, damit Zitate und Bilder nich wie hingerotzt aussehen. Hat zwei Abende gefressen, war's aber wert.

---

## Plattform-Gruppen

Nach Format gruppiert, ein Format pro Gruppe:

| Gruppe | Plattformen | Limit |
|---|---|---|
| **Microblogging** | Twitter/X, Bluesky, Mastodon | 280 / 300 / 500 Zeichen |
| **Visual & Long-form** | Instagram, Facebook | Unbegrenzt, visuell-first |
| **Professional** | LinkedIn | Unbegrenzt, professionell |

Mastodon hat mit 500 Zeichen etwas mehr Luft, da darf optional ein Satz mehr rein. Sonst identisch innerhalb der Gruppe.

Die Blöcke unten sind *Gerüste*, keine Vorlagen zum Ausfüllen im Formular-Stil. Schreib den Post in der Stimme von oben und häng die Struktur locker dran. Wenn ein Gerüst und die Stimme sich beißen, gewinnt die Stimme.

---

## Modus: `brand`

**Publikum:** App-Nutzer, Berlin-Fans, Dialekt-Interessierte. Emojis okay, aber sparsam (ein, zwei wo sie inhaltlich tragen).

### Instagram & Facebook

Gleicher Post auf beiden. Hashtags auf Facebook optional/kürzen.

```
[Erste Zeile: dit neue Ding trocken hinstellen, in der Schnauze-Stimme]

[2 bis 4 Sätze, was ein Nutzer jetzt tun kann. Konkret, nicht werblich]

[Trockener Verweis + Link]

.
.
.
#BerlinerSchnauze #BerlinerDialekt #Berlin #Berlinisch #BerlinerSlang
```

### Twitter/X, Bluesky & Mastodon

Eine Kernaussage, kein Feature-Katalog. Bei mehreren Versionen: das größte Ding rauspicken, den Rest weglassen.

```
[Eine Sache, in der Schnauze-Stimme, mit trockenem Dreh]. [Link]
```

---

## Modus: `personal`

**Publikum:** Developer-Community, Indie-Hacker, Tech-Interessierte. Im Zweifel kein Emoji.

### Twitter/X, Bluesky & Mastodon

Ein Post oder kurzer Thread (max. 3):

```
Post 1: Shipped: [Was] + [eine Zeile warum interessant oder was genervt hat]

Post 2 (optional): [ein technisches Detail in Klartext]

Post 3 (optional): [Link zum Changelog oder zur App]
```

Mastodon: Post 1 + 2 passen oft in einen einzigen Post.

### LinkedIn

Länger, aber kein Essay. Strukturiert, trotzdem persönlich. Kein Broetry (nicht jede Zeile ein eigener Absatz).

```
[Einstieg: was hab ich gebaut, in einem normalen Satz]

[2 bis 3 kurze Punkte: was steckt dahinter, was war interessant, was war nervig]

[Abschluss: was kommt als nächstes, oder was ich mitgenommen hab]

#WebDev #Astro #SideProject #IndieHacker
```

### Instagram & Facebook

Für personal/dev-Content selten sinnvoll. Nur auf Nachfrage.

---

## Mapping: Changelog-Section → Post-Fokus

| Changelog-Section | brand | personal |
|---|---|---|
| Neues Feature | Was kann der Nutzer jetzt tun? | Was war technisch interessant? |
| Redesign | Wie fühlt sich die App jetzt an? | Was hab ich neu gebaut und warum? |
| Bugfixes | "Läuft jetzt runder" | "Hat mich länger genervt als gedacht" |
| Hintergrund / Tech | Weglassen oder sehr kurz | Kurz erwähnen wenn relevant |

---

## Humanizer-Pass (Endabnahme, nach dem Schreiben)

Das ist die Endkontrolle, nicht der Kern. Erst aus der Stimme heraus schreiben (oben), dann hier einmal die KI-Muster rauskehren. Warum überhaupt: Social-Feeds sind voll mit generierten Posts, die Muster sind da noch verbrannter als anderswo. Ein Post, der nach LLM klingt, kostet genau die Glaubwürdigkeit, von der ein kleines Indie-Projekt lebt.

1. **Gedankenstriche (`—` und `–`) komplett vermeiden.** Das zuverlässigste Erkennungszeichen. Ersetzen durch Komma, Punkt, Doppelpunkt oder Klammern. Vor der Ausgabe per Suche prüfen: null Treffer im fertigen Post.
2. **Keine Verkündungs-Floskeln.** "Stolz zu verkünden", "Ich freue mich, mitteilen zu dürfen", "Big news", "Exciting update". Einfach sagen, was neu ist.
3. **Kein LinkedIn-Broetry.** Nicht jede Zeile ein eigener Absatz, keine Staccato-Dramatik ("Kein Plan. Keine Roadmap. Nur Code."). Normale Absätze.
4. **Kein Engagement-Bait als Abschluss.** "Was denkt ihr? Lasst es mich wissen! 👇" riecht nach Reichweiten-Optimierung. Echte Frage? Stellen. Sonst einfach aufhören.
5. **Keine negativen Parallelismen.** "Nicht nur ein Update, sondern ein Statement" sagt nichts. Konkret bleiben.
6. **Emoji-Disziplin.** Kein Emoji vor jedem Bullet, kein 🚀 als Ausrufezeichen-Ersatz.
7. **Keine erzwungenen Dreierreihen.** "Schneller, schöner, stabiler" klingt nach Waschmittel. Zwei konkrete Punkte schlagen drei generische.
8. **Werbe-Superlative dämpfen.** "Game-Changer", "revolutionär", "nahtlos", "auf ein neues Level" durch die konkrete Aussage ersetzen, die dahintersteckt.
9. **Kein Fake-Candid-Opener.** "Ehrlich?", "Real talk:", "Unpopular opinion:" weglassen. Wer ehrlich ist, sagt einfach den Satz.

**Nicht wegbügeln** (das ist Stimme, kein Muster): berlinerischer Dialekt und Rhythmus im brand-Modus, Denglish im personal-Modus ("shipped", "gebaut", "buggy"), Meinung und Genervtsein ("hat mich zwei Abende gekostet"), kurze Fragmente als bewusster Rhythmus. Ein Post darf Ecken haben. Glattpoliert fällt im Feed mehr auf als ruppig. Der häufigste Fehler ist nicht zu viel Schnauze, sondern zu wenig.

## Toncheck

- **brand:** Hört man da die Schnauze, oder klingt's nach jeder anderen App? Würd's ein Berliner lesen und nicken?
- **personal:** Klingt das wie Felix beim Bier, direkt und trocken, oder wie PR?
- **beide:** Humanizer-Pass gelaufen? Suche nach `—`/`–` im fertigen Post: null Treffer.
