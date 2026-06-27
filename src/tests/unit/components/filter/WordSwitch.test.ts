import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@nanostores/vue", () => ({
  useVModel: vi.fn(() => ({ value: false })),
}));

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: {},
}));

describe("WordSwitch.vue", () => {
  it("renders a checkbox input", async () => {
    const WordSwitch = (await import("@components/filter/WordSwitch.vue")).default;
    const wrapper = mount(WordSwitch, {
      props: { label: "Berolinismus", switchType: "berolinismus" },
    });
    expect(wrapper.find("input[type='checkbox']").exists()).toBe(true);
  });

  it("renders the label text", async () => {
    const WordSwitch = (await import("@components/filter/WordSwitch.vue")).default;
    const wrapper = mount(WordSwitch, {
      props: { label: "Audio Berlinerisch", switchType: "audioBerlinerisch" },
    });
    expect(wrapper.find("label").text()).toBe("Audio Berlinerisch");
  });

  it("toggling checkbox executes v-model handler (covers line 5)", async () => {
    const WordSwitch = (await import("@components/filter/WordSwitch.vue")).default;
    const wrapper = mount(WordSwitch, { props: { label: "Test", switchType: "berolinismus" } });
    const input = wrapper.find("input[type='checkbox']");
    await input.setValue(true);
    expect((input.element as HTMLInputElement).checked).toBe(true);
  });

  it("input id matches label for attribute", async () => {
    const WordSwitch = (await import("@components/filter/WordSwitch.vue")).default;
    const wrapper = mount(WordSwitch, {
      props: { label: "Mehrere Bedeutungen", switchType: "multipleMeanings" },
    });
    const inputId = wrapper.find("input").attributes("id");
    const labelFor = wrapper.find("label").attributes("for");
    expect(inputId).toBeTruthy();
    expect(inputId).toBe(labelFor);
  });
});
