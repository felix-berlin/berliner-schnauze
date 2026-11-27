import { ownSubmissions } from "@lib/ownSubmissions.ts";
import { openContributeForm, openForm } from "@stores/contribute.ts";
import { onPage } from "@utils/pageLifecycle.ts";

const TRIGGER = "[data-contribute], [data-report]";

/** `data-report` opens the error form, `data-contribute` carries the type itself. */
const typeOf = (el: HTMLElement): string | undefined =>
  el.dataset["report"] === undefined ? el.dataset["contribute"] : "error";

const squash = (text: string): string => text.replace(/\s+/g, " ").trim();

const BLOCKS = "p, li, q, dd, dt, div, blockquote, br, h1, h2, h3, h4, h5, h6";
/** Shorter texts must be a whole entry of the card: "Kiez" must not match inside "Kiezkneipe". */
const MIN_INSIDE = 12;

/** The card's entries one by one, and its whole text with a space after every block (so paragraphs do not fuse). */
const publicText = (section: Element | null): { all: string; blocks: string[] } => {
  if (!section) return { all: "", blocks: [] };
  const blocks = [...section.querySelectorAll("p, li, q, dd, dt, h1, h2, h3, h4, h5, h6")].map(
    (e) => squash(e.textContent ?? ""),
  );
  const copy = section.cloneNode(true) as Element;
  for (const e of copy.querySelectorAll(BLOCKS)) e.append(" ");
  return { all: squash(copy.textContent ?? ""), blocks };
};

const renderOwn = (root: ParentNode): void => {
  for (const el of root.querySelectorAll<HTMLElement>("[data-own]")) {
    const { own, word } = el.dataset;
    // Own submissions live only in this browser and know nothing of the review. Once the preview text stands in the
    // card it is public and the chip would lie. A heuristic on the truncated preview (an editor who reworded the text
    // leaves the chip until it expires). The old chip list is cleared first so it does not count as card text.
    el.replaceChildren();
    const card = publicText(el.closest("section"));
    const list = ownSubmissions(word ?? "").filter((s) => {
      const preview = squash(s.preview);
      const published =
        preview !== "" &&
        (card.blocks.includes(preview) ||
          (preview.length >= MIN_INSIDE && card.all.includes(preview)));
      return s.type === own && !published;
    });
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

/**
 * ClientRouter lifecycle: a bundled script runs once per tab, so the wiring starts on every `astro:page-load` and is
 * dropped on `astro:before-swap`; the store's open form is reset there too (it is module-global and would otherwise
 * open the form of the next word on its own). Returns the removal of both listeners.
 */
export const watchContributeTriggers = (doc: Document = document): (() => void) =>
  onPage(() => initContributeTriggers(doc), { doc, onSwap: () => openForm.set(null) });
