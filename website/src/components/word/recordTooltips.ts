import { onPage } from "@utils/pageLifecycle.ts";

import { attachTooltip, tooltipInk } from "@/directives/tooltip";

const SELECTOR = ".c-word-beispiele [data-record][data-tip]";

/**
 * Attaches the shared ink tooltip to the disabled "Einsprechen" buttons. The tooltip panel only exists while it shows,
 * so the visually hidden description from the server markup stays the button's aria-describedby (browse mode and
 * screen readers get the text at any time). Returns the cleanup.
 */
export const initRecordTooltips = (root: ParentNode = document): (() => void) => {
  const stops = [...root.querySelectorAll<HTMLElement>(SELECTOR)].map((button) =>
    // The static server-side description stays the button's aria-describedby (the panel only exists while it shows).
    attachTooltip(button, {
      ...tooltipInk,
      content: button.dataset["tip"] ?? "",
      describedBy: "keep",
      lead: button.dataset["tipLead"],
    }),
  );
  return () => stops.forEach((stop) => stop());
};

/** Re-attach on every ClientRouter navigation, drop before the swap. Returns the cleanup of the listeners. */
export const wireRecordTooltips = (doc: Document = document): (() => void) =>
  onPage(() => initRecordTooltips(doc), { doc });
