import { atom } from "nanostores";

export type ToastPosition =
  | "bottom-center" | "bottom-left" | "bottom-right"
  | "top-center"    | "top-left"    | "top-right";

export type ToastNotify = {
  actionLabel?: string;
  closeOnSwipe?: boolean;
  id?: string;
  message: string;
  onAction?: () => void;
  position?: ToastPosition;
  showClose?: boolean;
  showStatusIcon?: boolean;
  status?: ToastStatus;
};

export type ToastPayload = Omit<ToastNotify, "id"> & {
  timeout?: null | number;
};

export type ToastStatus = "error" | "info" | "success" | "warning";

const MAX_PER_POSITION = 3;
const defaultTimeout = 5000;

export const $toastNotify = atom<ToastNotify[]>([]);

export const supportsPopover = (): boolean =>
  Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover");

const createToast = (payload: ToastPayload): ToastNotify => ({
  id: crypto.randomUUID(),
  ...payload,
});

export const createToastNotify = (payload: ToastPayload): void => {
  if (!supportsPopover()) return;

  const pos = payload.position ?? "top-right";
  const current = $toastNotify.get();
  const forPos = current.filter((t) => (t.position ?? "top-right") === pos);

  let updated = current;
  if (forPos.length >= MAX_PER_POSITION) {
    const oldest = forPos.at(-1)!;
    updated = current.filter((t) => t.id !== oldest.id);
  }

  const toast = createToast(payload);
  $toastNotify.set([toast, ...updated]);

  const { timeout } = payload;
  if (timeout !== null) {
    setTimeout(() => {
      $toastNotify.set($toastNotify.get().filter((t) => t.id !== toast.id));
    }, timeout ?? defaultTimeout);
  }
};

export const removeToastById = (id: string): void => {
  $toastNotify.set($toastNotify.get().filter((t) => t.id !== id));
};
