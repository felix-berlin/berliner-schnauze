import { attachTooltip } from "@/directives/tooltip";

const SELECTOR = ".c-word-beispiele [data-record][data-tip]";

/**
 * Attaches the shared ink tooltip to the disabled "Einsprechen" buttons. The tooltip panel only exists while it shows,
 * so the visually hidden description from the server markup stays the button's aria-describedby (browse mode and
 * screen readers get the text at any time). Returns the cleanup.
 */
export const initRecordTooltips = (root: ParentNode = document): (() => void) => {
  const stops = [...root.querySelectorAll<HTMLElement>(SELECTOR)].map((button) => {
    const described = button.getAttribute("aria-describedby");
    const stop = attachTooltip(button, {
      content: button.dataset["tip"] ?? "",
      lead: button.dataset["tipLead"],
      touch: "toggle",
      variant: "ink",
    });
    // attachTooltip points aria-describedby at its lazily created panel; keep the static description instead.
    if (described) button.setAttribute("aria-describedby", described);
    return () => {
      stop();
      if (described) button.setAttribute("aria-describedby", described);
    };
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
