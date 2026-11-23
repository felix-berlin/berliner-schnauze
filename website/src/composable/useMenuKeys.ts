/** Items of an APG menu: the elements with role menuitem below `menu`. */
export const menuItems = (menu: ParentNode | null | undefined): HTMLElement[] => [
  ...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
];

/**
 * Keydown handler of a role="menu" element: ArrowUp/Down (wrapping), Home, End move the focus; Tab closes the
 * menu through `close` and is not prevented, so the browser carries on to the next control. Esc, light dismiss
 * and the focus return belong to the popover itself.
 */
export const onMenuKeydown = (event: KeyboardEvent, menu: ParentNode | null, close: () => void) => {
  if (event.key === "Tab") return close();
  const list = menuItems(menu);
  const at = list.indexOf(document.activeElement as HTMLElement);
  const target = {
    ArrowDown: (at + 1) % list.length,
    ArrowUp: (at - 1 + list.length) % list.length,
    End: list.length - 1,
    Home: 0,
  }[event.key];
  if (target === undefined) return;
  event.preventDefault();
  list[target]?.focus();
};
