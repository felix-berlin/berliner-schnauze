// The stats metrics, shared by the query (server) and the charts (client): keep this file free of payload/drizzle imports.
export const METRICS = [
  "views",
  "audio",
  "shares",
  "clicks",
  "reactions",
  "comments",
  "suggestions",
  "bonGames",
] as const;
export type Metric = (typeof METRICS)[number];

export const METRIC_LABELS: Record<Metric, string> = {
  views: "Aufrufe",
  audio: "Audio",
  shares: "Teilen",
  clicks: "Weiterklick",
  reactions: "Reaktionen",
  comments: "Kommentare",
  suggestions: "Vorschläge",
  bonGames: "BON-Spiele",
};
