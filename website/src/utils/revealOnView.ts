/**
 * Releases every `[data-reveal="wait"]` under `root` the first time a fifth of it is visible (SPEC startseite-v20
 * §16): the component CSS runs its entry motion once the attribute is gone. Under reduced motion all are released
 * at once (the CSS has no motion there anyway). Returns a cleanup for view transitions.
 * shortcut: an element taller than five viewports never reaches 0.2 and stays in its static end state; switch to a
 * rootMargin trigger if such a section should animate.
 */
export const revealOnView = (root: ParentNode): (() => void) => {
  const waiting = root.querySelectorAll('[data-reveal="wait"]');
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const el of waiting) el.removeAttribute("data-reveal");
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) continue;
        target.removeAttribute("data-reveal");
        observer.unobserve(target);
      }
    },
    { threshold: 0.2 },
  );
  for (const el of waiting) observer.observe(el);
  return () => observer.disconnect();
};
