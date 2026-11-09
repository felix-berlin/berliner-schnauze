interface ScrollSpyOptions {
  navSelector: string;
  linkSelector: string;
  activeClass: string;
  getSectionId: (link: HTMLAnchorElement) => string | null | undefined;
  rootMargin?: string;
  onActivate?: (link: HTMLAnchorElement, nav: HTMLElement) => void;
}

/** Minimum band height (px): on short viewports the header offset would squeeze the band to nothing. */
const MIN_BAND = 60;

/**
 * rootMargin for a page whose sticky header (--site-header-height, JS-updated) covers the top of the viewport: the
 * observed band starts `offset` px below it. Anchors land at header + 56px (scroll-margin), so an offset of 64 keeps
 * the section that was just jumped to inside the band and the one above it (ending at the landing line) outside.
 * The band ends `bottomRatio` of the viewport above its bottom edge, but never leaves it shorter than MIN_BAND
 * (landscape phones, e.g. 844x390): the bottom margin is capped by the room left below the top margin.
 */
export const rootMarginBelowHeader = (offset: number, bottomRatio = 0.7): string => {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-header-height"));
  const top = Math.round((Number.isFinite(header) ? header : 60) + offset);
  const height = window.innerHeight;
  const bottom = Math.round(Math.max(0, Math.min(height * bottomRatio, height - top - MIN_BAND)));
  return `-${top}px 0px -${bottom}px 0px`;
};

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
}: ScrollSpyOptions): void {
  observers.get(navSelector)?.disconnect();
  observers.delete(navSelector);

  const nav = document.querySelector<HTMLElement>(navSelector);
  if (!nav) return;

  const links = new Map<string, HTMLAnchorElement>();
  nav.querySelectorAll<HTMLAnchorElement>(linkSelector).forEach((link) => {
    const id = getSectionId(link);
    if (id) links.set(id, link);
  });

  const sections = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (!sections.length) return;

  let current: HTMLAnchorElement | null = null;
  const setActive = (id: string) => {
    const next = links.get(id) ?? null;
    if (next === current) return;
    current?.classList.remove(activeClass);
    next?.classList.add(activeClass);
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
}

/**
 * initScrollSpy for a band below the sticky header: the margin is recomputed whenever the viewport or the header
 * height changes (rotation, header wrapping), which an IntersectionObserver cannot do itself. Returns a stop function.
 */
export function initHeaderScrollSpy(options: Omit<ScrollSpyOptions, "rootMargin">, offset = 64): () => void {
  const init = () => initScrollSpy({ ...options, rootMargin: rootMarginBelowHeader(offset) });
  init();
  window.addEventListener("resize", init);
  const header = document.querySelector(".c-header");
  const resizeObserver = header ? new ResizeObserver(init) : null;
  if (header) resizeObserver?.observe(header);
  return () => {
    window.removeEventListener("resize", init);
    resizeObserver?.disconnect();
  };
}
