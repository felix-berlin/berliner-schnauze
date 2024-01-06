import { action, atom } from "nanostores";

export type ToastStatus = "success" | "error" | "info" | "warning";

export type ToastNotify = {
  id?: number;
  message: string;
  status?: ToastStatus;
  showStatusIcon?: boolean;
  showClose?: boolean;
  closeOnSwipe?: boolean;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  outerSpacing?: string;
  gapBetween?: number;
  initOffset?: number;
};

export type ToastPayload = Omit<ToastNotify, "id"> & {
  timeout?: number | null; // If null, toast will not be removed automatically
};

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
export const createToastNotify = action(
  $toastNotify,
  "createToastNotify",
  (store, payload: ToastPayload) => {
    if (!supportsPopover()) return;

    const { timeout } = payload;

    const toast = createToast(payload);

    store.set([toast, ...store.get()]);

    if (timeout !== null) {
      setTimeout(
        () => {
          const currentToast = store.get().find((t) => t.id === toast.id);

          hidePopover(currentToast?.id);
        },
        (timeout ?? defaultTimeout) - removeToastTimeout,
      );

      setTimeout(() => {
        store.set(store.get().filter((t) => t.id !== toast.id));
      }, timeout ?? defaultTimeout);
    }
  },
);

/**
 * Removes a toast from the toastNotify store
 *
 * @param   {number}  id
 *
 * @return  {void}
 */
export const removeToastById = action($toastNotify, "removeToastById", (store, id: number) => {
  const currentToast = store.get().find((t) => t.id === id);

  hidePopover(currentToast?.id);

  setTimeout(() => {
    store.set(store.get().filter((t) => t.id !== id));
  }, removeToastTimeout);
});
