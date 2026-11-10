import WordOfflineBanner from "@components/word/WordOfflineBanner.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

describe("WordOfflineBanner", () => {
  it("renders nothing while online", () => {
    expect(mount(WordOfflineBanner).find("[role=status]").exists()).toBe(false);
  });

  it("offline: a status region with the copy of Spec §7", () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const banner = mount(WordOfflineBanner).find("[role=status]");
    expect(banner.text()).toContain("Du bist offline.");
    expect(banner.text()).toContain(
      "Du siehst die jespeicherte Version. Abstimmen und Kommentieren jeht wieder, sobald du Netz hast.",
    );
    online.mockRestore();
  });
});
