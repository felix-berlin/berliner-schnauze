import { atom } from "nanostores";

export type ToastNotify = {
  closeOnSwipe?: boolean;
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

export type ToastPayload = Omit<ToastNotify, "id">;

export type ToastStatus = "error" | "info" | "success" | "warning";

const removeToastTimeout = 400;
const defaultTimeout = 5000;

export const $toastNotify = atom<ToastNotify[]>([]);

const hidePopover = (id: number) => {
  document.getElementById(`toast-${id}`)?.hidePopover();
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
    setTimeout(
      () => {
        hidePopover(toast.id!);
      },
      (timeout ?? defaultTimeout) - removeToastTimeout,
    );

    setTimeout(() => {
      $toastNotify.set($toastNotify.get().filter((t) => t.id !== toast.id));
    }, timeout ?? defaultTimeout);
  }
};

export const removeToastById = (id: number): void => {
  const el = document.getElementById(`toast-${id}`);
  if (el) el.dataset.closing = "true";
  el?.hidePopover();

  setTimeout(() => {
    $toastNotify.set($toastNotify.get().filter((t) => t.id !== id));
  }, removeToastTimeout);
};
