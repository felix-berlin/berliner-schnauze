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
