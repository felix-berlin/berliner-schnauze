import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { config } from "@vue/test-utils";
// import { setupServer } from "msw/node";
// import { graphql, http } from "msw";
// import { useAutoAnimate } from "@formkit/auto-animate/vue";

import {
  // Directives
  VTooltip,
  VClosePopper,
  // Components
  Dropdown as VDropdown,
  Tooltip,
  Menu as VMenu,
} from "floating-vue";

beforeAll(() => {
  vi.stubEnv("PUBLIC_WP_API", "https://cms.berliner-schnauze.wtf/api");

  config.global.components = {
    VDropdown,
    Tooltip,
    VMenu,
  };
  config.global.directives = {
    "close-popper": VClosePopper,
    tooltip: VTooltip,
    // "auto-animate": useAutoAnimate,
  };
});

const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal("ResizeObserver", ResizeObserverMock);
// Mock the HTMLDialogElement.prototype.showModal() method
global.HTMLDialogElement.prototype.showModal = () => {};
// Mock the HTMLDialogElement.prototype.close() method
global.HTMLDialogElement.prototype.close = () => {};
