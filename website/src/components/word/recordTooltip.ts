const RECORD = ".c-word-beispiele .record";

/**
 * Tooltip of the disabled "Einsprechen" (SPEC §14): a tap toggles it (iOS Safari does not focus a tapped button),
 * Esc or a second tap closes it and it stays closed until a NEW focus or pointer entry (WCAG 1.4.13).
 * State lives in `data-open` / `data-dismissed` on `.record`; the CSS reads them. Returns the cleanup.
 */
export const initRecordTooltip = (root: Document | HTMLElement = document): (() => void) => {
  const doc = root instanceof Document ? root : root.ownerDocument;
  const record = (t: EventTarget | null) =>
    (t as HTMLElement | null)?.closest<HTMLElement>(RECORD) ?? null;
  const close = (el: HTMLElement) => {
    el.removeAttribute("data-open");
    el.dataset["dismissed"] = "";
  };

  const onClick = (e: Event) => {
    const el = record(e.target);
    root
      .querySelectorAll<HTMLElement>(`${RECORD}[data-open]`)
      .forEach((o) => o !== el && o.removeAttribute("data-open"));
    if (!el) return;
    if (el.hasAttribute("data-open")) return close(el);
    el.removeAttribute("data-dismissed");
    el.setAttribute("data-open", "");
  };
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    root.querySelectorAll<HTMLElement>(RECORD).forEach((el) => {
      if (el.matches(":focus-within, :hover, [data-open]")) close(el);
    });
  };
  const onFocusin = (e: Event) => record(e.target)?.removeAttribute("data-dismissed");
  const onMouseover = (e: MouseEvent) => {
    const el = record(e.target);
    if (el && !el.contains(e.relatedTarget as Node | null)) el.removeAttribute("data-dismissed");
  };

  doc.addEventListener("click", onClick);
  doc.addEventListener("keydown", onKeydown);
  doc.addEventListener("focusin", onFocusin);
  doc.addEventListener("mouseover", onMouseover);
  return () => {
    doc.removeEventListener("click", onClick);
    doc.removeEventListener("keydown", onKeydown);
    doc.removeEventListener("focusin", onFocusin);
    doc.removeEventListener("mouseover", onMouseover);
  };
};
