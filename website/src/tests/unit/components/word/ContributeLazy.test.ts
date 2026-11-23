// @vitest-environment jsdom
import ContributeLazy from "@components/word/ContributeLazy.vue";
import { closeContributeForm, openContributeForm, openForm } from "@stores/contribute.ts";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

const loaded = vi.fn();
vi.mock("@components/word/ContributeForm.vue", () => {
  loaded();
  return {
    __esModule: true,
    default: defineComponent({
      props: { type: { required: true, type: String }, word: { required: true, type: String } },
      setup: (p) => () => h("div", { class: "form", "data-type": p.type }),
    }),
  };
});

describe("ContributeLazy", () => {
  beforeEach(() => openForm.set(null));

  it("renders nothing and does not load the form until its own type opens", async () => {
    const w = mount(ContributeLazy, { props: { type: "example", word: "x" } });
    openContributeForm("fact");
    await flushPromises();
    expect(w.find(".form").exists()).toBe(false);
    expect(loaded).not.toHaveBeenCalled();
    openContributeForm("example");
    await flushPromises();
    expect(w.find(".form").attributes("data-type")).toBe("example");
  });

  it("opens at once when the store was set before the island hydrated, and stays mounted after close", async () => {
    openContributeForm("error");
    const w = mount(ContributeLazy, { props: { type: "error", word: "x" } });
    await flushPromises();
    expect(w.find(".form").exists()).toBe(true);
    closeContributeForm("error");
    await flushPromises();
    expect(w.find(".form").exists()).toBe(true);
  });
});
