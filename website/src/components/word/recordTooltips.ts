import { attachTooltip } from "@/directives/tooltip";

const SELECTOR = ".c-word-beispiele .record-button[data-tip]";

/**
 * Attaches the shared ink tooltip to the disabled "Einsprechen" buttons. The server markup carries a visually hidden
 * description (aria-describedby) for the time before this runs; the tooltip replaces it. Returns the cleanup.
 */
export const initRecordTooltips = (root: ParentNode = document): (() => void) => {
  const stops = [...root.querySelectorAll<HTMLElement>(SELECTOR)].map((button) => {
    const fallback = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    const stop = attachTooltip(button, {
      content: button.dataset["tip"] ?? "",
      lead: button.dataset["tipLead"],
      touch: "toggle",
      variant: "ink",
    });
    if (fallback?.classList.contains("u-sr-only")) fallback.remove();
    return stop;
  });
  return () => stops.forEach((stop) => stop());
};

/** Re-attach on every ClientRouter navigation, drop before the swap. Returns the cleanup of the listeners. */
export const wireRecordTooltips = (doc: Document = document): (() => void) => {
  let stop = () => {};
  const onLoad = () => {
    stop();
    stop = initRecordTooltips(doc);
  };
  const onSwap = () => {
    stop();
    stop = () => {};
  };
  doc.addEventListener("astro:page-load", onLoad);
  doc.addEventListener("astro:before-swap", onSwap);
  return () => {
    onSwap();
    doc.removeEventListener("astro:page-load", onLoad);
    doc.removeEventListener("astro:before-swap", onSwap);
  };
};
