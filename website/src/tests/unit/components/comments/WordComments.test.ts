import WordComments from "@components/comments/WordComments.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ TURNSTILE_SITE_KEY: "k" }));
vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);

describe("WordComments", () => {
  it("shows the empty state and the total", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [], hasMore: false, total: 0 }),
      ok: true,
      status: 200,
    });
    const wrapper = mount(WordComments, {
      global: { stubs: { TurnStile: true } },
      props: { wordId: 7 },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Noch keen Senf dazu. Mach den Anfang!");
    expect(wrapper.text()).toContain("(0)");
    expect(wrapper.find("[aria-pressed=true]").text()).toBe("Beste");
  });
});
