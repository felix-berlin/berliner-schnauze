import SortWordBySelect from "@components/filter/SortWordBySelect.vue";
import { $setSortOrder, $wordSearch } from "@stores/wordList.ts";
import { mount } from "@vue/test-utils";
import { map } from "nanostores";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/wordList.ts", async () => {
  const { map } = await import("nanostores");
  return {
    $setSortOrder: vi.fn(),
    $wordSearch: map({
      activeOrderCategory: "relevance",
      alphabeticalOrder: "ASC",
      dateOrder: "ASC",
      modifiedDateOrder: "ASC",
    }),
  };
});

const store = $wordSearch as unknown as ReturnType<typeof map>;

describe("SortWordBySelect.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.setKey("activeOrderCategory", "relevance");
  });

  it("renders a select element with id=sort and name=sort", () => {
    const select = mount(SortWordBySelect).find("select");
    expect(select.attributes("id")).toBe("sort");
    expect(select.attributes("name")).toBe("sort");
  });

  it("offers relevance, alphabetical, date and modified date groups", () => {
    const labels = mount(SortWordBySelect)
      .findAll("optgroup")
      .map((g) => g.attributes("label"));
    expect(labels).toEqual(["Relevanz", "Alphabetisch", "Datum", "Änderungsdatum"]);
    expect(mount(SortWordBySelect).findAll("option")).toHaveLength(7);
  });

  it("shows best hits first by default", () => {
    const select = mount(SortWordBySelect).find("select").element as HTMLSelectElement;
    expect(select.selectedOptions[0].text.trim()).toBe("Beste Treffer zuerst");
  });

  it("shows the persisted sort instead of the first option", () => {
    store.setKey("activeOrderCategory", "date");
    store.setKey("dateOrder", "DESC");
    const select = mount(SortWordBySelect).find("select").element as HTMLSelectElement;
    expect(select.selectedOptions[0].text.trim()).toBe("neuste zuerst");
  });

  it("calls $setSortOrder with category and order when an option is selected", async () => {
    await mount(SortWordBySelect).find("select").setValue("alphabetical:DESC");
    expect($setSortOrder).toHaveBeenCalledWith("alphabetical", "DESC");
  });
});
