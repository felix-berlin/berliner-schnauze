import type { Directive } from "vue";

export type TooltipPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "right";

export type TooltipOptions = {
  content: string;
  /** Bold lead-in before the content (static text, set via textContent). */
  lead?: string;
  placement?: TooltipPlacement;
  offset?: number;
  disabled?: boolean;
  shown?: boolean;
  /** Touch devices: a tap toggles the tooltip (a link follows on its second tap) and a tap elsewhere closes it. */
  touch?: "toggle";
  /** "ink": the word-page look (handoff SPEC §14): ink ground, paper text, 150 ms + 4px motion. */
  variant?: "ink";
  /** "keep": an existing aria-describedby (e.g. a static server-side description) stays and is not removed on cleanup. */
  describedBy?: "keep";
};

/** The word-page look for a tooltip on a touch-toggle trigger: spread it into the options. */
export const tooltipInk = {
  touch: "toggle",
  variant: "ink",
} as const satisfies Partial<TooltipOptions>;

export type TooltipValue = string | TooltipOptions;

type TooltipState = {
  anchorName: string;
  arrow: HTMLSpanElement;
  hideTimer: ReturnType<typeof setTimeout> | null;
  onClick: (e: MouseEvent) => void;
  onDocPointerDown: (e: Event) => void;
  onPointerDown: (e: Event) => void;
  onPointerUp: () => void;
  touch: boolean;
  /** A touch tap is under way: the focus it causes must not open the tooltip a second time. */
  touching: boolean;
  visible: boolean;
  domRemovalTimer: ReturnType<typeof setTimeout> | null;
  keepDescribedBy: boolean;
  onHide: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onPanelPointerEnter: () => void;
  onPanelPointerLeave: () => void;
  onShow: (e?: Event) => void;
  panel: HTMLDivElement;
  shown: boolean;
};

type TooltipEl = HTMLElement & { _tooltip?: TooltipState };

let _counter = 0;

// Delay lets the pointer move from trigger to panel without dismissing (WCAG 1.4.13)
export const HIDE_DELAY = 200;
// Matches the CSS exit-transition duration in _tooltip.scss
export const EXIT_ANIMATION_MS = 100;

const TOUCH_FOCUS_MS = 500;
const ARROW_SIZE = 8;
const ARROW_HALF = ARROW_SIZE / 2;
const ARROW_PADDING = 6;

/**
 * Offset of an arrow along one axis of the panel so it points at the anchor's
 * center, clamped to stay `padding` away from the panel edges.
 */
export function computeArrowOffset(
  anchorStart: number,
  anchorEnd: number,
  panelStart: number,
  panelSize: number,
  padding: number,
): number {
  const raw = (anchorStart + anchorEnd) / 2 - panelStart - ARROW_HALF;
  return Math.max(padding, Math.min(raw, panelSize - padding - ARROW_SIZE));
}

export function syncTooltipArrow(el: HTMLElement, panel: HTMLElement, arrow: HTMLElement): void {
  const panelRect = panel.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const isAbove = panelRect.bottom <= elRect.top;
  const isBelow = panelRect.top >= elRect.bottom;

  if (isAbove || isBelow) {
    const x = computeArrowOffset(
      elRect.left,
      elRect.right,
      panelRect.left,
      panelRect.width,
      ARROW_PADDING,
    );
    arrow.style.left = `${x}px`;
    arrow.style.right = "";
    if (isAbove) {
      arrow.style.top = "";
      arrow.style.bottom = `${-ARROW_HALF}px`;
      return;
    }
    arrow.style.top = `${-ARROW_HALF}px`;
    arrow.style.bottom = "";
    return;
  }

  const isLeft = panelRect.right <= elRect.left;
  const y = computeArrowOffset(
    elRect.top,
    elRect.bottom,
    panelRect.top,
    panelRect.height,
    ARROW_PADDING,
  );
  arrow.style.top = `${y}px`;
  arrow.style.bottom = "";
  if (isLeft) {
    arrow.style.left = "";
    arrow.style.right = `${-ARROW_HALF}px`;
    return;
  }
  arrow.style.right = "";
  arrow.style.left = `${-ARROW_HALF}px`;
}

type Normalized = Required<Omit<TooltipOptions, "describedBy" | "lead" | "touch" | "variant">> &
  Pick<TooltipOptions, "describedBy" | "lead" | "touch" | "variant">;

function normalize(value: TooltipValue): Normalized {
  const opts = typeof value === "string" ? { content: value } : value;
  return {
    content: opts.content ?? "",
    describedBy: opts.describedBy,
    disabled: opts.disabled ?? false,
    lead: opts.lead,
    offset: opts.offset ?? 8,
    placement: opts.placement ?? "top",
    shown: opts.shown ?? false,
    touch: opts.touch,
    variant: opts.variant,
  };
}

function scheduleDomRemoval(state: TooltipState): void {
  if (state.domRemovalTimer !== null) clearTimeout(state.domRemovalTimer);
  state.domRemovalTimer = setTimeout(() => {
    state.panel.remove();
    state.domRemovalTimer = null;
  }, EXIT_ANIMATION_MS);
}

function cancelHide(state: TooltipState): void {
  if (state.hideTimer !== null) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
}

function show(el: HTMLElement, state: TooltipState): void {
  // Cancel any DOM removal that was scheduled by a previous hide
  if (state.domRemovalTimer !== null) {
    clearTimeout(state.domRemovalTimer);
    state.domRemovalTimer = null;
  }
  cancelHide(state);
  if (!state.panel.isConnected) document.body.appendChild(state.panel);
  state.panel.showPopover?.();
  state.visible = true;
  if (state.touch) document.addEventListener("pointerdown", state.onDocPointerDown);
  requestAnimationFrame(() => syncTooltipArrow(el, state.panel, state.arrow));
  document.addEventListener("keydown", state.onKeyDown);
}

function hide(state: TooltipState): void {
  cancelHide(state);
  state.panel.hidePopover?.();
  state.visible = false;
  document.removeEventListener("keydown", state.onKeyDown);
  document.removeEventListener("pointerdown", state.onDocPointerDown);
  scheduleDomRemoval(state);
}

function applyPanel(panel: HTMLDivElement, anchorName: string, opts: Normalized): void {
  // textContent wipes child elements — always re-append arrow after calling this
  panel.textContent = opts.content;
  if (opts.lead) {
    const lead = document.createElement("b");
    lead.textContent = opts.lead;
    panel.prepend(lead, " ");
  }
  panel.className = "c-tooltip";
  panel.dataset.variant = opts.variant ? `${opts.placement} ${opts.variant}` : opts.placement;
  panel.style.setProperty("position-anchor", anchorName);
  panel.style.setProperty("--tooltip-offset", `${opts.offset}px`);
}

function addListeners(el: HTMLElement, state: TooltipState): void {
  el.addEventListener("pointerenter", state.onShow);
  el.addEventListener("pointerleave", state.onHide);
  el.addEventListener("focusin", state.onShow);
  el.addEventListener("focusout", state.onHide);
  if (state.touch) {
    el.addEventListener("pointerdown", state.onPointerDown);
    el.addEventListener("pointercancel", state.onPointerDown);
    el.addEventListener("click", state.onClick);
    el.addEventListener("pointerup", state.onPointerUp);
  }
  state.panel.addEventListener("pointerenter", state.onPanelPointerEnter);
  state.panel.addEventListener("pointerleave", state.onPanelPointerLeave);
}

function removeListeners(el: HTMLElement, state: TooltipState): void {
  el.removeEventListener("pointerenter", state.onShow);
  el.removeEventListener("pointerleave", state.onHide);
  el.removeEventListener("focusin", state.onShow);
  el.removeEventListener("focusout", state.onHide);
  el.removeEventListener("pointerdown", state.onPointerDown);
  el.removeEventListener("pointercancel", state.onPointerDown);
  el.removeEventListener("click", state.onClick);
  el.removeEventListener("pointerup", state.onPointerUp);
  state.panel.removeEventListener("pointerenter", state.onPanelPointerEnter);
  state.panel.removeEventListener("pointerleave", state.onPanelPointerLeave);
  document.removeEventListener("keydown", state.onKeyDown);
  document.removeEventListener("pointerdown", state.onDocPointerDown);
}

function mountTooltip(el: TooltipEl, value: TooltipValue): void {
  if (el._tooltip) return; // idempotent: a second mount would leak the first panel and listeners
  const opts = normalize(value);
  const id = `tooltip-${++_counter}`;
  const anchorName = `--${id}`;

  const panel = document.createElement("div");
  panel.id = id;
  panel.setAttribute("popover", "manual");
  panel.setAttribute("role", "tooltip");
  // Panel is NOT appended to body here — it is added lazily in onShow() to
  // keep the DOM clean until the tooltip is actually needed.

  // applyPanel uses textContent which wipes children — set text first, then append arrow
  applyPanel(panel, anchorName, opts);
  const arrow = document.createElement("span");
  arrow.className = "arrow";
  arrow.setAttribute("aria-hidden", "true");
  panel.appendChild(arrow);

  el.style.setProperty("anchor-name", anchorName);
  const keepDescribedBy = opts.describedBy === "keep" && el.hasAttribute("aria-describedby");
  if (!keepDescribedBy) el.setAttribute("aria-describedby", id);

  const state: TooltipState = {
    anchorName,
    arrow,
    domRemovalTimer: null,
    hideTimer: null,
    keepDescribedBy,
    onClick(e: MouseEvent) {
      const touched = state.touching || (e as PointerEvent).pointerType === "touch";
      state.touching = false;
      if (!touched || state.shown) return;
      if (state.visible) return hide(state); // an <a> still follows on this second tap
      e.preventDefault();
      show(el, state);
    },
    onDocPointerDown(e: Event) {
      const t = e.target as Node | null;
      if (!t || !(el.contains(t) || state.panel.contains(t))) hide(state);
    },
    onHide(e?: Event) {
      if (state.shown) return;
      // A touch pointer leaves right after the tap: the tap toggle owns that state.
      if (state.touch && (e as PointerEvent | undefined)?.pointerType === "touch") return;
      if (e?.type === "focusout") state.touching = false;
      cancelHide(state);
      state.hideTimer = setTimeout(() => hide(state), HIDE_DELAY);
    },
    onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") hide(state);
    },
    onPanelPointerEnter() {
      // Cancel pending hide when pointer enters the tooltip panel
      cancelHide(state);
    },
    onPanelPointerLeave() {
      state.onHide();
    },
    onPointerDown(e: Event) {
      state.touching = e.type === "pointerdown" && (e as PointerEvent).pointerType === "touch";
    },
    onPointerUp() {
      // The focus of the tap follows pointerup within the same gesture; after that a stale flag is dropped.
      setTimeout(() => (state.touching = false), TOUCH_FOCUS_MS);
    },
    onShow(e?: Event) {
      if (state.shown) return;
      if (
        state.touch &&
        (state.touching || (e as PointerEvent | undefined)?.pointerType === "touch")
      )
        return;
      show(el, state);
    },
    panel,
    shown: opts.shown,
    touch: opts.touch === "toggle",
    touching: false,
    visible: false,
  };
  el._tooltip = state;

  if (!opts.disabled) {
    addListeners(el, state);
  }
  if (opts.shown) show(el, state);
}

function unmountTooltip(el: TooltipEl): void {
  const state = el._tooltip;
  if (!state) return;

  if (state.hideTimer !== null) clearTimeout(state.hideTimer);
  if (state.domRemovalTimer !== null) clearTimeout(state.domRemovalTimer);
  removeListeners(el, state);
  el.style.removeProperty("anchor-name");
  if (!state.keepDescribedBy) el.removeAttribute("aria-describedby");
  state.panel.remove();
  delete el._tooltip;
}

/** Tooltip for an element outside a Vue template (Astro card scripts). Returns the cleanup. */
export function attachTooltip(el: HTMLElement, value: TooltipValue): () => void {
  if ((el as TooltipEl)._tooltip) return () => {};
  mountTooltip(el, value);
  return () => unmountTooltip(el);
}

export const vTooltip: Directive<TooltipEl, TooltipValue> = {
  mounted: (el, binding) => mountTooltip(el, binding.value),
  unmounted: (el) => unmountTooltip(el),

  updated(el, binding) {
    const state = el._tooltip;
    if (!state) return;

    const newOpts = normalize(binding.value);
    const oldOpts = normalize(binding.oldValue ?? binding.value);

    // applyPanel wipes children — re-append arrow immediately after
    applyPanel(state.panel, state.anchorName, newOpts);
    state.panel.appendChild(state.arrow);

    if (newOpts.disabled !== oldOpts.disabled) {
      if (newOpts.disabled) {
        removeListeners(el, state);
        hide(state);
      } else {
        addListeners(el, state);
      }
    }

    if (newOpts.shown === oldOpts.shown) return;
    state.shown = newOpts.shown;
    if (newOpts.shown) show(el, state);
    else hide(state);
  },
};
