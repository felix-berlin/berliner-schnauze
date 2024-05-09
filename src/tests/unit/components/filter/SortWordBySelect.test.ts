import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import SortWordBySelect from "@components/filter/SortWordBySelect.vue";
import { $setSortOrder } from "@stores/index.ts";

vi.mock("@stores/index.ts", () => ({
  $setSortOrder: vi.fn(),
}));

describe("SortWordBySelect.vue", () => {
  it("renders correctly", () => {
    const wrapper = mount(SortWordBySelect);
    expect(wrapper.exists()).toBe(true);
  });

  it("calls $setSortOrder when an option is selected", async () => {
    const wrapper = mount(SortWordBySelect);
    const select = wrapper.find("select");
    await select.setValue({ name: "Alphabetisch (A - Z)", category: "alphabetical", sort: "asc" });
    expect($setSortOrder).toHaveBeenCalledWith("alphabetical", "alphabeticalOrder", "asc");
  });
});
