import type { UIFieldServerProps } from "payload";

import { feedbackTotals } from "../lib/wordFeedback";

/** Sidebar block on a word: feedback totals and a link to the filtered list. Computed per render, stored nowhere. */
export default async function WordFeedbackCounts({ payload, id }: UIFieldServerProps) {
  if (!id) return null;
  const t = await feedbackTotals(payload, Number(id));
  return (
    <div className="field-type">
      <p>Jefällt ma {t.like} · Nee {t.dislike}</p>
      <p>Sag ick selbst {t.say} · Kenn ick {t.know} · Nie jehört {t.never}</p>
      <a href={`/admin/collections/word-feedback?where[word][equals]=${id}`}>Feedback ansehen</a>
    </div>
  );
}
