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

export const open = (settings: ModalSettings) => {
  $props.set({ ...$props.get(), ...settings.props });
  $view.set(markRaw(settings.view ?? {}));

  void nextTick(() => $element.get()?.showModal());
};

export const close = () => {
  $element.get()?.close();
  resetModal();
};

export const resetModal = () => {
  preventScroll(false);
  // Give the animation time to finish
  if (typeof window !== "undefined") {
    setTimeout(() => {
      $view.set({});
      $props.set({ ...propsDefault });
    }, 500);
  }
};
