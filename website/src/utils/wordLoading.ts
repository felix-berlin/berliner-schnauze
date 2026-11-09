// Loading skeleton of the word page (Spec §9): the pages are server-rendered, so it only exists for client navigation
// (ClientRouter). It shows when the new word is still not there after 300 ms and never for a quick or cached load.
export const SKELETON_DELAY_MS = 300;

const bar = (cls: string, style = ""): string =>
  `<span class="c-skeleton ${cls}"${style ? ` style="${style}"` : ""}></span>`;
const card = (): string =>
  `<div class="c-word-skeleton__card">${bar("c-skeleton--title", "inline-size:40%")}${bar("c-skeleton--line")}${bar("c-skeleton--line")}${bar("c-skeleton--line", "inline-size:70%")}</div>`;

export const skeletonHtml = (): string =>
  `<div class="c-word-skeleton" role="status" aria-busy="true" aria-label="Wort wird jeladen">` +
  `<div class="c-word-skeleton__card">${bar("c-skeleton--title")}` +
  `<div class="c-word-skeleton__badges">${bar("c-word-skeleton__badge")}${bar("c-word-skeleton__badge")}</div>` +
  `${bar("c-skeleton--line")}${bar("c-skeleton--line", "inline-size:80%")}</div>` +
  `${bar("c-word-skeleton__audio")}${bar("c-word-skeleton__audio")}${card()}${card()}</div>`;

export const initWordLoading = (): void => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let shown: HTMLElement | undefined;
  const clear = (): void => {
    clearTimeout(timer);
    shown?.remove();
    shown = undefined;
  };
  document.addEventListener("astro:before-preparation", (event) => {
    clear();
    if (event.formData || !event.to.pathname.startsWith("/wort/")) return;
    timer = setTimeout(() => {
      const el = document.createElement("div");
      el.className = "c-word-skeleton-layer";
      el.innerHTML = skeletonHtml();
      document.body.append(el);
      shown = el;
    }, SKELETON_DELAY_MS);
  });
  // The old page (and the layer with it) is gone after the swap; this also stops a timer that came too late.
  document.addEventListener("astro:after-swap", clear);
};
