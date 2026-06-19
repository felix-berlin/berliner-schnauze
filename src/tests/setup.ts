import { config } from "@vue/test-utils";
import {
  Tooltip,
  VClosePopper,
  // Components
  Dropdown as VDropdown,
  Menu as VMenu,
  // Directives
  VTooltip,
} from "floating-vue";
// import { setupServer } from "msw/node";
// import { graphql, http } from "msw";
// import { useAutoAnimate } from "@formkit/auto-animate/vue";
import { beforeAll, vi } from "vitest";

beforeAll(() => {
  vi.stubEnv("WP_API", "https://cms.berliner-schnauze.wtf/api");

  config.global.components = {
    Tooltip,
    VDropdown,
    VMenu,
  };
  config.global.directives = {
    "close-popper": VClosePopper,
    tooltip: VTooltip,
    // "auto-animate": useAutoAnimate,
  };
});

// jsdom does not implement ToggleEvent; provide a minimal polyfill for popover tests
if (typeof globalThis.ToggleEvent === "undefined") {
  class ToggleEvent extends Event {
    newState: string;
    oldState: string;
    constructor(type: string, init: { newState?: string; oldState?: string } & EventInit = {}) {
      super(type, init);
      this.newState = init.newState ?? "";
      this.oldState = init.oldState ?? "";
    }
  }
  globalThis.ToggleEvent = ToggleEvent as unknown as typeof globalThis.ToggleEvent;
}

const ResizeObserverMock = vi.fn(function () {
  return {
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  };
});
vi.stubGlobal("ResizeObserver", ResizeObserverMock);
// Mock the HTMLDialogElement.prototype.showModal() method
global.HTMLDialogElement.prototype.showModal = () => {};
// Mock the HTMLDialogElement.prototype.close() method
global.HTMLDialogElement.prototype.close = () => {};
