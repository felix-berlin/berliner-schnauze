import os
import sqlite3
import sys
import tempfile
import unittest
import zipfile

import genanki

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


if __name__ == "__main__":
    unittest.main()
