import { useIntersectionObserver } from "@vueuse/core";
import { onMounted, ref, type Ref } from "vue";

/**
 * One-time entry reveal for a hydrated island: `undefined` as rendered by the server (everything visible, also
 * without JS), `armed` once mounted (CSS hides it) and `in` when `target` first comes into view. `state !== undefined`
 * also tells "mounted", so the first client render can match the server's.
 */
export const useRevealOnView = (target: Ref<HTMLElement | null | undefined>) => {
  const state = ref<"armed" | "in" | undefined>(undefined);
  onMounted(() => {
    state.value = "armed";
  });
  const { stop } = useIntersectionObserver(target, ([entry]) => {
    if (entry?.isIntersecting && state.value === "armed") {
      state.value = "in";
      stop();
    }
  });
  return state;
};
