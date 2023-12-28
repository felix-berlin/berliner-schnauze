import { computed, action, atom } from "nanostores";

export type ToastStatus = "success" | "error" | "info" | "warning";

export type ToastNotify = {
  message: string;
  status: ToastStatus;
  id: number;
};

export type ToastPayload = {
  timeout?: number | null;
  message: string;
};

const defaultTimeout = 5000;

export const $toastNotify = atom<ToastNotify[]>([]);

const createToast = (message: string, status: ToastStatus): ToastNotify => ({
  message,
  status,
  id: Math.random() * 1000,
});

export const addToast = action(
  $toastNotify,
  "addToast",
  (store, payload: ToastPayload, status: ToastStatus) => {
    const { message, timeout } = payload;

    const toast = createToast(message, status);

    store.set([toast, ...store.get()]);

    if (timeout !== null) {
      setTimeout(() => {
        store.set(store.get().filter((t) => t.id !== toast.id));
      }, timeout ?? defaultTimeout);
    }
  },
);

export const removeToastById = action($toastNotify, "removeToastById", (store, id: number) => {
  store.set(store.get().filter((t) => t.id !== id));
});

export const createToastNotify = (payload: ToastPayload, status: ToastStatus) => {
  addToast(payload, status);
};
