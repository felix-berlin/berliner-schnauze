// @vitest-environment jsdom
import { useTurnstile } from "@composables/useTurnstile.ts";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

const reset = vi.fn();
const Widget = defineComponent({
  setup(_, { expose }) {
    expose({ reset });
    return () => null;
  },
});

const setup = (onReady?: (token: string) => void) => {
  let api!: ReturnType<typeof useTurnstile>;
  mount(
    defineComponent({
      setup() {
        api = useTurnstile(onReady);
        return () => h(Widget, { ref: "turnstile" });
      },
    }),
  );
  return api;
};

describe("useTurnstile", () => {
  it("keeps the token, clears a failure and reports a ready token", () => {
    const onReady = vi.fn();
    const t = setup(onReady);
    t.onError();
    expect(t.failed.value).toBe(true);
    t.onToken("tok");
    expect(t.token.value).toBe("tok");
    expect(t.failed.value).toBe(false);
    expect(onReady).toHaveBeenCalledWith("tok");
  });

  it("an empty token (expired) drops the token and stays silent", () => {
    const onReady = vi.fn();
    const t = setup(onReady);
    t.onToken("tok");
    onReady.mockClear();
    t.onToken("");
    expect(t.token.value).toBe("");
    expect(onReady).not.toHaveBeenCalled();
  });

  it("spend() forgets the token and resets the widget, clear() leaves the widget alone", () => {
    const t = setup();
    t.onToken("tok");
    t.clear();
    expect(t.token.value).toBe("");
    expect(reset).not.toHaveBeenCalled();
    t.onToken("tok");
    t.spend();
    expect(t.token.value).toBe("");
    expect(reset).toHaveBeenCalledOnce();
  });
});
