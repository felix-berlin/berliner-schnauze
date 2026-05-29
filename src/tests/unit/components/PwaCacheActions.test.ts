import PwaCacheActions from "@components/PwaCacheActions.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("PwaCacheActions", () => {
  it("renders 3 buttons", () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: false, hasNoBuckets: false } });
    expect(wrapper.findAll("button")).toHaveLength(3);
  });

  it("Aktualisieren disabled when isLoading", () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: true, hasNoBuckets: false } });
    expect(wrapper.findAll("button")[0].attributes("disabled")).toBeDefined();
  });

  it("Aktualisieren enabled when not loading", () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: false, hasNoBuckets: false } });
    expect(wrapper.findAll("button")[0].attributes("disabled")).toBeUndefined();
  });

  it("Alles leeren disabled when hasNoBuckets", () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: false, hasNoBuckets: true } });
    expect(wrapper.findAll("button")[1].attributes("disabled")).toBeDefined();
  });

  it("Alles leeren disabled when isLoading", () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: true, hasNoBuckets: false } });
    expect(wrapper.findAll("button")[1].attributes("disabled")).toBeDefined();
  });

  it("Re-sync never disabled", () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: true, hasNoBuckets: true } });
    expect(wrapper.findAll("button")[2].attributes("disabled")).toBeUndefined();
  });

  it("emits refresh on Aktualisieren click", async () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: false, hasNoBuckets: false } });
    await wrapper.findAll("button")[0].trigger("click");
    expect(wrapper.emitted("refresh")).toHaveLength(1);
  });

  it("emits clear-all on Alles leeren click", async () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: false, hasNoBuckets: false } });
    await wrapper.findAll("button")[1].trigger("click");
    expect(wrapper.emitted("clear-all")).toHaveLength(1);
  });

  it("emits resync on Re-sync click", async () => {
    const wrapper = mount(PwaCacheActions, { props: { isLoading: false, hasNoBuckets: false } });
    await wrapper.findAll("button")[2].trigger("click");
    expect(wrapper.emitted("resync")).toHaveLength(1);
  });
});
