import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@stores/modal.ts", () => ({ close: vi.fn() }));

vi.mock("virtual:icons/lucide/x", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span />" } };
});

import { close } from "@stores/modal.ts";
const mockedClose = vi.mocked(close);

describe("ModalCloseButton.vue", () => {
  it("renders button with aria-label=schließen", async () => {
    const ModalCloseButton = (await import("@components/ModalCloseButton.vue")).default;
    const wrapper = mount(ModalCloseButton);
    expect(wrapper.find("button").attributes("aria-label")).toBe("schließen");
  });

  it("click calls close() from modal store and emits close", async () => {
    mockedClose.mockClear();
    const ModalCloseButton = (await import("@components/ModalCloseButton.vue")).default;
    const wrapper = mount(ModalCloseButton);
    await wrapper.find("button").trigger("click");
    expect(mockedClose).toHaveBeenCalled();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("does not have has-prefix class when no prefix slot", async () => {
    const ModalCloseButton = (await import("@components/ModalCloseButton.vue")).default;
    const wrapper = mount(ModalCloseButton);
    expect(wrapper.find("button").classes()).not.toContain("has-prefix");
  });

  it("does not have has-suffix class when no suffix slot", async () => {
    const ModalCloseButton = (await import("@components/ModalCloseButton.vue")).default;
    const wrapper = mount(ModalCloseButton);
    expect(wrapper.find("button").classes()).not.toContain("has-suffix");
  });

  it("has has-prefix class when prefix slot is provided", async () => {
    const ModalCloseButton = (await import("@components/ModalCloseButton.vue")).default;
    const wrapper = mount(ModalCloseButton, {
      slots: { prefix: "<span>Pre</span>" },
    });
    expect(wrapper.find("button").classes()).toContain("has-prefix");
  });

  it("has has-suffix class when suffix slot is provided", async () => {
    const ModalCloseButton = (await import("@components/ModalCloseButton.vue")).default;
    const wrapper = mount(ModalCloseButton, {
      slots: { suffix: "<span>Suf</span>" },
    });
    expect(wrapper.find("button").classes()).toContain("has-suffix");
  });
});
