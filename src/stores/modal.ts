import { atom, map } from "nanostores";
import { isVNode, markRaw, nextTick } from "vue";

type ModalProps = {
  class: string;
  closeOnClickOutside: boolean;
  disableScroll: boolean;
  position: string;
  showCloseButton: boolean;
  uid?: string | undefined;
  width: string;
};

type ModalSettings = {
  props?: Partial<ModalProps>;
  view?: ModalView | string;
};

type ModalView = {
  component?: object;
  events?: Record<string, (...args: any[]) => void>;
  props?: Record<string, any>;
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

export const $isOpen = atom(false);
export const $view = atom<ModalView>({});
export const $props = map<ModalProps>({ ...propsDefault });
export const $element = atom<HTMLDialogElement | null>(null);
export const $viewIsComponent = atom(false);
export const $onCloseCallback = atom<(() => void) | null>(null);
export const $scrollPosition = atom<number>(0);

export const isVueComponent = (content: any): boolean => {
  return (
    content &&
    typeof content === "object" &&
    (typeof content.render === "function" ||
      typeof content.setup === "function" ||
      isVNode(content))
  );
};

export const preventScroll = (status: boolean) => {
  if ($props.get().disableScroll && status) {
    document.body.classList.add("u-disable-scroll");
  }
  if ($props.get().disableScroll && !status) {
    document.body.classList.remove("u-disable-scroll");
  }
};

export const open = (
  settings: ModalSettings = { props: $props.get(), view: $view.get() },
  callback: (() => void) | null = null,
) => {
  $props.set({ ...$props.get(), ...settings.props });
  $viewIsComponent.set(isVueComponent(settings.view?.component));
  $view.set(markRaw(settings.view || {}));

  void nextTick(() => {
    const el = $element.get();
    if (el) el.showModal();
  });

  $onCloseCallback.set(callback);
};

export const close = () => {
  const el = $element.get();

  if (el) el.close();
  resetModal();

  const cb = $onCloseCallback.get();

  if (typeof cb === "function") {
    cb();
    $onCloseCallback.set(null);
  }
};

export const resetModal = () => {
  if ($props.get().disableScroll) {
    preventScroll(false);
  }
  // Give the animation time to finish
  if (typeof window !== "undefined") {
    setTimeout(() => {
      $view.set({});
      $props.set({ ...propsDefault });
      $viewIsComponent.set(false);
    }, 500);
  }
};

export const updateProps = (newProps: Partial<ModalProps>) => {
  $props.set({ ...$props.get(), ...newProps });
};
