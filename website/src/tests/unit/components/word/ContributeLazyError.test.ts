// @vitest-environment jsdom
import ContributeLazy from "@components/word/ContributeLazy.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

type LoaderOptions = {
  onError: (error: unknown, retry: () => void, fail: () => void) => void;
};
const captured = vi.hoisted(() => ({ options: undefined as LoaderOptions | undefined }));

// Capture the loader options: a rejected dynamic import cannot be simulated without vitest flagging it as unhandled.
vi.mock("vue", async (importActual) => {
  const actual = await importActual<typeof import("vue")>();
  return {
    ...actual,
    defineAsyncComponent: (options: LoaderOptions) => {
      captured.options = options;
      return actual.defineComponent({ render: () => null });
    },
  };
});

describe("ContributeLazy loader", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reports a failing chunk load and fails the async component", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("chunk failed");
    const fail = vi.fn();
    mount(ContributeLazy, { props: { type: "fact", word: "x" } });
    captured.options!.onError(error, vi.fn(), fail);
    expect(consoleError).toHaveBeenCalledWith(error);
    expect(fail).toHaveBeenCalledTimes(1);
  });
});
