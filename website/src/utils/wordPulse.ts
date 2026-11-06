export type PulseKind = "audio" | "click" | "share" | "view";

// Dedupe for this page load only (a double click, a re-render). Per day and visitor the server dedupes, so
// nothing is written to the browser's storage.
const sent = new Set<string>();
const inFlight = new Set<string>(); // a double click must not send two reports

/** Reports a word view or interaction at most once per word and kind while the page lives. Never throws. */
export const reportWord = (wordId: number, kind: PulseKind): void => {
  const id = `${wordId}:${kind}`;
  if (sent.has(id) || inFlight.has(id)) return;
  inFlight.add(id);

  // A synchronous throw (e.g. no fetch) must not escape either.
  void Promise.resolve()
    .then(() =>
      fetch("/api/word-pulse", {
        body: JSON.stringify({ kind, word: wordId }),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      }),
    )
    .then((res) => {
      if (!res.ok) {
        console.warn("[word-pulse] rejected", res.status, id);
        return;
      }
      sent.add(id);
    })
    .catch((error) => console.warn("[word-pulse] failed", error))
    .finally(() => inFlight.delete(id));
};
