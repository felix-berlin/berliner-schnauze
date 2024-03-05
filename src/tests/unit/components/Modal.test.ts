import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import Modal from "@components/Modal.vue";
import sinon from "sinon";

describe("Modal", () => {
  beforeEach(() => {
    window.HTMLDialogElement.prototype.showModal = vi.fn();
    window.HTMLDialogElement.prototype.close = vi.fn();
  });

  it('hides close button when "showCloseButton" prop is false', () => {
    const wrapper = mount(Modal, {
      props: {
        showCloseButton: false,
      },
    });

    expect(wrapper.find(".c-modal__close").exists()).toBe(false);
  });

  it('opens the modal when "open" prop is true', async () => {
    const wrapper = mount(Modal, {
      props: {
        uid: "test",
        open: true,
      },
    });

    await wrapper.vm.$nextTick();

    // Check if the modal is visible
    expect(wrapper.vm.isVisible).toBe(true);
  });

  it('closes the modal when "open" prop is false', async () => {
    const wrapper = mount(Modal, {
      props: {
        uid: "test",
        open: false,
      },
    });

    await wrapper.vm.$nextTick();

    // Check if the modal is not visible
    expect(wrapper.vm.isVisible).toBe(false);
  });

  it('prevents scroll when "disableScroll" prop is true', async () => {
    const wrapper = mount(Modal, {
      props: {
        uid: "test",
        disableScroll: true,
      },
    });

    await wrapper.vm.openModal();

    // Check if the body has the 'u-disable-scroll' class
    expect(document.body.classList.contains("u-disable-scroll")).toBe(true);
  });

  it("closes the modal when clicking outside of it", async () => {
    const wrapper = mount(Modal, {
      props: {
        uid: "test",
        closeOnClickOutside: true,
      },
      attachTo: document.body,
    });

    await wrapper.vm.openModal();

    // Simulate a click event on the modal
    await wrapper.get("dialog").trigger("click");

    // Check if the modal is not visible
    expect(wrapper.vm.isVisible).toBe(false);
  });

  it('opens and closes the modal when "open" prop changes', async () => {
    const wrapper = mount(Modal, {
      props: {
        uid: "test",
        open: false,
      },
    });

    await wrapper.vm.$nextTick();

    // Check if the modal is not visible
    expect(wrapper.vm.isVisible).toBe(false);

    // Update the "open" prop
    await wrapper.setProps({ open: true });

    // Check if the modal is visible
    expect(wrapper.vm.isVisible).toBe(true);

    // Update the "open" prop
    await wrapper.setProps({ open: false });

    // Check if the modal is not visible
    expect(wrapper.vm.isVisible).toBe(false);
  });

  it("adds and removes click event listener when mounted and unmounted", async () => {
    const addEventListenerSpy = sinon.spy(HTMLDialogElement.prototype, "addEventListener");
    const removeEventListenerSpy = sinon.spy(HTMLDialogElement.prototype, "removeEventListener");

    const wrapper = mount(Modal, {
      props: {
        uid: "test",
        closeOnClickOutside: true,
      },
    });

    await nextTick();

    // Check if the event listener was added
    expect(addEventListenerSpy.calledWith("click")).toBe(true);

    // Unmount the component
    wrapper.unmount();

    // Check if the event listener was removed
    expect(removeEventListenerSpy.calledWith("click")).toBe(true);

    // Restore the original functions
    addEventListenerSpy.restore();
    removeEventListenerSpy.restore();
  });
});
