// @vitest-environment jsdom
import { useGuardedAction } from "@composables/useGuardedAction.ts";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

const setup = () => {
  let api!: ReturnType<typeof useGuardedAction>;
  mount(
    defineComponent({
      setup() {
        api = useGuardedAction();
        return () => null;
      },
    }),
  );
  return api;
};

describe("useGuardedAction", () => {
  afterEach(() => vi.restoreAllMocks());

  it("runs the task and frees the key afterwards, also when it throws", async () => {
    const { busy, run } = setup();
    expect(await run("a", async () => {})).toBe(true);
    expect(busy.size).toBe(0);
    await expect(
      run("a", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(busy.has("a")).toBe(false);
  });

  it("refuses the same key while it runs, but not another key", async () => {
    const { busy, run } = setup();
    let release!: () => void;
    const first = run("a", () => new Promise<void>((resolve) => (release = resolve)));
    expect(busy.has("a")).toBe(true);
    expect(await run("a", async () => {})).toBe(false);
    expect(await run("b", async () => {})).toBe(true);
    release();
    await first;
    expect(busy.has("a")).toBe(false);
  });

  it("refuses while offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { online, run } = setup();
    window.dispatchEvent(new Event("offline"));
    expect(online.value).toBe(false);
    const task = vi.fn(async () => {});
    expect(await run("a", task)).toBe(false);
    expect(task).not.toHaveBeenCalled();
  });
});
