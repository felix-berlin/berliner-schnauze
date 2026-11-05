export type PulseKind = "audio" | "click" | "share" | "view";

const KEY = "bsw-pulse";
const berlinDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });
// Fallback for when localStorage is unavailable (private mode): dedupe for the page's lifetime.
const memory = new Set<string>();

type Stored = { day: string; seen: string[] };

const read = (day: string): string[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as Stored | null;
    return stored?.day === day && Array.isArray(stored.seen) ? stored.seen : [];
  } catch {
    return [];
  }
};

/** Reports a word view or interaction at most once per word, kind and Berlin day. Never throws. */
export const reportWord = (wordId: number, kind: PulseKind): void => {
  const day = berlinDay.format(new Date());
  const entry = `${wordId}:${kind}`;
  const seen = read(day);
  if (seen.includes(entry) || memory.has(`${day}:${entry}`)) return;

  void fetch("/api/word-pulse", {
    body: JSON.stringify({ kind, word: wordId }),
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  })
    .then((res) => {
      if (!res.ok) return;
      memory.add(`${day}:${entry}`);
      try {
        // Re-read: another tab or call may have added entries meanwhile. Other days are dropped.
        localStorage.setItem(KEY, JSON.stringify({ day, seen: [...read(day), entry] }));
      } catch {
        /* private mode */
      }
    })
    .catch(() => {});
};
