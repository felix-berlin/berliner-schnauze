interface ScrollSpyOptions {
  navSelector: string;
  linkSelector: string;
  /** Class toggled on the active link; omit it when onActivate marks the link (aria-current). */
  activeClass?: string;
  getSectionId: (link: HTMLAnchorElement) => string | null | undefined;
  rootMargin?: string;
  onActivate?: (link: HTMLAnchorElement, nav: HTMLElement) => void;
}

// One observer per nav: re-running init after a View Transitions navigation must drop the
// previous page's observer, otherwise it keeps observing detached sections.
const observers = new Map<string, IntersectionObserver>();

export function initScrollSpy({
  navSelector,
  linkSelector,
  activeClass,
  getSectionId,
  rootMargin = "-20% 0px -70% 0px",
  onActivate,
}: ScrollSpyOptions): () => void {
  observers.get(navSelector)?.disconnect();
  observers.delete(navSelector);

  const nav = document.querySelector<HTMLElement>(navSelector);
  if (!nav) return () => {};

  const links = new Map<string, HTMLAnchorElement>();
  nav.querySelectorAll<HTMLAnchorElement>(linkSelector).forEach((link) => {
    const id = getSectionId(link);
    if (id) links.set(id, link);
  });

  const sections = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (!sections.length) return () => {};

  let current: HTMLAnchorElement | null = null;
  const setActive = (id: string) => {
    const next = links.get(id) ?? null;
    if (next === current) return;
    if (activeClass) {
      current?.classList.remove(activeClass);
      next?.classList.add(activeClass);
    }
    current = next;
    if (next) onActivate?.(next, nav);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setActive(visible[0].target.id);
    },
    { rootMargin },
  );

  sections.forEach((section) => observer.observe(section));
  observers.set(navSelector, observer);
  // Returns a stop function (a component unmounting under ClientRouter must not leave the observer on detached nodes).
  return () => {
    observer.disconnect();
    if (observers.get(navSelector) === observer) observers.delete(navSelector);
  };
}
