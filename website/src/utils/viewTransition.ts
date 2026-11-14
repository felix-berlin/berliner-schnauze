import { nextTick } from "vue";

/**
 * Runs a state change inside a same-document view transition (docs/design/bon/SPEC.md §13).
 * Without support or under reduced motion it just runs `update`. `type`, when given, becomes the
 * transition type the stylesheet matches with `:active-view-transition-type()`; a browser without
 * transition types gets no transition at all (no morph, spec §8). Without `type` it is the default
 * crossfade.
 */
const ignoreAbort = (error: unknown) => {
  if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
};

/**
 * A skipped transition (a newer one started, the tab went hidden) rejects `ready` with an AbortError;
 * that is routine, not an error. A throwing `update` rejects all three promises with the same error,
 * so it surfaces once, through `updateCallbackDone`.
 */
const settle = (transition: ViewTransition): void => {
  transition.updateCallbackDone.catch(ignoreAbort);
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
};

export function vt(update: () => void, type?: string): void {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return update();
  }
  const run = async () => {
    update();
    await nextTick();
  };
  if (!type) {
    settle(document.startViewTransition(run));
    return;
  }
  if (!globalThis.CSS?.supports?.("selector(:active-view-transition-type(a))")) return update();
  settle(document.startViewTransition({ types: [type], update: run }));
}

const isViewTransitionAnimation = (a: Animation) =>
  (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith("::view-transition");

/**
 * Resolves once the router's running navigation transition (html[data-astro-transition]) has played
 * out, at the latest after `capMs`. A transition ends as soon as a named element of the new page
 * disappears, so a page that swaps its landing spot (a skeleton) waits for this first. It first
 * waits for the transition's pseudo-element animations to exist (`ready`), then for them to finish.
 */
export async function navigationSettled(capMs = 800): Promise<void> {
  const root = document.documentElement;
  const played = async (): Promise<void> => {
    if (!root.hasAttribute("data-astro-transition")) return;
    const running = (document.getAnimations?.() ?? []).filter(isViewTransitionAnimation);
    if (running.length) {
      await Promise.allSettled(running.map((a) => a.finished));
      return;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return played();
  };
  let timer: ReturnType<typeof setTimeout>;
  await Promise.race([played(), new Promise((resolve) => (timer = setTimeout(resolve, capMs)))]);
  clearTimeout(timer!);
}
