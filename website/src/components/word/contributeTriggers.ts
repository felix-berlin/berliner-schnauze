import { ownSubmissions } from "@lib/ownSubmissions.ts";
import { openContributeForm, openForm } from "@stores/contribute.ts";

const TRIGGER = "[data-contribute], [data-report]";

/** `data-report` opens the error form, `data-contribute` carries the type itself. */
const typeOf = (el: HTMLElement): string | undefined =>
  el.dataset["report"] === undefined ? el.dataset["contribute"] : "error";

const renderOwn = (root: ParentNode): void => {
  for (const el of root.querySelectorAll<HTMLElement>("[data-own]")) {
    const { own, word } = el.dataset;
    const list = ownSubmissions(word ?? "").filter((s) => s.type === own);
    const ul = document.createElement("ul");
    ul.className = "c-word-own";
    for (const s of list) {
      const li = document.createElement("li");
      li.className = "item";
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = "Wird jeprüft";
      const text = document.createElement("span");
      text.className = "text";
      // textContent only: the preview is the visitor's own text.
      text.textContent = s.preview;
      li.append(chip, text);
      ul.append(li);
    }
    el.replaceChildren(...(list.length ? [ul] : []));
  }
};

/**
 * Wires the static "Ergänzen" pills, gap buttons and the report button to the contribute store (SPEC §13): a click
 * opens that form, `aria-expanded`/`aria-controls` follow the store, the card with an open form hides its gap
 * (`data-state="form-open"`), and the visitor's own open suggestions show as chips. Returns the cleanup.
 */
export const initContributeTriggers = (root: Document | HTMLElement = document): (() => void) => {
  const onClick = (e: Event) => {
    const trigger = (e.target as Element | null)?.closest<HTMLElement>(TRIGGER);
    const type = trigger && typeOf(trigger);
    if (type) openContributeForm(type);
  };
  root.addEventListener("click", onClick);

  const unsubscribe = openForm.subscribe((open) => {
    for (const el of root.querySelectorAll<HTMLElement>(TRIGGER)) {
      const type = typeOf(el);
      const on = type !== undefined && type === open;
      el.setAttribute("aria-expanded", String(on));
      if (on) el.setAttribute("aria-controls", `contribute-${type}`);
      else el.removeAttribute("aria-controls");
    }
    for (const card of root.querySelectorAll<HTMLElement>("[data-form]")) {
      if (card.dataset["form"] === open) card.dataset["state"] = "form-open";
      else delete card.dataset["state"];
    }
    renderOwn(root);
  });

  return () => {
    root.removeEventListener("click", onClick);
    unsubscribe();
  };
};
