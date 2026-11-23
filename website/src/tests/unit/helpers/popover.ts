/**
 * Minimal Popover API for jsdom, which has none: showPopover/hidePopover fire beforetoggle and toggle like a
 * browser, a click on a popovertarget invoker toggles, a click outside an open auto popover and Esc close it
 * (light dismiss). Returns the cleanup.
 */
export const installPopover = (): (() => void) => {
  const open = new Set<HTMLElement>();
  const fire = (el: HTMLElement, type: "beforetoggle" | "toggle", newState: "open" | "closed") =>
    el.dispatchEvent(
      new ToggleEvent(type, { newState, oldState: newState === "open" ? "closed" : "open" }),
    );
  const show = function (this: HTMLElement) {
    if (open.has(this)) return;
    fire(this, "beforetoggle", "open");
    open.add(this);
    this.style.display = "block"; // the UA sheet of jsdom hides a closed [popover], and hidden elements take no focus
    queueMicrotask(() => fire(this, "toggle", "open"));
  };
  const hide = function (this: HTMLElement) {
    if (!open.has(this)) return;
    fire(this, "beforetoggle", "closed");
    open.delete(this);
    this.style.display = "";
    queueMicrotask(() => fire(this, "toggle", "closed"));
  };
  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const invoker = target.closest<HTMLElement>("[popovertarget]");
    const panel = invoker && document.getElementById(invoker.getAttribute("popovertarget")!);
    if (panel) return open.has(panel) ? hide.call(panel) : show.call(panel);
    for (const el of open) if (!el.contains(target)) hide.call(el);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") for (const el of open) hide.call(el);
  };
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  const before = { hidePopover: proto.hidePopover, showPopover: proto.showPopover };
  proto.showPopover = show;
  proto.hidePopover = hide;
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  return () => {
    Object.assign(proto, before);
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
    open.clear();
  };
};
