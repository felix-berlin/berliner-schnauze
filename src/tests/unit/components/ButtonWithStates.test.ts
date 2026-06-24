import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("ButtonWithStates.vue", () => {
  it("renders a button in normal state", async () => {
    const ButtonWithStates = (await import("@components/ButtonWithStates.vue")).default;
    const wrapper = mount(ButtonWithStates);
    expect(wrapper.find("button").exists()).toBe(true);
    expect(wrapper.find("button").classes()).toContain("c-button--state-normal");
  });

  it("renders slot content in normal state", async () => {
    const ButtonWithStates = (await import("@components/ButtonWithStates.vue")).default;
    const wrapper = mount(ButtonWithStates, { slots: { default: "Absenden" } });
    expect(wrapper.text()).toContain("Absenden");
  });

  it("is disabled in loading state", async () => {
    const ButtonWithStates = (await import("@components/ButtonWithStates.vue")).default;
    const wrapper = mount(ButtonWithStates, { props: { state: "loading" } });
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });

  it("is not disabled in normal state", async () => {
    const ButtonWithStates = (await import("@components/ButtonWithStates.vue")).default;
    const wrapper = mount(ButtonWithStates, { props: { state: "normal" } });
    expect(wrapper.find("button").attributes("disabled")).toBeUndefined();
  });

  it("applies c-button--state-success class", async () => {
    const ButtonWithStates = (await import("@components/ButtonWithStates.vue")).default;
    const wrapper = mount(ButtonWithStates, { props: { state: "success" } });
    expect(wrapper.find("button").classes()).toContain("c-button--state-success");
  });

  it("applies c-button--state-error class", async () => {
    const ButtonWithStates = (await import("@components/ButtonWithStates.vue")).default;
    const wrapper = mount(ButtonWithStates, { props: { state: "error" } });
    expect(wrapper.find("button").classes()).toContain("c-button--state-error");
  });

  it("shows loading text in loading state", async () => {
    const ButtonWithStates = (await import("@components/ButtonWithStates.vue")).default;
    const wrapper = mount(ButtonWithStates, { props: { state: "loading" } });
    expect(wrapper.text()).toContain("Loading");
  });

  it("applies c-button--state-loading class", async () => {
    const ButtonWithStates = (await import("@components/ButtonWithStates.vue")).default;
    const wrapper = mount(ButtonWithStates, { props: { state: "loading" } });
    expect(wrapper.find("button").classes()).toContain("c-button--state-loading");
  });
});
