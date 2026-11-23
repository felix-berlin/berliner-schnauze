import { useGuardedAction } from "@composables/useGuardedAction.ts";
import { useStore } from "@nanostores/vue";
import { $feedback, loadFeedback } from "@stores/wordFeedback.ts";
import { toggleReaction, type Reaction } from "@utils/wordReaction.ts";
import { computed, onMounted, ref } from "vue";

/** Like/dislike of one word: optimistic ±1 on the stored totals, rolled back when the request fails. No id (draft): inert. */
export const useWordReaction = (wordId: () => number | undefined) => {
  const { busy, online, run } = useGuardedAction();
  const feedback = useStore($feedback);
  const stored = computed<Reaction | null>(() => feedback.value?.mine?.reaction ?? null);
  // What the visitor just chose, until the server answered; a failed request drops it (rollback).
  const optimistic = ref<{ reaction: Reaction | null } | null>(null);
  const current = computed(() => (optimistic.value ? optimistic.value.reaction : stored.value));
  const pending = computed(() => busy.size > 0);

  onMounted(() => {
    const id = wordId();
    if (id !== undefined) void loadFeedback(id);
  });

  /** Total as stored plus the one step the optimistic choice adds or removes; "–" until loaded. */
  const count = (reaction: Reaction): number | string => {
    const total = feedback.value?.totals[reaction];
    if (total === undefined) return "–";
    return Math.max(
      0,
      total + Number(current.value === reaction) - Number(stored.value === reaction),
    );
  };

  const react = async (reaction: Reaction): Promise<void> => {
    const id = wordId();
    if (id === undefined) return;
    await run("reaction", async () => {
      try {
        if (!feedback.value) await loadFeedback(id);
        optimistic.value = { reaction: stored.value === reaction ? null : reaction };
        await toggleReaction(id, reaction);
      } finally {
        // Success: the store holds the answer. Failure: it still holds the old one.
        optimistic.value = null;
      }
    });
  };

  return { count, current, online, pending, react };
};
