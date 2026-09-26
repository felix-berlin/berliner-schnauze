# Anki-Decks (Lite + Full) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Python-Skript erzeugt aus den veröffentlichten WordPress-Wörtern `berlinerisch-full.apkg` und `berlinerisch-lite.apkg`, dazu eine Download-Seite auf der Website und eine AnkiWeb-Beschreibung.

**Architecture:** Ein Skript `scripts/build_anki_decks.py` mit kleinen reinen Funktionen (normalisieren, filtern, Lite auswählen, Karten bauen) plus `fetch_words()` und `main()`. Tests mit `unittest` (Standardbibliothek). Die Website bekommt eine schlanke Seite `src/pages/anki.astro`, die Lite-Datei liegt statisch in `public/downloads/`.

**Tech Stack:** Python 3.14, `genanki`, `unittest`, Astro 7 (nur die eine Seite), Infisical für `WP_API`/`WP_AUTH_*`.

**Spec:** `docs/superpowers/specs/2026-09-21-anki-decks-design.md`

## Global Constraints

- Nur Kartenrichtung Berlinerisch → Deutsch; keine Rückrichtung.
- Nur Einträge mit Status `PUBLISH` und mindestens einer nicht leeren Übersetzung.
- Felder `sources`/`quelle` und `infoText` erscheinen nicht auf den Karten.
- Ein Modell für beide Decks (feste Modell-ID), GUID pro Note = `genanki.guid_for(databaseId)`.
- Lite: pro Anfangsbuchstabe `max(1, ceil(10 %))` Wörter, mit **ganzzahliger** Rundung (`-(-n // 10)`), nicht mit `0.10 * n` (Fließkommafehler: `ceil(0.10 * 30)` ergibt 4).
- Lite-Karten tragen im Feld `Hinweis` den Verweis auf Full; Full-Karten lassen es leer.
- Ausgabe nach `dist-anki/` (gitignored). Kein AnkiWeb-Auto-Upload, kein CI, kein SDK für den Verkauf.
- Branch: `feat/anki-decks` von `main`, angelegt über `superpowers:using-git-worktrees`. Spec und Plan aus dem Ursprungs-Arbeitsverzeichnis in den ersten Commit übernehmen (sie liegen dort ungetrackt).

## Dateien

- Create: `scripts/build_anki_decks.py` — Logik, Fetch, CLI.
- Create: `scripts/test_build_anki_decks.py` — Tests.
- Create: `scripts/requirements-anki.txt` — `genanki`.
- Modify: `.gitignore` — `dist-anki/`, `.venv-anki/`.
- Create: `src/pages/anki.astro` — Download-Seite.
- Create: `public/downloads/berlinerisch-lite.apkg` — erzeugte Datei (committet).
- Create: `docs/anki/ankiweb-description.md` — Text zum Einfügen bei AnkiWeb.

---

### Task 1: Setup, Normalisieren, Filtern, Lite-Auswahl

**Files:**
- Create: `scripts/build_anki_decks.py`
- Create: `scripts/test_build_anki_decks.py`
- Create: `scripts/requirements-anki.txt`
- Modify: `.gitignore`

**Interfaces:**
- Produces (Wortform, ein `dict`): `{"id": int, "slug": str, "title": str, "article": str, "translations": list[str], "examples": list[tuple[str, str]], "alternatives": list[str]}`
- Produces: `clean(value) -> str`, `normalize_word(node: dict) -> dict`, `is_publishable(word: dict) -> bool`, `letter(title: str) -> str`, `score(word: dict) -> int`, `select_lite(words: list[dict]) -> list[dict]`

- [ ] **Step 1: Umgebung anlegen**

```bash
python3 -m venv .venv-anki
printf 'genanki\n' > scripts/requirements-anki.txt
.venv-anki/bin/pip install -r scripts/requirements-anki.txt
printf '\ndist-anki/\n.venv-anki/\n' >> .gitignore
.venv-anki/bin/python -c "import genanki; print(genanki.__name__)"
```
Expected: letzte Zeile `genanki`.

- [ ] **Step 2: Failing Tests schreiben** (`scripts/test_build_anki_decks.py`)

```python
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import build_anki_decks as b


def word(i, title, tr=("x",), ex=0, alt=0):
    return {
        "id": i,
        "slug": title.lower(),
        "title": title,
        "article": "",
        "translations": list(tr),
        "examples": [("e%d" % k, "") for k in range(ex)],
        "alternatives": ["a"] * alt,
    }


class NormalizeTests(unittest.TestCase):
    def test_clean_strips_html_and_entities(self):
        self.assertEqual(b.clean("<p>Ick &amp;  du</p>"), "Ick & du")

    def test_clean_handles_none_and_list(self):
        self.assertEqual(b.clean(None), "")
        self.assertEqual(b.clean(["der", "die"]), "der die")

    def test_normalize_word_maps_fields_and_drops_empty(self):
        node = {
            "databaseId": 7,
            "slug": "anmachen",
            "title": "anmachen",
            "wordProperties": {
                "berlinerisch": "anmachen",
                "article": None,
                "translations": [{"translation": "<b>anschalten</b>"}, {"translation": " "}],
                "examples": [{"example": "Mach ma det Licht an", "exampleExplanation": "Schalte das Licht ein"}, {"example": "", "exampleExplanation": "x"}],
                "alternativeWords": [{"alternativeWord": "anknipsen"}, {"alternativeWord": None}],
            },
        }
        w = b.normalize_word(node)
        self.assertEqual(w["id"], 7)
        self.assertEqual(w["translations"], ["anschalten"])
        self.assertEqual(w["examples"], [("Mach ma det Licht an", "Schalte das Licht ein")])
        self.assertEqual(w["alternatives"], ["anknipsen"])
        self.assertEqual(w["article"], "")

    def test_is_publishable_needs_title_and_translation(self):
        self.assertTrue(b.is_publishable(word(1, "wa")))
        self.assertFalse(b.is_publishable(word(2, "wa", tr=())))
        self.assertFalse(b.is_publishable(word(3, "", tr=("x",))))


class LiteTests(unittest.TestCase):
    def test_letter_folds_umlauts_and_falls_back(self):
        self.assertEqual(b.letter("Änne"), "A")
        self.assertEqual(b.letter("üben"), "U")
        self.assertEqual(b.letter("'ne"), "Sonstige")
        self.assertEqual(b.letter("3 Mark"), "Sonstige")

    def test_ten_percent_is_integer_ceil(self):
        thirty = [word(i, "a%02d" % i) for i in range(30)]
        self.assertEqual(len(b.select_lite(thirty)), 3)  # nicht 4
        eleven = [word(i, "b%02d" % i) for i in range(11)]
        self.assertEqual(len(b.select_lite(eleven)), 2)

    def test_at_least_one_per_letter(self):
        self.assertEqual(len(b.select_lite([word(1, "zack")])), 1)

    def test_best_scored_word_is_picked(self):
        words = [word(i, "c%02d" % i) for i in range(10)]
        words[7] = word(7, "c07", tr=("x", "y"), ex=2, alt=1)
        picked = b.select_lite(words)
        self.assertEqual([w["id"] for w in picked], [7])

    def test_selection_is_deterministic(self):
        words = [word(i, "d%02d" % i, ex=i % 3) for i in range(40)]
        self.assertEqual(b.select_lite(words), b.select_lite(list(reversed(words))))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Tests laufen lassen, Fehlschlag prüfen**

Run: `.venv-anki/bin/python scripts/test_build_anki_decks.py`
Expected: `ModuleNotFoundError: No module named 'build_anki_decks'`

- [ ] **Step 4: Minimale Implementierung** (`scripts/build_anki_decks.py`)

```python
#!/usr/bin/env python3
"""Baut die Anki-Decks (Lite + Full) aus den veröffentlichten WordPress-Wörtern.

Aufruf (Secrets über Infisical):
    npx infisical run -- .venv-anki/bin/python scripts/build_anki_decks.py
Optional: ANKI_FULL_URL (Standard: <SITE>/anki). Ausgabe: dist-anki/*.apkg
"""
import base64
import html
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict

import genanki

SITE = "https://berliner-schnauze.wtf"
OUT_DIR = "dist-anki"
FULL_DECK_ID = 1734921001
LITE_DECK_ID = 1734921002
MODEL_ID = 1734921003
UMLAUTS = {"ä": "a", "ö": "o", "ü": "u", "ß": "s"}


def clean(value):
    if isinstance(value, list):
        value = " ".join(str(v) for v in value)
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def normalize_word(node):
    p = node.get("wordProperties") or {}
    translations = [clean(x.get("translation")) for x in p.get("translations") or []]
    examples = [
        (clean(x.get("example")), clean(x.get("exampleExplanation")))
        for x in p.get("examples") or []
    ]
    alternatives = [clean(x.get("alternativeWord")) for x in p.get("alternativeWords") or []]
    return {
        "id": node["databaseId"],
        "slug": node["slug"],
        "title": clean(p.get("berlinerisch") or node.get("title")),
        "article": clean(p.get("article")),
        "translations": [t for t in translations if t],
        "examples": [e for e in examples if e[0]],
        "alternatives": [a for a in alternatives if a],
    }


def is_publishable(word):
    return bool(word["title"] and word["translations"])


def letter(title):
    ch = title.strip()[:1].lower()
    ch = UMLAUTS.get(ch, ch)
    return ch.upper() if len(ch) == 1 and "a" <= ch <= "z" else "Sonstige"


def score(word):
    return 2 * len(word["examples"]) + len(word["alternatives"]) + len(word["translations"]) - 1


def select_lite(words):
    groups = defaultdict(list)
    for w in words:
        groups[letter(w["title"])].append(w)
    picked = []
    for group in groups.values():
        group.sort(key=lambda w: (-score(w), w["title"].lower(), w["id"]))
        picked.extend(group[: max(1, -(-len(group) // 10))])  # ceil(10 %), ganzzahlig
    return sorted(picked, key=lambda w: (w["title"].lower(), w["id"]))
```

- [ ] **Step 5: Tests laufen lassen, Erfolg prüfen**

Run: `.venv-anki/bin/python scripts/test_build_anki_decks.py`
Expected: `OK` (9 Tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/build_anki_decks.py scripts/test_build_anki_decks.py scripts/requirements-anki.txt .gitignore docs/superpowers/specs/2026-09-21-anki-decks-design.md docs/superpowers/plans/2026-09-21-anki-decks.md
git commit -m "feat(anki): add word normalisation and lite selection"
```

---

### Task 2: Modell, Karten, Decks, Prüfungen

**Files:**
- Modify: `scripts/build_anki_decks.py` (unter die vorhandenen Funktionen anhängen)
- Modify: `scripts/test_build_anki_decks.py` (Klasse vor `if __name__` einfügen)

**Interfaces:**
- Consumes: `letter`, `select_lite`, `is_publishable`, Wortform aus Task 1.
- Produces: `MODEL` (`genanki.Model`), `note_fields(word, hint_html) -> list[str]`, `build_decks(words, full_url) -> tuple[genanki.Deck, genanki.Deck]` (Full, Lite), `check_decks(full, lite, words) -> None` (wirft `AssertionError`).

- [ ] **Step 1: Failing Tests schreiben** (in `scripts/test_build_anki_decks.py` ergänzen)

```python
import sqlite3
import tempfile
import zipfile

import genanki


def note_count(apkg_path):
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(apkg_path) as z:
            names = z.namelist()
            db = "collection.anki21" if "collection.anki21" in names else "collection.anki2"
            z.extract(db, tmp)
        con = sqlite3.connect(os.path.join(tmp, db))
        try:
            return con.execute("select count(*) from notes").fetchone()[0]
        finally:
            con.close()


class DeckTests(unittest.TestCase):
    def setUp(self):
        self.words = [word(i, "%s%02d" % (c, i), ex=i % 3) for c in "abc" for i in range(20)]
        # id-Kollisionen vermeiden: pro Buchstabe eigener Bereich
        for n, w in enumerate(self.words):
            w["id"] = 1000 + n
        self.words.append(word(9999, "leer", tr=()))
        self.full, self.lite = b.build_decks(self.words, "https://example.test/anki")

    def test_full_skips_words_without_translation(self):
        self.assertEqual(len(self.full.notes), 60)

    def test_lite_is_ten_percent_per_letter(self):
        self.assertEqual(len(self.lite.notes), 6)  # 3 Buchstaben * ceil(20/10)=2

    def test_guids_are_stable_and_shared(self):
        full_guids = {n.guid for n in self.full.notes}
        self.assertEqual(len(full_guids), 60)
        self.assertTrue({n.guid for n in self.lite.notes} <= full_guids)
        self.assertEqual(self.full.notes[0].guid, genanki.guid_for(self.words[0]["id"]))

    def test_hint_only_in_lite(self):
        self.assertTrue(all(n.fields[6] == "" for n in self.full.notes))
        self.assertTrue(all("https://example.test/anki" in n.fields[6] for n in self.lite.notes))

    def test_fields_escape_html_and_limit_examples(self):
        w = word(1, "x<y", tr=("a&b",), ex=3)
        f = b.note_fields(w, "")
        self.assertIn("a&amp;b", f[2])
        self.assertEqual(f[4], "")  # keine Alternativen
        self.assertEqual(f[3].count('class="ex"'), 2)
        self.assertIn("/wort/x&lt;y", f[5])

    def test_check_decks_detects_missing_letter(self):
        broken = genanki.Deck(1, "x")
        with self.assertRaises(AssertionError):
            b.check_decks(self.full, broken, self.words)

    def test_package_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "lite.apkg")
            genanki.Package(self.lite).write_to_file(path)
            self.assertEqual(note_count(path), 6)
```

(`self.words[0]` ist das alphabetisch erste Wort `a00`, und `build_decks` sortiert nach Titel.)

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `.venv-anki/bin/python scripts/test_build_anki_decks.py`
Expected: `AttributeError: module 'build_anki_decks' has no attribute 'build_decks'`

- [ ] **Step 3: Implementierung anhängen** (`scripts/build_anki_decks.py`)

```python
FIELDS = ["Berlinerisch", "Artikel", "Uebersetzungen", "Beispiele", "Alternativen", "Link", "Hinweis"]

CSS = """
.card { font-family: system-ui, sans-serif; font-size: 20px; text-align: center; color: #2b333b; background: #fff; }
.art { color: #cf5736; font-size: 0.8em; min-height: 1em; }
.word { font-size: 1.6em; font-weight: 700; border-bottom: 2px dashed #cf5736; display: inline-block; padding-bottom: 2px; }
ul { list-style: none; padding: 0; margin: 0.6em 0; }
.ex { margin: 0.8em 0 0; font-style: italic; }
.ex small { font-style: normal; color: #4e545a; }
.alt, .link, .hint { font-size: 0.75em; margin-top: 1em; color: #4e545a; }
.hint { border-top: 1px dashed #fad0b0; padding-top: 0.6em; }
@media (prefers-color-scheme: dark) { .card { background: #2b333b; color: #fcead7; } .ex small, .alt, .link, .hint { color: #fad0b0; } }
.nightMode .card { background: #2b333b; color: #fcead7; }
"""

MODEL = genanki.Model(
    MODEL_ID,
    "Berliner Schnauze Wort",
    fields=[{"name": n} for n in FIELDS],
    templates=[
        {
            "name": "Berlinerisch → Deutsch",
            "qfmt": '<div class="art">{{Artikel}}</div><div class="word">{{Berlinerisch}}</div>',
            "afmt": (
                "{{FrontSide}}<hr id=answer>{{Uebersetzungen}}{{Beispiele}}"
                '{{#Alternativen}}<div class="alt">{{Alternativen}}</div>{{/Alternativen}}'
                '<div class="link">{{Link}}</div>'
                '{{#Hinweis}}<div class="hint">{{Hinweis}}</div>{{/Hinweis}}'
            ),
        }
    ],
    css=CSS,
)


def note_fields(word, hint_html):
    esc = html.escape
    examples = "".join(
        '<p class="ex">%s<br><small>%s</small></p>' % (esc(ex), esc(expl))
        for ex, expl in word["examples"][:2]
    )
    alternatives = "Auch: " + esc(", ".join(word["alternatives"])) if word["alternatives"] else ""
    link = '<a href="%s/wort/%s">Mehr zu „%s“</a>' % (SITE, esc(word["slug"]), esc(word["title"]))
    return [
        esc(word["title"]),
        esc(word["article"]),
        "<ul>%s</ul>" % "".join("<li>%s</li>" % esc(t) for t in word["translations"]),
        examples,
        alternatives,
        link,
        hint_html,
    ]


def make_note(word, hint_html):
    return genanki.Note(
        model=MODEL,
        fields=note_fields(word, hint_html),
        guid=genanki.guid_for(word["id"]),
        tags=[letter(word["title"])],
    )


def build_decks(words, full_url):
    words = sorted((w for w in words if is_publishable(w)), key=lambda w: (w["title"].lower(), w["id"]))
    lite_ids = {w["id"] for w in select_lite(words)}
    hint = 'Lite-Version mit 10 % der Wörter. Alle Wörter: <a href="%s">%s</a>' % (
        html.escape(full_url),
        html.escape(full_url),
    )
    full = genanki.Deck(FULL_DECK_ID, "Berliner Schnauze Full")
    lite = genanki.Deck(LITE_DECK_ID, "Berliner Schnauze Lite")
    for w in words:
        full.add_note(make_note(w, ""))
        if w["id"] in lite_ids:
            lite.add_note(make_note(w, hint))
    check_decks(full, lite, words)
    return full, lite


def check_decks(full, lite, words):
    publishable = [w for w in words if is_publishable(w)]
    assert len(full.notes) == len(publishable), "Full: Kartenzahl weicht von den Wörtern ab"
    full_guids = [n.guid for n in full.notes]
    assert len(set(full_guids)) == len(full_guids), "doppelte GUIDs"
    assert {n.guid for n in lite.notes} <= set(full_guids), "Lite-GUID fehlt in Full"
    full_letters = {t for n in full.notes for t in n.tags}
    lite_letters = {t for n in lite.notes for t in n.tags}
    assert lite_letters == full_letters, "Buchstaben fehlen im Lite-Deck"
    assert len(lite.notes) <= len(full.notes) // 10 + len(full_letters), "Lite ist zu groß"
```

- [ ] **Step 4: Tests laufen lassen, Erfolg prüfen**

Run: `.venv-anki/bin/python scripts/test_build_anki_decks.py`
Expected: `OK`. Schlägt `test_package_roundtrip` fehl, weil die Datenbank im Paket anders heißt, den Dateinamen aus `zipfile.ZipFile(...).namelist()` ablesen und in `note_count` anpassen.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_anki_decks.py scripts/test_build_anki_decks.py
git commit -m "feat(anki): add note model, deck building and consistency checks"
```

---

### Task 3: Fetch aus WordPress, CLI, echter Lauf

**Files:**
- Modify: `scripts/build_anki_decks.py` (anhängen)

**Interfaces:**
- Consumes: `normalize_word`, `build_decks`, Konstanten `SITE`, `OUT_DIR`.
- Produces: `fetch_words() -> list[dict]` (rohe GraphQL-Knoten), `main() -> None`, Ausgabe `dist-anki/berlinerisch-full.apkg` und `dist-anki/berlinerisch-lite.apkg`.

- [ ] **Step 1: Implementierung anhängen**

```python
QUERY = """query($after:String){berlinerWords(first:100,after:$after,where:{stati:[PUBLISH],orderby:{field:TITLE,order:ASC}}){edges{node{databaseId slug title wordProperties{berlinerisch article translations{translation} examples{example exampleExplanation} alternativeWords{alternativeWord}}}} pageInfo{endCursor hasNextPage}}}"""


def fetch_words():
    auth = base64.b64encode(
        ("%s:%s" % (os.environ["WP_AUTH_USER"], os.environ["WP_AUTH_PASS"])).encode()
    ).decode()
    nodes, after = [], None
    while True:
        req = urllib.request.Request(
            os.environ["WP_API"],
            data=json.dumps({"query": QUERY, "variables": {"after": after}}).encode(),
            headers={"Content-Type": "application/json", "Authorization": "Basic " + auth},
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
        if data.get("errors"):
            sys.exit("GraphQL-Fehler: %s" % [e["message"][:80] for e in data["errors"]])
        page = data["data"]["berlinerWords"]
        nodes += [e["node"] for e in page["edges"]]
        if not page["pageInfo"]["hasNextPage"]:
            return nodes
        after = page["pageInfo"]["endCursor"]


def main():
    full_url = os.environ.get("ANKI_FULL_URL") or SITE + "/anki"
    words = [normalize_word(n) for n in fetch_words()]
    full, lite = build_decks(words, full_url)
    os.makedirs(OUT_DIR, exist_ok=True)
    for deck, name in ((full, "full"), (lite, "lite")):
        genanki.Package(deck).write_to_file("%s/berlinerisch-%s.apkg" % (OUT_DIR, name))
    print("Wörter gesamt %d, Full %d Karten, Lite %d Karten" % (len(words), len(full.notes), len(lite.notes)))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Bestehende Tests weiter grün**

Run: `.venv-anki/bin/python scripts/test_build_anki_decks.py`
Expected: `OK`. Das Anhängen von `if __name__ == "__main__": main()` darf den Testimport nicht auslösen.

- [ ] **Step 3: Echten Lauf machen**

Run: `npx infisical run -- .venv-anki/bin/python scripts/build_anki_decks.py`
Expected: eine Zeile `Wörter gesamt N, Full M Karten, Lite K Karten`. Es gilt `M ≤ N`, und `K` liegt etwa bei `M / 10` plus höchstens die Zahl der Buchstaben. Prüfe zusätzlich, dass `M` nicht die 28 Einträge ohne Übersetzung enthält (also `N - M ≥ 28`, falls sie veröffentlicht sind).

Falls der Fetch mit `KeyError: 'WP_AUTH_USER'` scheitert: Die Variablen heißen in Infisical so, wie sie `scripts/fetch-wp-words-for-scan.mjs` liest. Im Zweifel dort nachsehen und den Namen hier angleichen.

- [ ] **Step 4: Stichprobe der echten Daten**

Run:
```bash
.venv-anki/bin/python - <<'EOF'
import zipfile, sqlite3, tempfile, os
p = "dist-anki/berlinerisch-lite.apkg"
with tempfile.TemporaryDirectory() as t:
    z = zipfile.ZipFile(p); db = "collection.anki21" if "collection.anki21" in z.namelist() else "collection.anki2"
    z.extract(db, t); con = sqlite3.connect(os.path.join(t, db))
    for f, in con.execute("select flds from notes order by random() limit 3"):
        print(f.replace("\x1f", " | ")[:300]); print()
EOF
```
Expected: drei Karten mit sinnvollem Berlinerisch, Übersetzung(en), bei Lite ein Hinweis-Feld mit `https://berliner-schnauze.wtf/anki`. Wenn `Artikel` als seltsamer Wert erscheint (z. B. Array-Reste wie `['der']`), `article` in `normalize_word` gezielt anpassen und einen Test dafür ergänzen.

- [ ] **Step 5: Import in Anki prüfen (manuell, durch den Owner)**

1. `berlinerisch-lite.apkg` importieren, mehrere Karten ansehen (Vorderseite, Rückseite, Hell- und Dunkelmodus).
2. `berlinerisch-full.apkg` importieren. Erwartung: keine doppelten Karten, die Lite-Karten verlieren den Hinweis, die übrigen Wörter kommen dazu.

Falls der Owner Auffälligkeiten meldet, zurück in Task 2 (Template/CSS).

- [ ] **Step 6: Commit**

```bash
git add scripts/build_anki_decks.py
git commit -m "feat(anki): fetch published words and write lite and full apkg files"
```

---

### Task 4: Website-Seite und Lite-Download

**Files:**
- Create: `src/pages/anki.astro`
- Create: `public/downloads/berlinerisch-lite.apkg` (Kopie aus `dist-anki/`)
- Modify (nur prüfen): `astro.config.mjs` (PWA-Precache)

**Interfaces:**
- Consumes: `dist-anki/berlinerisch-lite.apkg` aus Task 3; `Layout` aus `@layouts/Layout.astro` mit `content={{ title }}` (wie `src/pages/wort-vorschlagen.astro`).
- Produces: Route `/anki`, Download unter `/downloads/berlinerisch-lite.apkg`.

- [ ] **Step 1: Precache prüfen**

Run: `grep -n "globPatterns\|globIgnores\|maximumFileSizeToCacheInBytes" astro.config.mjs`
Expected: `globPatterns` erwähnt keine `.apkg`-Endung. Steht dort ein Muster wie `**/*` , dann `downloads/**` in `globIgnores` aufnehmen.

- [ ] **Step 2: Datei bereitstellen**

```bash
mkdir -p public/downloads
cp dist-anki/berlinerisch-lite.apkg public/downloads/berlinerisch-lite.apkg
ls -l public/downloads/berlinerisch-lite.apkg
```
Expected: Größe deutlich unter 2 MB. Sonst zuerst den Precache-Ausschluss aus Schritt 1 sicherstellen.

- [ ] **Step 3: Seite schreiben** (`src/pages/anki.astro`)

```astro
---
import "@styles/components/_button.scss";
import Layout from "@layouts/Layout.astro";

const page = {
  title: "Berlinerisch lernen mit Anki - Berliner Schnauze",
};

// Polar-Checkout-Link, sobald das Produkt existiert. Solange leer, wird kein Kauf-Button gezeigt.
const FULL_CHECKOUT_URL = "";
---

<Layout content={page}>
  <h1>Berlinerisch lernen mit Anki</h1>

  <p>
    Die Wörter von Berliner Schnauze als Anki-Karten: Berlinerisch auf der Vorderseite, Übersetzung
    und Beispiele hinten.
  </p>

  <h2>Lite, kostenlos</h2>
  <p>
    Rund 10 % der Wörter, gleichmäßig über das Alphabet. Zum Reinschnuppern und zum Testen, ob dir
    die Karten liegen.
  </p>
  <p>
    <a class="c-button" href="/downloads/berlinerisch-lite.apkg" download>Lite-Deck herunterladen</a>
  </p>

  <h2>Full, alle Wörter</h2>
  <p>
    Das komplette Deck mit allen Wörtern. Bereits importierte Lite-Karten werden dabei aktualisiert,
    es entstehen keine Doppelten.
  </p>
  {
    FULL_CHECKOUT_URL ? (
      <p>
        <a class="c-button" href={FULL_CHECKOUT_URL} rel="noopener">
          Full-Deck kaufen
        </a>
      </p>
    ) : (
      <p>Kommt bald.</p>
    )
  }

  <p>Nur für den persönlichen Gebrauch. Weitergabe der Dateien ist nicht erlaubt.</p>
</Layout>
```

- [ ] **Step 4: Seite prüfen**

Eigenen Dev-Server starten (Port 4322, Toolbar aus, wie in CLAUDE.md):

```bash
NO_DEV_TOOLBAR=1 ASTRO_DEV_BACKGROUND=0 npx infisical run -- pnpm exec astro dev --ignore-lock --port 4322 &
sleep 20
curl -s http://localhost:4322/anki | grep -c "berlinerisch-lite.apkg"
curl -sI http://localhost:4322/downloads/berlinerisch-lite.apkg | head -1
```
Expected: `1` (oder mehr) und `HTTP/1.1 200 OK`. Danach den eigenen Server beenden (nicht den Dev-Server des Owners).

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: keine neuen Fehler in `src/pages/anki.astro`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/anki.astro public/downloads/berlinerisch-lite.apkg
git commit -m "feat(anki): add download page and lite deck"
```

---

### Task 5: AnkiWeb-Beschreibung und Übergabe

**Files:**
- Create: `docs/anki/ankiweb-description.md`

**Interfaces:**
- Consumes: Seite `/anki` aus Task 4, `dist-anki/berlinerisch-lite.apkg`.
- Produces: Text zum Einfügen bei AnkiWeb (Shared Decks).

- [ ] **Step 1: Beschreibung schreiben** (`docs/anki/ankiweb-description.md`)

```markdown
# AnkiWeb-Beschreibung (Lite)

**Titel:** Berliner Schnauze – Berlinerisch lernen (Lite)

**Beschreibung (HTML/Markdown, bei AnkiWeb einfügen):**

Berlinerisch → Deutsch: die Wörter und Redewendungen von berliner-schnauze.wtf als Karteikarten.
Vorderseite: das Berliner Wort. Rückseite: Übersetzung(en), Beispiele und Alternativen.

Das ist die kostenlose Lite-Version mit rund 10 % der Wörter, gleichmäßig über das Alphabet.
Alle Wörter gibt es im Full-Deck: https://berliner-schnauze.wtf/anki

Lizenz: Nur persönlicher Gebrauch (AnkiWeb Shared Deck License). Keine Weitergabe.

**Tags:** berlinerisch berlin dialekt deutsch

## Vor dem Upload

- Beim Teilen bestätigt AnkiWeb, dass der Inhalt „entirely your own work“ ist oder lizenziert wurde. Das ist deine persönliche Aussage; prüfe, dass sie für jeden Lite-Eintrag stimmt.
- Upload manuell: AnkiWeb → Shared Decks → Upload, Datei `dist-anki/berlinerisch-lite.apkg`.
- Nach Änderungen an den Wörtern: neu bauen und neu hochladen. Wegen der stabilen GUIDs werden Karten bei den Nutzer:innen aktualisiert.
- AnkiWeb entfernt Decks mit sehr wenigen Downloads nach 3 Monaten. Die Referenz ist die Website.
```

- [ ] **Step 2: Commit**

```bash
git add docs/anki/ankiweb-description.md
git commit -m "docs(anki): add AnkiWeb description and upload checklist"
```

- [ ] **Step 3: Übergabe an den Owner (keine Aktion des Agents)**

Offen beim Owner, in dieser Reihenfolge:
1. Polar-Produkt „Full“ anlegen, `dist-anki/berlinerisch-full.apkg` als Datei-Benefit hinterlegen.
2. Checkout-Link in `FULL_CHECKOUT_URL` in `src/pages/anki.astro` eintragen (Datei ist danach zu committen).
3. Lite bei AnkiWeb hochladen, nachdem die Eigenleistungs-Bestätigung geprüft ist.
4. Verkaufsseite und Steuerdaten bei Polar selbst prüfen (Gebühren und Umsatzsteuer nicht aus diesem Plan übernehmen).

---

## Selbstprüfung gegen den Spec

- Ziel, Festlegungen, Datenfluss → Task 1–3.
- Karte, Felder, `Hinweis` nur im Lite-Deck → Task 2.
- Lite-Auswahl (ganzzahlig, deterministisch, mindestens 1 je Buchstabe) → Task 1.
- Updates ohne Duplikate (feste IDs, `guid_for(databaseId)`, gleiches Modell) → Task 2, Import-Prüfung in Task 3.
- Website-Download und Precache-Prüfung → Task 4.
- AnkiWeb-Bedingungen und Upload → Task 5.
- Prüfung (Asserts, Import in Anki) → Task 2 und 3.
- Bewusst nicht enthalten: Rückrichtung, Bilder, Audio, `infoText`, CI, Auto-Upload, Webhook → kein Task, wie beabsichtigt.
