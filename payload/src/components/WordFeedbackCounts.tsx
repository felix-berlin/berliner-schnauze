import type { UIFieldServerProps } from "payload";

import { feedbackTotals } from "../lib/wordFeedback";

/** Sidebar block on a word: feedback totals and a link to the filtered list. Computed per render, stored nowhere. */
export default async function WordFeedbackCounts({ payload, id }: UIFieldServerProps) {
  const wordId = Number(id);
  if (!Number.isInteger(wordId) || wordId <= 0) return null;
  // A failing count must not take the whole word edit view down.
  const t = await feedbackTotals(payload, wordId).catch((error: unknown) => {
    payload.logger.error({
      err: error,
      msg: `[word-feedback] admin counts for word ${wordId} failed`,
    });
    return null;
  });
  if (!t)
    return (
      <div className="field-type">
        <p>Zählung nicht verfügbar.</p>
      </div>
    );
  return (
    <div className="field-type">
      <p>
        Jefällt ma {t.like} · Nee {t.dislike}
      </p>
      <p>
        Sag ick selbst {t.say} · Kenn ick {t.know} · Nie jehört {t.never}
      </p>
      <a href={`/admin/collections/word-feedback?where[word][equals]=${wordId}`}>
        Feedback ansehen
      </a>
    </div>
  );
}
