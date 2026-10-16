export function shouldForceReload(state: unknown): boolean {
  return (
    typeof state !== "object" ||
    state === null ||
    typeof (state as { index?: unknown }).index !== "number"
  );
}

let initialized = false;

export function initHistoryNavigationFallback(): void {
  if (initialized) return;
  initialized = true;

  window.addEventListener("popstate", () => {
    // Read history.state, not event.state: Astro's ClientRouter dispatches a synthetic
    // popstate for same-page hash navigation (`new PopStateEvent("popstate")`, no state
    // passed), so event.state is always null there even though history.state was just
    // correctly restored via replaceState a line earlier in Astro's router.
    if (shouldForceReload(history.state)) window.location.reload();
  });
}
