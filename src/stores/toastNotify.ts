import { atom } from "nanostores";

export type ToastNotify = {
  closeOnSwipe?: boolean;
  // Internal flag — set when the exit animation has finished (together with
  // hidePopover()) so the toast leaves the active anchor chain before
  // display:none could invalidate it as an anchor (top:auto snap).
  closing?: boolean;
  id?: number;
  message: string;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  showClose?: boolean;
  showStatusIcon?: boolean;
  status?: ToastStatus;
  timeout?: null | number; // If null, toast will not be removed automatically
};

export type ToastPayload = Omit<ToastNotify, "id" | "closing">;

export type ToastStatus = "error" | "info" | "success" | "warning";

export const $toastNotify = atom<ToastNotify[]>([]);

// Monotonic counter — collision-free, unlike Date.now()+random which can clash
// when several toasts are created in the same millisecond (burst).
let nextToastId = 0;

export const createToastNotify = (payload: ToastPayload): void => {
  $toastNotify.set([...$toastNotify.get(), { id: ++nextToastId, ...payload }]);
};

export const markClosing = (id: number): void => {
  $toastNotify.set($toastNotify.get().map((t) => (t.id === id ? { ...t, closing: true } : t)));
};

export const removeToast = (id: number): void => {
  $toastNotify.set($toastNotify.get().filter((t) => t.id !== id));
};
