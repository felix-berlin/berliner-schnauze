/** One word type for badge, sidebar and grammar card; "(geraten)" is added to the badge text only. */
export const resolvePos = (
  editorial: string | undefined,
  nlpTags: Record<string, string[]>[],
): { auto: boolean; pos: string } | undefined => {
  if (editorial) return { auto: false, pos: editorial };
  const guessed = Object.values(nlpTags[0] ?? {})[0]?.[0];
  return guessed ? { auto: true, pos: guessed } : undefined;
};

export const posBadge = (pos: string, auto: boolean): { auto: boolean; text: string } => ({
  auto,
  text: auto ? `${pos} (geraten)` : pos,
});
