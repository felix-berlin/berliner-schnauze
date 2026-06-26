import SortWordBySelect from "@components/filter/SortWordBySelect.vue";
import { $setSortOrder } from "@stores/wordList.ts";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@stores/wordList.ts", () => ({
  $setSortOrder: vi.fn(),
}));

describe("SortWordBySelect.vue", () => {
  it("renders correctly", () => {
    const wrapper = mount(SortWordBySelect);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders a select element with id=sort and name=sort", () => {
    const wrapper = mount(SortWordBySelect);
    const select = wrapper.find("select");
    expect(select.exists()).toBe(true);
    expect(select.attributes("id")).toBe("sort");
    expect(select.attributes("name")).toBe("sort");
  });

  it("renders at least 3 optgroups (Alphabetisch, Datum, Änderungsdatum)", () => {
    const wrapper = mount(SortWordBySelect);
    const optgroups = wrapper.findAll("optgroup");
    expect(optgroups.length).toBeGreaterThanOrEqual(3);
    const labels = optgroups.map((g) => g.attributes("label"));
    expect(labels).toContain("Alphabetisch");
    expect(labels).toContain("Datum");
    expect(labels).toContain("Änderungsdatum");
  });

  it("has at least 6 options total", () => {
    const wrapper = mount(SortWordBySelect);
    const options = wrapper.findAll("option");
    expect(options.length).toBeGreaterThanOrEqual(6);
  });

  it("default selected option is Alphabetisch (A - Z)", () => {
    const wrapper = mount(SortWordBySelect);
    const options = wrapper.findAll("option");
    const firstOption = options[0];
    expect(firstOption.text()).toBe("Alphabetisch (A - Z)");
  });

  it("calls $setSortOrder when an option is selected", async () => {
    const wrapper = mount(SortWordBySelect);
    const select = wrapper.find("select");
    await select.setValue({
      name: "Alphabetisch (A - Z)",
      category: "alphabetical",
      sort: "ASC",
    });
    expect($setSortOrder).toHaveBeenCalledWith("alphabetical", "alphabeticalOrder", "ASC");
  });
});
