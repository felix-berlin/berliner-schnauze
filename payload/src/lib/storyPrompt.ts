export const STORY_PROMPT_DEFAULT = "Wo haste „{Wort}“ zuletzt jehört?";

/** Fills the weekly question; a blank template falls back to the default. */
export const storyPrompt = (template: string | null | undefined, word: string): string =>
  (template?.trim() ? template : STORY_PROMPT_DEFAULT).replaceAll("{Wort}", () => word);
