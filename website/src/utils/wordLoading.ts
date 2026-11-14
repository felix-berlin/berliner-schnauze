// Loading skeleton of the word page (Spec §9): the pages are server-rendered, so it only exists for client navigation
// (ClientRouter). It shows when the new word is still not there after 300 ms and never for a quick or cached load.
export const SKELETON_DELAY_MS = 300;

const bar = (variant = "", style = ""): string =>
  `<span class="c-skeleton"${variant ? ` data-variant="${variant}"` : ""}${style ? ` style="${style}"` : ""}></span>`;
const card = (): string =>
  `<div class="card">${bar("title", "inline-size:40%")}${bar("line")}${bar("line")}${bar("line", "inline-size:70%")}</div>`;
const badge = bar("badge");
const audio = bar("audio");

const SKELETON_HTML =
  `<div class="c-word-skeleton" role="status" aria-busy="true" aria-label="Wort wird jeladen">` +
  `<div class="card">${bar("title")}` +
  `<div class="badges">${badge}${badge}</div>` +
  `${bar("line")}${bar("line", "inline-size:80%")}</div>` +
  `${audio}${audio}${card()}${card()}</div>`;

let teardown: (() => void) | undefined;

/** Registers the listeners once: a second call replaces the first. Returns the cleanup. */
export const initWordLoading = (): (() => void) => {
  teardown?.();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let shown: HTMLElement | undefined;
  const clear = (): void => {
    clearTimeout(timer);
    shown?.remove();
    shown = undefined;
  };
  const onBefore = (event: Event & { formData?: unknown; to?: URL }): void => {
    clear();
    if (event.formData || !event.to?.pathname.startsWith("/wort/")) return;
    timer = setTimeout(() => {
      const el = document.createElement("div");
      el.className = "c-word-skeleton-layer";
      el.innerHTML = SKELETON_HTML;
      document.body.append(el);
      shown = el;
    }, SKELETON_DELAY_MS);
  };
  document.addEventListener("astro:before-preparation", onBefore);
  // The old page (and the layer with it) is gone after the swap; this also stops a timer that came too late.
  document.addEventListener("astro:after-swap", clear);
  teardown = () => {
    clear();
    document.removeEventListener("astro:before-preparation", onBefore);
    document.removeEventListener("astro:after-swap", clear);
    teardown = undefined;
  };
  return teardown;
};
