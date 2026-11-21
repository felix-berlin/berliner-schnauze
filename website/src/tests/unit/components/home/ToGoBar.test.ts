import ToGoBar from "@components/home/ToGoBar.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { createStoreMockImpl } from "../../helpers/stores";

const isPwaInstalled = ref(false);

vi.mock("@stores/installApp.ts", () => ({ $isPwaInstalled: "isPwaInstalled" }));
vi.mock("@nanostores/vue", () => ({ useStore: vi.fn() }));

import { useStore } from "@nanostores/vue";

const mountBar = () => mount(ToGoBar, { global: { stubs: { InstallApp: true } } });

describe("ToGoBar", () => {
  beforeEach(() => {
    isPwaInstalled.value = false;
    vi.mocked(useStore).mockImplementation(
      createStoreMockImpl([["isPwaInstalled", isPwaInstalled]]),
    );
  });

  it("offers the app install and the Anki deck", async () => {
    const wrapper = mountBar();
    await nextTick(); // InstallApp replaces the server stand-in once mounted
    expect(wrapper.text()).toContain("Als App uffs Handy");
    expect(wrapper.findComponent({ name: "InstallApp" }).exists()).toBe(true);
    expect(wrapper.text()).toContain("Anki-Deck zum Lernen");
    expect(wrapper.get("a").attributes("href")).toBe("/anki");
    expect(wrapper.get("a").text()).toBe("Deck laden");
  });

  it("drops the app half when the app runs installed (standalone)", async () => {
    isPwaInstalled.value = true;
    const wrapper = mountBar();
    await nextTick();
    expect(wrapper.text()).not.toContain("Als App uffs Handy");
    expect(wrapper.findComponent({ name: "InstallApp" }).exists()).toBe(false);
    expect(wrapper.text()).toContain("Anki-Deck zum Lernen");
  });
});
