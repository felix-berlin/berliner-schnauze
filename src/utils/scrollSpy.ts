interface ScrollSpyOptions {
  navSelector: string;
  linkSelector: string;
  activeClass: string;
  getSectionId: (link: HTMLAnchorElement) => string | null | undefined;
  rootMargin?: string;
  onActivate?: (link: HTMLAnchorElement, nav: HTMLElement) => void;
}

export function initScrollSpy({
  navSelector,
  linkSelector,
  activeClass,
  getSectionId,
  rootMargin = "-20% 0px -70% 0px",
  onActivate,
}: ScrollSpyOptions): void {
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
}
