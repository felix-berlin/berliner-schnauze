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
};

export type ToastPayload = Omit<ToastNotify, "id"> & {
  timeout?: null | number; // If null, toast will not be removed automatically
};

export type ToastStatus = "error" | "info" | "success" | "warning";

const removeToastTimeout = 400;
const defaultTimeout = 5000;

export const $toastNotify = atom<ToastNotify[]>([]);

/**
 * Checks if the browser supports the popover
 *
 * @return  {boolean}
 */
export const supportsPopover = (): boolean => {
  return Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover");
};

/**
 * Finds the current toast by id and hides it
 *
 * @param   {ToastPayload[]}  id
 *
 * @return  {void}
 */
const hidePopover = (id: ToastPayload["timeout"]) => {
  const toastDom = document.getElementById(`toast-${id}`);
  toastDom?.hidePopover();
};

/**
 * Creates a toast object
 *
 * @param   {ToastPayload}  payload
 *
 * @return  {ToastNotify}
 */
const createToast = (payload: ToastPayload): ToastNotify => ({
  id: Math.random() * 1000,
  ...payload,
});

/**
 * Adds a toast to the toastNotify store
 *
 * @param   {ToastPayload}  payload
 *
 * @return  {void}                      [return description]
 */
export const createToastNotify = (payload: ToastPayload): void => {
  if (!supportsPopover()) return;

  const { timeout } = payload;

  const toast = createToast(payload);

  $toastNotify.set([toast, ...$toastNotify.get()]);

  if (timeout !== null) {
    setTimeout(
      () => {
        const currentToast = $toastNotify.get().find((t) => t.id === toast.id);

        hidePopover(currentToast?.id);
      },
      (timeout ?? defaultTimeout) - removeToastTimeout,
    );

    setTimeout(() => {
      $toastNotify.set($toastNotify.get().filter((t) => t.id !== toast.id));
    }, timeout ?? defaultTimeout);
  }
};

/**
 * Removes a toast from the toastNotify store
 *
 * @param   {number}  id
 *
 * @return  {void}
 */
export const removeToastById = (
  id: `${string}-${string}-${string}-${string}-${string}` | number,
): void => {
  const currentToast = $toastNotify.get().find((t) => t.id === id);

  hidePopover(currentToast?.id);

  setTimeout(() => {
    $toastNotify.set($toastNotify.get().filter((t) => t.id !== id));
  }, removeToastTimeout);
};
