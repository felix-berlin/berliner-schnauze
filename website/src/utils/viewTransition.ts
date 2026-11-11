import { nextTick } from "vue";

/**
 * Runs a state change inside a same-document view transition (docs/design/bon/SPEC.md §13).
 * Without support or under reduced motion it just runs `update`. `dir` lands in `html[data-vt]`
 * for the stylesheet and is removed again when the transition is over, so router navigations
 * keep their default fade.
 */
export function vt(update: () => void, dir: string): void {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return update();
  }
  document.documentElement.dataset.vt = dir;
  const transition = document.startViewTransition(async () => {
    update();
    await nextTick();
  });
  void transition.finished.finally(() => {
    if (document.documentElement.dataset.vt === dir) delete document.documentElement.dataset.vt;
  });
}
