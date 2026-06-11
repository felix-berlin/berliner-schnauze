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

export const $toastNotify = atom<ToastNotify[]>([]);

export const createToastNotify = (payload: ToastPayload): void => {
  $toastNotify.set([
    ...$toastNotify.get(),
    { id: Date.now() + Math.floor(Math.random() * 1000), ...payload },
  ]);
};

export const markClosing = (id: number): void => {
  $toastNotify.set($toastNotify.get().map((t) => (t.id === id ? { ...t, closing: true } : t)));
};

export const removeToast = (id: number): void => {
  $toastNotify.set($toastNotify.get().filter((t) => t.id !== id));
};
