import { atom } from "nanostores";

export type ToastNotify = {
  closeOnSwipe?: boolean;
  // Internal flag — set ~250ms after hidePopover() to remove toast from anchor chain
  // BEFORE display:none (300ms), avoiding an invalid-anchor → top:auto snap.
  closing?: boolean;
  gapBetween?: number;
  id?: number;
  initOffset?: number;
  message: string;
  outerSpacing?: string;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  showClose?: boolean;
  showStatusIcon?: boolean;
  status?: ToastStatus;
  timeout?: null | number; // If null, toast will not be removed automatically
};

export type ToastPayload = Omit<ToastNotify, "id" | "closing">;

export type ToastStatus = "error" | "info" | "success" | "warning";

const removeToastTimeout = 400;
// Must fire before the 300ms CSS exit transition ends (display:none invalidates anchors).
const closingMarkDelay = 250;
const defaultTimeout = 5000;

export const $toastNotify = atom<ToastNotify[]>([]);

const hidePopover = (id: number) => {
  document.getElementById(`toast-${id}`)?.hidePopover();
};

const markClosing = (id: number) => {
  $toastNotify.set($toastNotify.get().map((t) => (t.id === id ? { ...t, closing: true } : t)));
};

const createToast = (payload: ToastPayload): ToastNotify => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  ...payload,
});

export const createToastNotify = (payload: ToastPayload): void => {
  const { timeout } = payload;
  const toast = createToast(payload);

  // Append (not prepend) — CSS Anchor Positioning requires an anchor to enter the
  // top layer BEFORE the element that references it. Array order = showPopover() order
  // = top-layer entry order, so each toast can only anchor to earlier array entries.
  $toastNotify.set([...$toastNotify.get(), toast]);

  if (timeout !== null) {
    const hideAt = (timeout ?? defaultTimeout) - removeToastTimeout;

    setTimeout(() => {
      hidePopover(toast.id!);
    }, hideAt);

    setTimeout(() => {
      markClosing(toast.id!);
    }, hideAt + closingMarkDelay);

    setTimeout(() => {
      $toastNotify.set($toastNotify.get().filter((t) => t.id !== toast.id));
    }, timeout ?? defaultTimeout);
  }
};

export const removeToastById = (id: number): void => {
  document.getElementById(`toast-${id}`)?.hidePopover();

  setTimeout(() => {
    markClosing(id);
  }, closingMarkDelay);

  setTimeout(() => {
    $toastNotify.set($toastNotify.get().filter((t) => t.id !== id));
  }, removeToastTimeout);
};
