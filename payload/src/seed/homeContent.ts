import { docPath } from "../lib/routes";
import { wordSlug } from "../lib/wordMatch";

/** Underlined word link like the mock's `<a href="#">`, pointed at the real word page. */
const w = (word: string) => `<a href="${docPath("words", wordSlug(word))}">${word}</a>`;

/**
 * Start page copy from the v20 mock (docs/design/startseite-v20), verbatim. `{count}` is replaced by the live word
 * count on the page. The mock's word links point at /wort/<slug>; links inside plain-text fields (intro, rules) are left out.
 */
export const HOME_INTRO =
  "Berlinerisch auf Hochdeutsch erklärt: über {count} Wörter und Redewendungen mit Bedeutung, Aussprache, Herkunft und Beispielsätzen. Von Atze bis Zicke, jeprüft und jesammelt mit der Community.";

/** Slugs of the "Probier mal" chips; the seed links only those that exist. */
export const HOME_TRY_WORD_SLUGS = ["schrippe", "stulle", "spaeti", "jwd"];

// TODO(startseite): the mock still says "Die Übersicht rechts zeigt ..."; neutral wording per design ruling #5.
export const HOME_KNOWLEDGE_HTML = `<p>Berlinerisch ist die Sprache der Berliner Straße, Kneipe und Küche: schnell, direkt und mit viel Witz. Wer „Icke“, „Schrippe“ oder „jwd“ hört, weiß sofort, wo er ist. Dieses Wörterbuch sammelt Berliner Wörter und Redewendungen, erklärt sie auf Hochdeutsch und zeigt, wie und wo sie heute noch gesprochen werden.</p>
<h3>Dialekt, Stadtsprache oder Metrolekt?</h3>
<p>Streng genommen ist Berlinerisch kein klassischer Dialekt, sondern eine Stadtsprache. Sprachwissenschaftler sprechen auch von einem Metrolekt: einer Sprachform, die in einer Großstadt entsteht und von dort ins Umland ausstrahlt. Deshalb hört man Berliner Merkmale auch in weiten Teilen Brandenburgs, während sich die Sprache in der Stadt selbst ständig weiterentwickelt.</p>
<h3>Woher kommt Berlinerisch?</h3>
<p>Ursprünglich sprach man in Berlin und der Mark Brandenburg Niederdeutsch. Im 16. Jahrhundert wechselten Verwaltung und Oberschicht zum Hochdeutschen. Im Alltag blieben aber niederdeutsche Spuren erhalten, etwa ${w("ick")}, ${w("wat")} und ${w("dit")}. Später kamen Wörter aus anderen Sprachen dazu: Hugenotten aus Frankreich brachten Ausdrücke wie ${w("Bulette")} und ${w("Budike")} mit, aus dem Jiddischen stammen Wörter wie ${w("Mischpoke")} und ${w("meschugge")}. Mit der Industrialisierung wuchs Berlin rasant, und mit den Zugezogenen kamen neue Wörter in die Stadt.</p>
<h3>So klingt Berlin</h3>
<p>Typisch sind ein paar Lautregeln, an denen man Berlinerisch sofort erkennt. Aus „ich“ wird ${w("ick")}, aus „gut“ wird ${w("jut")}, aus „auch“ wird ${w("ooch")} und aus „kein“ wird „keen“. Dazu kommt die Grammatik: Berliner unterscheiden oft nicht zwischen „mir“ und „mich“. Die Übersicht zeigt die wichtigsten Regeln mit Beispielen.</p>
<h3>Die Berliner Schnauze</h3>
<p>Zum Berlinerischen gehört eine Haltung: die ${w("Berliner Schnauze")}. Gemeint ist eine direkte, oft schlagfertige Art zu reden, die von außen schnell ruppig wirkt. Meist steckt aber Humor dahinter, oder wie man in Berlin sagt: Herz mit Schnauze.</p>
<h3>Berlinerisch heute</h3>
<p>Berlinerisch ist nicht ausgestorben, aber es verändert sich. Manche Wörter wie ${w("Kiez")} oder ${w("Späti")} kennt inzwischen ganz Deutschland, andere wie ${w("Muckefuck")} hört man kaum noch. Nach der Teilung der Stadt entwickelte sich der Gebrauch in Ost und West unterschiedlich, und das zeigt sich bis heute. Genau das wollen wir mit der Umfrage auf jeder Wortseite herausfinden: Welche Wörter sind noch im Einsatz, und wo?</p>`;

export const HOME_SOUND_RULES = [
  { standard: "ich", berlin: "ick", example: "ick hab’ ma", rule: "Endung -ch wird zu -k" },
  { standard: "g", berlin: "j", example: "jut, jejangen", rule: "am Wortanfang und bei ge-" },
  { standard: "das", berlin: "dit / det", example: "dit is’ ma ejal", rule: "auch wat statt was" },
  { standard: "au", berlin: "oo", example: "ooch, loofen, koofen", rule: "langes o statt au" },
  { standard: "ei", berlin: "ee", example: "keen, meen, Beene", rule: "langes e statt ei" },
  {
    standard: "mich",
    berlin: "mir",
    example: "Er hat mir jesehn",
    rule: "mir für Dativ und Akkusativ",
  },
];

export const HOME_FAQ = [
  {
    question: "Ist Berlinerisch ein Dialekt?",
    answerHtml:
      "<p>Im Alltag ja, in der Sprachwissenschaft eher nicht. Berlinerisch gilt als Stadtsprache oder Metrolekt: eine Sprachform, die in der Großstadt entstanden ist und ins Brandenburger Umland ausstrahlt.</p>",
  },
  {
    question: "Wo wird Berlinerisch gesprochen?",
    answerHtml:
      "<p>In Berlin und in vielen Teilen Brandenburgs. Wie stark, hängt vom Bezirk, vom Alter und von der Situation ab. Unsere Karte oben zeigt, wo Besucher des Wörterbuchs angeben, Berliner Wörter selbst zu benutzen.</p>",
  },
  {
    question: "Woran erkennt man Berlinerisch?",
    answerHtml:
      "<p>An Lautregeln wie ick statt ich, jut statt gut, ooch statt auch und keen statt kein, an Wörtern wie Schrippe, Stulle oder Kiez und an der direkten, schlagfertigen Art, der Berliner Schnauze.</p>",
  },
  {
    question: "Was bedeutet „Berliner Schnauze“?",
    answerHtml:
      "<p>So nennt man die direkte, oft ruppig wirkende, aber meist humorvolle Art, wie Berliner reden. Der Ausdruck „Herz mit Schnauze“ fasst es zusammen: frech im Ton, freundlich gemeint.</p>",
  },
  {
    question: "Wie sagt man „ich“ auf Berlinerisch?",
    answerHtml:
      "<p>„Ick“ oder „icke“. „Icke“ steht oft allein oder betont, zum Beispiel in „Wer war dit? Icke!“.</p>",
  },
  {
    question: "Woher kommen die Wörter in diesem Wörterbuch?",
    answerHtml:
      "<p>Aus Wörterbüchern, Literatur und Zeitungsarchiven, und von der Community. Jeder Vorschlag wird vor der Veröffentlichung redaktionell geprüft. Quellen stehen auf der jeweiligen Wortseite.</p>",
  },
];

export const HOME_ABOUT_TEXT =
  "Berliner Schnauze ist ein unabhängiges Wörterbuch für Berlinerisch. Jeder Eintrag wird vor der Veröffentlichung geprüft, Quellen stehen auf der Wortseite. Vorschläge aus der Community sind gekennzeichnet.";

// TODO(startseite): no real targets exist yet: /suche only reads `q` (no audio, idiom, length or rhyme filter) and
// there is no random-word route, so every chip links to /suche until those filters/route land.
export const HOME_BROWSE_LINKS = [
  { label: "Mit Hörprobe", href: "/suche", icon: "audio" },
  { label: "Redewendungen", href: "/suche", icon: "idiom" },
  { label: "Kurz und knackig", href: "/suche", icon: "short" },
  { label: "Wat reimt sich?", href: "/suche", icon: "rhyme" },
  { label: "Zufallswort", href: "/suche", icon: "random" },
] as const;

/** Speech bubble of a topic row (Themen.typischerSatz), by slug; the sentences are the mock's, matched to the nearest topic. */
export const HOME_TOPIC_SAYINGS: Record<string, string> = {
  "schimpfwoerter-beleidigungen": "Wat willste, Keule?",
  koerper: "Da kiekste, wa?",
  "redewendungen-sprueche": "Dit kost’ ma wieder Pinke!",
  stadtleben: "Ick wohn janz weit draußen. Jwd eben.",
  "spott-ironie": "Ne Molle und ’n Korn, Meester!",
  "essen-trinken": "Zwee Schrippen und ’ne Bulette, bitte!",
};
