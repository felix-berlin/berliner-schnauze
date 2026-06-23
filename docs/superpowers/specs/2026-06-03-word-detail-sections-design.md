# Word Detail: Neue Sektionen

**Datum:** 2026-06-03  
**Branch:** feature/more-word-details  
**Scope:** Neue linguistische Detail-Sektionen auf der Wort-Detailseite, berechnet aus vorhandenen Daten — keine neuen WordPress Custom Fields.

---

## Übersicht

6 neue Astro-Komponenten ergänzen die Wort-Detailseite (`src/pages/wort/[...wordSlug].astro`) um linguistische und spielerische Informationen. Alle Berechnungen finden zur **Build-Zeit** statt — kein Client-JS, kein neues Backend.

---

## Neue Komponenten

Alle Komponenten unter `src/components/word/`.

### 1. `WordDecomposition.astro`

**Sektion:** Etymologie  
**Platzierung:** Nach dem "Selbe Bedeutung wie"-Block

Zerlegt ein Kompositum in seine Bestandteile. Sucht rekursiv im deutschen Standardwörterbuch nach der kürzesten sinnvollen Aufteilung.

- Bestandteile die im Berliner-Schnauze-Wortschatz vorkommen werden als Links dargestellt
- Sektion wird komplett ausgeblendet wenn: Wort kürzer als 5 Zeichen, kein Bruch gefunden, oder Wort selbst im Wörterbuch steht (kein Kompositum)
- Darstellung: Wort-Chips mit `+`-Trenner dazwischen

**Props:**

```typescript
interface Props {
  word: string;
  allWords: BerlinerWord[];
  germanWords: string[]; // injiziert vom Page-Script
}
```

---

### 2. `WordLetterFrequency.astro`

**Sektion:** Quantitative Linguistik  
**Platzierung:** Nach "Länge nach Buchstaben"

Zeigt für jeden einzigartigen Buchstaben des Worts seine Häufigkeit in der deutschen Sprache als Balkendiagramm.

- Balkenlänge relativ zum häufigsten deutschen Buchstaben (E = 17,22% = 100%)
- Vokale in Vokal-Farbe (`--orange-300` / `#cfc536` dark), Konsonanten in Konsonanten-Farbe (passend zur bestehenden Vokal/Konsonant-Darstellung)
- Label: Prozentzahl + Häufigkeits-Klasse (sehr häufig / häufig / gelegentlich / selten / sehr selten)
- Häufigkeitsdaten: statische Lookup-Tabelle (26 Buchstaben + Umlaute) im Utility-Modul — kein API-Call

**Props:**

```typescript
interface Props {
  word: string;
}
```

---

### 3. `WordCuriosities.astro`

**Sektion:** Quantitative Linguistik  
**Platzierung:** Nach `WordLetterFrequency`

Zeigt Fun-Facts zum Wort als Liste. Jede Eigenschaft wird mit ✓ (grün) oder ✗ (grau) markiert.

Berechnete Eigenschaften:

- Ist ein Palindrom
- Enthält alle deutschen Vokale (a, e, i, o, u, ä, ö, ü)
- Längste Konsonantenfolge (Anzahl + Buchstabenfolge)
- Beginnt mit Konsonant / endet mit Konsonant

Sektion wird ausgeblendet wenn das Wort kürzer als 5 Zeichen ist. Bei ≥ 5 Zeichen immer angezeigt.

**Props:**

```typescript
interface Props {
  word: string;
}
```

---

### 4. `WordSimilarSpelling.astro`

**Sektion:** Phonologie  
**Platzierung:** Nach "Ähnlich klingende Wörter" (SoundEx)

Zeigt Wörter aus dem Berliner-Schnauze-Wortschatz mit ähnlicher Buchstabenfolge via Jaro-Winkler-Distanz.

- Minimum Score: 0.85
- Maximum Treffer: 5
- Eigenes Wort wird aus der Liste gefiltert
- Darstellung: identisch zu "Ähnlich klingende Wörter" — einfache `<ul>` mit Links
- Sektion ausgeblendet wenn keine Treffer über dem Schwellenwert

Die Funktion `similarWords()` existiert bereits in `wordHelper.ts` — nur Schwellenwert-Filter und Limit ergänzen.

**Props:**

```typescript
interface Props {
  allWords: BerlinerWord[];
  currentWord: BerlinerWord;
}
```

---

### 5. `WordAnagrams.astro`

**Sektion:** Neue Sektion "Buchstabenspiele"  
**Platzierung:** Nach Phonologie, vor Alphabetisch blättern

Findet Wörter im Berliner-Schnauze-Wortschatz die dieselben Buchstaben enthalten (Permutationen).

- Vergleich: beide Wörter alphabetisch sortiert = gleich
- Eigenes Wort wird gefiltert
- Darstellung: `<ul>` mit Links
- **Gesamte Sektion "Buchstabenspiele" wird ausgeblendet wenn keine Anagramme gefunden** — keine leere Section

**Props:**

```typescript
interface Props {
  word: string;
  allWords: BerlinerWord[];
}
```

---

### 6. `WordAlphabetNav.astro`

**Sektion:** Neue Sektion "Alphabetisch blättern"  
**Platzierung:** Nach "Buchstabenspiele" (oder nach Phonologie), direkt vor `<footer>`

Zeigt je 3 alphabetische Nachbarn in beide Richtungen.

- Sortierung: case-insensitive alphabetisch nach `wordProperties.berlinerisch`
- Darstellung: zweispaltig — links "← Wörter davor", rechts "Wörter danach →"
- Alle Einträge als Links zur jeweiligen Wortseite

**Props:**

```typescript
interface Props {
  allWords: BerlinerWord[];
  currentWord: BerlinerWord;
}
```

---

## Neue Utility-Funktionen in `wordHelper.ts`

```typescript
// Zerlegt ein Kompositum in Bestandteile
decomposeCompoundWord(word: string, germanWords: Set<string>): string[] | null

// Buchstabenhäufigkeit-Daten für ein Wort
letterFrequency(word: string): Array<{char: string; percent: number; label: string; isVowel: boolean}>

// Fun-Facts zu einem Wort
wordCuriosities(word: string): {
  isPalindrome: boolean;
  hasAllVowels: boolean;
  longestConsonantRun: { length: number; chars: string };
  startsWithConsonant: boolean;
  endsWithConsonant: boolean;
}

// Anagramme im Wortschatz finden
findAnagrams(word: string, allWords: BerlinerWord[]): BerlinerWord[]

// Alphabetische Nachbarn
alphabeticNeighbors(
  allWords: BerlinerWord[],
  currentWord: BerlinerWord,
  n: number
): { before: BerlinerWord[]; after: BerlinerWord[] }

// similarWords() bereits vorhanden — nur Filter/Limit ergänzen
```

---

## Deutsches Wörterbuch (Wortzerlegung)

**Paket:** `an-array-of-german-words` (~18 MB installiert, ~640k Wörter)

- Import **nur im Page-Script** (`[...wordSlug].astro`), nicht in Client-Bundles
- Wird als `Set<string>` für O(1)-Lookup an `decomposeCompoundWord()` übergeben
- Astro rendert build-time → Paket landet nie im Browser-Bundle
- Fallback: falls Paket zu groß für CI/Build, gefilterte Top-50k-Wortliste als `src/data/german-words-top50k.json`

---

## SCSS

Keine neue SCSS-Datei. Alle neuen Komponenten verwenden die bestehenden Styles die via `.c-single-word h2`, `.c-single-word h3`, `.c-single-word ul li`, `.c-single-word a` bereits im Scope der Detailseite definiert sind.

Einzige Ausnahme: Die Balken für `WordLetterFrequency` brauchen minimales Inline-Styling oder eine kleine Erweiterung in `_single-word.scss` (ca. 15 Zeilen für `.c-single-word__letter-bar`).

---

## Integrationsreihenfolge im Page-Template

```astro
<!-- Etymologie -->
<section>
  <h2>Etymologie</h2>
  <!-- bestehend: alternativeWords, translations -->
  <WordDecomposition word={...} allWords={allWords} germanWords={germanWords} />
</section>

<!-- Quantitative Linguistik -->
<section>
  <h2>Quantitative Linguistik</h2>
  <!-- bestehend: consonants/vowels, letter count -->
  <WordLetterFrequency word={wordProps.berlinerisch} />
  <WordCuriosities word={wordProps.berlinerisch} />
</section>

<!-- Phonologie -->
<section>
  <h2>Phonologie</h2>
  <!-- bestehend: ähnlich klingende Wörter -->
  <WordSimilarSpelling allWords={allWords} currentWord={word} />
</section>

<!-- NEU: Buchstabenspiele (nur wenn Anagramme vorhanden) -->
<WordAnagrams word={wordProps.berlinerisch} allWords={allWords} />

<!-- NEU: Alphabetisch blättern -->
<WordAlphabetNav allWords={allWords} currentWord={word} />

<!-- bestehend: footer -->
```

---

## Testing

- Unit-Tests für alle neuen Utility-Funktionen in `src/tests/unit/utils/wordHelper.test.ts`
- Grenzfälle: leeres Wort, Wort nicht im Wortschatz, keine Anagramme, Palindrom, Wort am Anfang/Ende der alphabetischen Liste
- Komponenten-Tests: nicht zwingend für reine Astro-Komponenten (kein reaktiver State) — Logik-Tests auf Utility-Ebene ausreichend

---

## Offene Entscheidungen

Keine — alle wesentlichen Fragen sind im Brainstorming geklärt.
