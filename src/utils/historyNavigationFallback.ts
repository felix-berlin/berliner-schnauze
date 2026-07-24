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

  window.addEventListener("popstate", (event: PopStateEvent) => {
    if (shouldForceReload(event.state)) window.location.reload();
  });
}
