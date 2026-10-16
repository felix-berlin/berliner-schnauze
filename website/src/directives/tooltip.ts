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
  placement?: TooltipPlacement;
  offset?: number;
  disabled?: boolean;
  shown?: boolean;
};

export type TooltipValue = string | TooltipOptions;

type TooltipState = {
  anchorName: string;
  arrow: HTMLSpanElement;
  hideTimer: ReturnType<typeof setTimeout> | null;
  domRemovalTimer: ReturnType<typeof setTimeout> | null;
  onHide: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onPanelPointerEnter: () => void;
  onPanelPointerLeave: () => void;
  onShow: () => void;
  panel: HTMLDivElement;
  shown: boolean;
};

type TooltipEl = HTMLElement & { _tooltip?: TooltipState };

let _counter = 0;

// Delay lets the pointer move from trigger to panel without dismissing (WCAG 1.4.13)
export const HIDE_DELAY = 200;
// Matches the CSS exit-transition duration in _tooltip.scss
export const EXIT_ANIMATION_MS = 100;

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

function normalize(value: TooltipValue): Required<TooltipOptions> {
  const opts = typeof value === "string" ? { content: value } : value;
  return {
    content: opts.content ?? "",
    disabled: opts.disabled ?? false,
    offset: opts.offset ?? 8,
    placement: opts.placement ?? "top",
    shown: opts.shown ?? false,
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
  requestAnimationFrame(() => syncTooltipArrow(el, state.panel, state.arrow));
  document.addEventListener("keydown", state.onKeyDown);
}

function hide(state: TooltipState): void {
  cancelHide(state);
  state.panel.hidePopover?.();
  document.removeEventListener("keydown", state.onKeyDown);
  scheduleDomRemoval(state);
}

function applyPanel(
  panel: HTMLDivElement,
  anchorName: string,
  opts: Required<TooltipOptions>,
): void {
  // textContent wipes child elements — always re-append arrow after calling this
  panel.textContent = opts.content;
  panel.className = `c-tooltip__panel c-tooltip__panel--${opts.placement}`;
  panel.style.setProperty("position-anchor", anchorName);
  panel.style.setProperty("--c-tooltip-offset", `${opts.offset}px`);
}

function addListeners(el: HTMLElement, state: TooltipState): void {
  el.addEventListener("pointerenter", state.onShow);
  el.addEventListener("pointerleave", state.onHide);
  el.addEventListener("focusin", state.onShow);
  el.addEventListener("focusout", state.onHide);
  state.panel.addEventListener("pointerenter", state.onPanelPointerEnter);
  state.panel.addEventListener("pointerleave", state.onPanelPointerLeave);
}

function removeListeners(el: HTMLElement, state: TooltipState): void {
  el.removeEventListener("pointerenter", state.onShow);
  el.removeEventListener("pointerleave", state.onHide);
  el.removeEventListener("focusin", state.onShow);
  el.removeEventListener("focusout", state.onHide);
  state.panel.removeEventListener("pointerenter", state.onPanelPointerEnter);
  state.panel.removeEventListener("pointerleave", state.onPanelPointerLeave);
  document.removeEventListener("keydown", state.onKeyDown);
}

export const vTooltip: Directive<TooltipEl, TooltipValue> = {
  mounted(el, binding) {
    const opts = normalize(binding.value);
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
    arrow.className = "c-tooltip__arrow";
    arrow.setAttribute("aria-hidden", "true");
    panel.appendChild(arrow);

    el.style.setProperty("anchor-name", anchorName);
    el.setAttribute("aria-describedby", id);

    const state: TooltipState = {
      anchorName,
      arrow,
      domRemovalTimer: null,
      hideTimer: null,
      onHide() {
        if (state.shown) return;
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
      onShow() {
        if (state.shown) return;
        show(el, state);
      },
      panel,
      shown: opts.shown,
    };
    el._tooltip = state;

    if (!opts.disabled) {
      addListeners(el, state);
    }
    if (opts.shown) show(el, state);
  },

  unmounted(el) {
    const state = el._tooltip;
    if (!state) return;

    if (state.hideTimer !== null) clearTimeout(state.hideTimer);
    if (state.domRemovalTimer !== null) clearTimeout(state.domRemovalTimer);
    removeListeners(el, state);
    el.style.removeProperty("anchor-name");
    el.removeAttribute("aria-describedby");
    state.panel.remove();
    delete el._tooltip;
  },

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
