import { nextTick } from "vue";

let active: ViewTransition | undefined;

/**
 * Runs a state change inside a same-document view transition (docs/design/bon/SPEC.md §13).
 * Without support or under reduced motion it just runs `update`. `dir`, when given, lands in
 * `html[data-vt]` for the stylesheet and is removed again when the transition is over, so router
 * navigations keep their default fade; without it the transition is the default crossfade.
 */
export function vt(update: () => void, dir?: string): void {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return update();
  }
  if (dir) document.documentElement.dataset.vt = dir;
  const transition = document.startViewTransition(async () => {
    update();
    await nextTick();
  });
  active = transition;
  void transition.finished.finally(() => {
    // A later transition owns data-vt by now.
    if (active === transition) delete document.documentElement.dataset.vt;
  });
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
