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

const HIDE_DELAY = 200;

const ARROW_SIZE = 8;
const ARROW_HALF = ARROW_SIZE / 2;
const ARROW_PADDING = 6;

export function syncTooltipArrow(
  el: HTMLElement,
  panel: HTMLElement,
  arrow: HTMLElement,
): void {
  const panelRect = panel.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const isAbove = panelRect.bottom <= elRect.top;
  const isBelow = panelRect.top >= elRect.bottom;

  if (isAbove || isBelow) {
    const elCenterX = (elRect.left + elRect.right) / 2;
    const rawX = elCenterX - panelRect.left - ARROW_HALF;
    const x = Math.max(
      ARROW_PADDING,
      Math.min(rawX, panelRect.width - ARROW_PADDING - ARROW_SIZE),
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
  const elCenterY = (elRect.top + elRect.bottom) / 2;
  const rawY = elCenterY - panelRect.top - ARROW_HALF;
  const y = Math.max(
    ARROW_PADDING,
    Math.min(rawY, panelRect.height - ARROW_PADDING - ARROW_SIZE),
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

export const vTooltip: Directive<HTMLElement, TooltipValue> = {
  mounted(el, binding) {
    const opts = normalize(binding.value);
    const id = `tooltip-${++_counter}`;
    const anchorName = `--${id}`;

    const panel = document.createElement("div");
    panel.id = id;
    panel.setAttribute("popover", "manual");
    panel.setAttribute("role", "tooltip");
    document.body.appendChild(panel);

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
      hideTimer: null,
      onHide() {
        if (state.shown) return;
        if (state.hideTimer !== null) {
          clearTimeout(state.hideTimer);
          state.hideTimer = null;
        }
        // Delay lets the pointer move from trigger to panel without dismissing (WCAG 1.4.13)
        state.hideTimer = setTimeout(() => {
          panel.hidePopover?.();
          state.hideTimer = null;
          document.removeEventListener("keydown", state.onKeyDown);
        }, HIDE_DELAY);
      },
      onKeyDown(e: KeyboardEvent) {
        if (e.key !== "Escape") return;
        if (state.hideTimer !== null) {
          clearTimeout(state.hideTimer);
          state.hideTimer = null;
        }
        panel.hidePopover?.();
        document.removeEventListener("keydown", state.onKeyDown);
      },
      onPanelPointerEnter() {
        // Cancel pending hide when pointer enters the tooltip panel
        if (state.hideTimer !== null) {
          clearTimeout(state.hideTimer);
          state.hideTimer = null;
        }
      },
      onPanelPointerLeave() {
        state.onHide();
      },
      onShow() {
        if (state.shown) return;
        if (state.hideTimer !== null) {
          clearTimeout(state.hideTimer);
          state.hideTimer = null;
        }
        panel.showPopover?.();
        requestAnimationFrame(() => syncTooltipArrow(el, panel, state.arrow));
        document.addEventListener("keydown", state.onKeyDown);
      },
      panel,
      shown: opts.shown,
    };
    (el as TooltipEl)._tooltip = state;

    if (!opts.disabled) {
      addListeners(el, state);
    }
    if (opts.shown) {
      panel.showPopover?.();
      requestAnimationFrame(() => syncTooltipArrow(el, panel, state.arrow));
      document.addEventListener("keydown", state.onKeyDown);
    }
  },

  unmounted(el) {
    const state = (el as TooltipEl)._tooltip;
    if (!state) return;

    if (state.hideTimer !== null) {
      clearTimeout(state.hideTimer);
    }
    removeListeners(el, state);
    el.style.removeProperty("anchor-name");
    el.removeAttribute("aria-describedby");
    state.panel.remove();
    delete (el as TooltipEl)._tooltip;
  },

  updated(el, binding) {
    const state = (el as TooltipEl)._tooltip;
    if (!state) return;

    const newOpts = normalize(binding.value);
    const oldOpts = normalize(binding.oldValue ?? binding.value);

    // applyPanel wipes children — re-append arrow immediately after
    applyPanel(state.panel, state.anchorName, newOpts);
    state.panel.appendChild(state.arrow);

    if (newOpts.disabled !== oldOpts.disabled) {
      if (!newOpts.disabled) {
        addListeners(el, state);
      } else {
        removeListeners(el, state);
        if (state.hideTimer !== null) {
          clearTimeout(state.hideTimer);
          state.hideTimer = null;
        }
        state.panel.hidePopover?.();
      }
    }

    if (newOpts.shown === oldOpts.shown) return;
    state.shown = newOpts.shown;
    if (newOpts.shown) {
      state.panel.showPopover?.();
      requestAnimationFrame(() => syncTooltipArrow(el, state.panel, state.arrow));
      document.addEventListener("keydown", state.onKeyDown);
      return;
    }
    if (state.hideTimer !== null) {
      clearTimeout(state.hideTimer);
      state.hideTimer = null;
    }
    state.panel.hidePopover?.();
    document.removeEventListener("keydown", state.onKeyDown);
  },
};
