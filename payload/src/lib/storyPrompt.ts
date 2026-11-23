export const STORY_PROMPT_DEFAULT = "Wo haste „{Wort}“ zuletzt jehört?";

/**
 * Fills the question under the Jeschichten form; a blank template falls back to the default (keep it in sync with the
 * description of `word-page.storyPrompt`). The function replacer matters: a "$&" or "$1" in a word must not be read as
 * a replacement pattern.
 */
export const storyPrompt = (template: string | null | undefined, word: string): string =>
  (template?.trim() ? template : STORY_PROMPT_DEFAULT).replaceAll("{Wort}", () => word);
