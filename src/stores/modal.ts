import { atom, map } from "nanostores";
import { markRaw, nextTick, isVNode } from "vue";

type ModalProps = {
  uid: string;
  showCloseButton: boolean;
  disableScroll: boolean;
  closeOnClickOutside: boolean;
  position: string;
  class: string;
  width: string;
};

type ModalView = {
  component?: object;
  props?: Record<string, any>;
  events?: Record<string, Function>;
};

type ModalSettings = {
  view?: ModalView;
  props?: Partial<ModalProps>;
};

const propsDefault: ModalProps = {
  uid: crypto.randomUUID(),
  showCloseButton: true,
  disableScroll: true,
  closeOnClickOutside: true,
  position: "center",
  class: "",
  width: "800px",
};

export const $isOpen = atom(false);
export const $view = atom<ModalView>({});
export const $props = map<ModalProps>({ ...propsDefault });
export const $element = atom<HTMLElement | null>(null);
export const $viewIsComponent = atom(false);
export const $onCloseCallback = atom<null | (() => void)>(null);
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
  settings: ModalSettings = { view: $view.get(), props: $props.get() },
  callback: null | (() => void) = null,
) => {
  $props.set({ ...$props.get(), ...settings.props });
  $isOpen.set(true);
  $viewIsComponent.set(isVueComponent(settings.view?.component));
  $view.set(markRaw(settings.view || {}));

  void nextTick(() => {
    const el = $element.get();
    if (el) el.showModal();
  });

  preventScroll(true);
  $onCloseCallback.set(callback);
};

export const close = () => {
  $isOpen.set(false);
  $view.set({});
  $props.set({ ...propsDefault });
  $viewIsComponent.set(false);

  const el = $element.get();

  if (el) el.close();

  preventScroll(false);

  const cb = $onCloseCallback.get();

  if (cb) {
    cb();
    $onCloseCallback.set(null);
  }
};

export const onClickOutside = (event: MouseEvent) => {
  const dialog = $element.get();
  console.log(event.target, dialog, !event.composedPath().includes(dialog));

  // Only close if the click was on the dialog backdrop, not on modal content
  if (event.target === dialog && $props.get().closeOnClickOutside) {
    // close();
  }
};

export const updateProps = (newProps: Partial<ModalProps>) => {
  $props.set({ ...$props.get(), ...newProps });
};
