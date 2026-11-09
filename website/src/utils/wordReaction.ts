import {
  $feedback,
  $profile,
  loadFeedback,
  parseProfile,
  sendFeedback,
} from "@stores/wordFeedback.ts";
import { trackEvent } from "@utils/analytics";

export type Reaction = "dislike" | "like";

/** Sets the reaction, or takes it back when it is the stored one. Used by the hero thumbs. */
export const toggleReaction = async (wordId: number, reaction: Reaction): Promise<boolean> => {
  // A failed GET left no state: retry it first, or sendFeedback would not store the answer.
  if (!$feedback.get()) await loadFeedback(wordId);
  const active = $feedback.get()?.mine?.reaction === reaction;
  trackEvent("Word Feedback", "reaction", active ? "none" : reaction);
  return sendFeedback(
    wordId,
    active ? { reaction: null } : { reaction, ...parseProfile($profile.get()) },
    { fallbackMessage: "Ditt hat nich jeklappt." },
  );
};
