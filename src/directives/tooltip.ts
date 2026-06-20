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

    applyPanel(panel, anchorName, opts);
    el.style.setProperty("anchor-name", anchorName);
    el.setAttribute("aria-describedby", id);

    const state: TooltipState = {
      anchorName,
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

    applyPanel(state.panel, state.anchorName, newOpts);

    if (newOpts.disabled !== oldOpts.disabled) {
      if (newOpts.disabled) {
        removeListeners(el, state);
        if (state.hideTimer !== null) {
          clearTimeout(state.hideTimer);
          state.hideTimer = null;
        }
        state.panel.hidePopover?.();
      } else {
        addListeners(el, state);
      }
    }

    if (newOpts.shown !== oldOpts.shown) {
      state.shown = newOpts.shown;
      if (newOpts.shown) {
        state.panel.showPopover?.();
        document.addEventListener("keydown", state.onKeyDown);
      } else {
        if (state.hideTimer !== null) {
          clearTimeout(state.hideTimer);
          state.hideTimer = null;
        }
        state.panel.hidePopover?.();
        document.removeEventListener("keydown", state.onKeyDown);
      }
    }
  },
};
