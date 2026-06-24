import Modal from "@components/Modal.vue";
import { useStore } from "@nanostores/vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const {
  mockResetModal,
  mockSetElement,
  mockPreventScroll,
  mockSetIsOpen,
} = vi.hoisted(() => ({
  mockResetModal: vi.fn(),
  mockSetElement: vi.fn(),
  mockPreventScroll: vi.fn(),
  mockSetIsOpen: vi.fn(),
}));

let capturedMutationCallback: ((mutations: MutationRecord[]) => void) | null = null;

vi.mock("@stores/modal.ts", () => ({
  $element: { set: mockSetElement },
  $isOpen: { set: mockSetIsOpen },
  $props: {},
  $view: {},
  $viewIsComponent: {},
  preventScroll: mockPreventScroll,
  resetModal: mockResetModal,
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(),
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useMutationObserver: vi.fn((_, cb: (mutations: MutationRecord[]) => void) => {
      capturedMutationCallback = cb;
    }),
  };
});

const mockView = ref<Record<string, unknown>>({});
const mockProps = ref({
  class: "",
  closeOnClickOutside: true,
  disableScroll: true,
  position: "center",
  showCloseButton: true,
  uid: undefined as string | undefined,
  width: "800px",
});
const mockViewIsComponent = ref(false);

function setupUseStore(
  view = mockView,
  props = mockProps,
  viewIsComponent = mockViewIsComponent,
) {
  vi.mocked(useStore).mockReset();
  vi.mocked(useStore)
    .mockReturnValueOnce(view)
    .mockReturnValueOnce(props)
    .mockReturnValueOnce(viewIsComponent);
}

beforeEach(() => {
  capturedMutationCallback = null;
  mockView.value = {};
  mockProps.value = {
    class: "",
    closeOnClickOutside: true,
    disableScroll: true,
    position: "center",
    showCloseButton: true,
    uid: undefined,
    width: "800px",
  };
  mockViewIsComponent.value = false;
  mockResetModal.mockClear();
  mockSetElement.mockClear();
  mockSetIsOpen.mockClear();
  mockPreventScroll.mockClear();
  setupUseStore();
});

describe("Modal.vue", () => {
  it("renders a <dialog> element", () => {
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").exists()).toBe(true);
  });

  it("dialog has class c-modal", () => {
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").classes()).toContain("c-modal");
  });

  it("dialog has aria-modal=true attribute", () => {
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").attributes("aria-modal")).toBe("true");
  });

  it("close event triggers resetModal", async () => {
    const wrapper = mount(Modal);
    await wrapper.find("dialog").trigger("close");
    expect(mockResetModal).toHaveBeenCalledOnce();
  });

  it("applies position class from props", () => {
    mockProps.value = { ...mockProps.value, position: "bottom" };
    setupUseStore();
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").classes()).toContain("c-modal--bottom");
  });

  it("applies has-close-on-click-outside class when closeOnClickOutside is true", () => {
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").classes()).toContain("has-close-on-click-outside");
  });

  it("does not apply has-close-on-click-outside when false", () => {
    mockProps.value = { ...mockProps.value, closeOnClickOutside: false };
    setupUseStore();
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").classes()).not.toContain("has-close-on-click-outside");
  });

  it("MutationObserver callback sets $isOpen.set(true) when dialog opens", () => {
    mount(Modal);
    const fakeDialog = Object.assign(document.createElement("dialog"), { open: true });
    capturedMutationCallback?.([{ target: fakeDialog } as unknown as MutationRecord]);
    expect(mockSetIsOpen).toHaveBeenCalledWith(true);
  });

  it("MutationObserver callback calls preventScroll(true) when disableScroll and dialog opens", () => {
    mount(Modal);
    const fakeDialog = Object.assign(document.createElement("dialog"), { open: true });
    capturedMutationCallback?.([{ target: fakeDialog } as unknown as MutationRecord]);
    expect(mockPreventScroll).toHaveBeenCalledWith(true);
  });

  it("MutationObserver callback sets $isOpen.set(false) when dialog closes", () => {
    mount(Modal);
    const fakeDialog = Object.assign(document.createElement("dialog"), { open: false });
    capturedMutationCallback?.([{ target: fakeDialog } as unknown as MutationRecord]);
    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  it("MutationObserver callback skips empty mutations array", () => {
    mount(Modal);
    capturedMutationCallback?.([]);
    expect(mockSetIsOpen).not.toHaveBeenCalled();
  });

  it("registers the dialog element via $element.set on mount", () => {
    mount(Modal);
    expect(mockSetElement).toHaveBeenCalledOnce();
  });
});
