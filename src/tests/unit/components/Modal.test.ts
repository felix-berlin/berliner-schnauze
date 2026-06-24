import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

// Mock modal store exports
const mockView = ref({});
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
const mockResetModal = vi.fn();
const mockSetElement = vi.fn();

vi.mock("@stores/modal.ts", () => ({
  $element: { set: mockSetElement },
  $isOpen: { set: vi.fn() },
  $props: {},
  $view: {},
  $viewIsComponent: {},
  preventScroll: vi.fn(),
  resetModal: mockResetModal,
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn((store) => {
    // Return the correct ref based on which store is used.
    // Since vi.mock hoisting means we can't reference the mock atoms directly,
    // we differentiate by identity via a WeakMap set after the fact.
    // Instead, track call order: $view first, $props second, $viewIsComponent third.
    return mockView;
  }),
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useMutationObserver: vi.fn(),
  };
});

beforeEach(() => {
  vi.resetModules();
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
});

describe("Modal.vue", () => {
  it("renders a <dialog> element", async () => {
    const Modal = (await import("@components/Modal.vue")).default;
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").exists()).toBe(true);
  });

  it("dialog has class c-modal", async () => {
    const Modal = (await import("@components/Modal.vue")).default;
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").classes()).toContain("c-modal");
  });

  it("dialog has aria-modal=true attribute", async () => {
    const Modal = (await import("@components/Modal.vue")).default;
    const wrapper = mount(Modal);
    expect(wrapper.find("dialog").attributes("aria-modal")).toBe("true");
  });

  it("renders without errors", async () => {
    const Modal = (await import("@components/Modal.vue")).default;
    expect(() => mount(Modal)).not.toThrow();
  });
});
