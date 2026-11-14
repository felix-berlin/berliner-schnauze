import { atom, map } from "nanostores";
import { markRaw, nextTick } from "vue";

type ModalProps = {
  class: string;
  closeOnClickOutside: boolean;
  disableScroll: boolean;
  position: string;
  showCloseButton: boolean;
  uid?: string | undefined;
  width: string;
};

type ModalView = {
  component?: object;
  events?: Record<string, (...args: unknown[]) => void>;
  props?: Record<string, unknown>;
};

type ModalSettings = {
  props?: Partial<ModalProps>;
  view?: ModalView;
};

const propsDefault: ModalProps = {
  class: "",
  closeOnClickOutside: true,
  disableScroll: true,
  position: "center",
  showCloseButton: true,
  uid: undefined,
  width: "800px",
};

export const $view = atom<ModalView>({});
export const $props = map<ModalProps>({ ...propsDefault });
export const $element = atom<HTMLDialogElement | null>(null);

export const preventScroll = (status: boolean) => {
  if (!$props.get().disableScroll) return;
  document.body.classList.toggle("u-disable-scroll", status);
};

let resetTimer: ReturnType<typeof setTimeout> | undefined;

export const open = (settings: ModalSettings) => {
  // A close just before must not wipe this view when its reset timer fires.
  clearTimeout(resetTimer);
  $props.set({ ...$props.get(), ...settings.props });
  $view.set(markRaw(settings.view ?? {}));

  void nextTick(() => {
    const element = $element.get();
    if (element) return element.showModal();
    // The modal island has not hydrated yet: show it as soon as it registers.
    const off = $element.listen((el) => {
      if (!el) return;
      off();
      el.showModal();
    });
  });
};

export const close = () => {
  $element.get()?.close();
  resetModal();
};

export const resetModal = () => {
  preventScroll(false);
  // Give the animation time to finish
  if (typeof window !== "undefined") {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      $view.set({});
      $props.set({ ...propsDefault });
    }, 500);
  }
};
