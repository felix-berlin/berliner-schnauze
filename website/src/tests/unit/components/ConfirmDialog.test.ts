import ConfirmDialog from "@components/ConfirmDialog.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("ConfirmDialog.vue", () => {
  it("renders the message prop", () => {
    const wrapper = mount(ConfirmDialog, { props: { message: "Are you sure?" } });
    expect(wrapper.find(".c-confirm-dialog__message").text()).toBe("Are you sure?");
  });

  it("has a cancel button with text Abbrechen", () => {
    const wrapper = mount(ConfirmDialog, { props: { message: "" } });
    const buttons = wrapper.findAll("button");
    expect(buttons.some((b) => b.text() === "Abbrechen")).toBe(true);
  });

  it("has a confirm button with text Bestätigen", () => {
    const wrapper = mount(ConfirmDialog, { props: { message: "" } });
    const buttons = wrapper.findAll("button");
    expect(buttons.some((b) => b.text() === "Bestätigen")).toBe(true);
  });

  it("emits confirm when confirm button is clicked", async () => {
    const wrapper = mount(ConfirmDialog, { props: { message: "" } });
    const confirmBtn = wrapper.findAll("button").find((b) => b.text() === "Bestätigen")!;
    await confirmBtn.trigger("click");
    expect(wrapper.emitted("confirm")).toBeTruthy();
  });

  it("emits cancel when cancel button is clicked", async () => {
    const wrapper = mount(ConfirmDialog, { props: { message: "" } });
    const cancelBtn = wrapper.findAll("button").find((b) => b.text() === "Abbrechen")!;
    await cancelBtn.trigger("click");
    expect(wrapper.emitted("cancel")).toBeTruthy();
  });
});
