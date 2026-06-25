import AppSettings from "@components/AppSettings.vue";
import { $showInstallButton, triggerPwaInstall } from "@stores/installApp.ts";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

vi.mock("@stores/installApp.ts", async () => {
  const { atom } = await import("nanostores");
  return {
    $showInstallButton: atom(false),
    triggerPwaInstall: vi.fn(),
  };
});

// Permissive Proxy pattern: prevents Vitest's strict module proxy from throwing when
// vue-test-utils' createDefaultStub probes Vue internal flags (__isTeleport etc.) on the
// raw module object returned by the vi.mock factory.
vi.mock("@components/AppSettingsTheme.vue", () => {
  const mod: Record<string | symbol, unknown> = { default: { template: "<div />" } };
  return new Proxy(mod, { has: () => true, get(t, k) { return k in t ? t[k] : undefined; } });
});
vi.mock("@components/AppSettingsNotifications.vue", () => {
  const mod: Record<string | symbol, unknown> = { default: { template: "<div />" } };
  return new Proxy(mod, { has: () => true, get(t, k) { return k in t ? t[k] : undefined; } });
});
vi.mock("@components/AppSettingsNavCard.vue", () => {
  const mod: Record<string | symbol, unknown> = {
    default: { props: ["icon", "title", "description", "href", "tag"], emits: ["click"], template: "<a data-testid='nav-card-loaded' />" },
  };
  return new Proxy(mod, { has: () => true, get(t, k) { return k in t ? t[k] : undefined; } });
});
vi.mock("virtual:icons/lucide/download", () => {
  const mod: Record<string | symbol, unknown> = { default: { template: "<svg />" } };
  return new Proxy(mod, { has: () => true, get(t, k) { return k in t ? t[k] : undefined; } });
});
vi.mock("virtual:icons/lucide/hard-drive", () => {
  const mod: Record<string | symbol, unknown> = { default: { template: "<svg />" } };
  return new Proxy(mod, { has: () => true, get(t, k) { return k in t ? t[k] : undefined; } });
});

// Nav card stub defined outside vi.mock — no hoisting issue here
const NavCardStub = defineComponent({
  props: ["icon", "title", "description", "href", "tag"],
  emits: ["click"],
  setup(props, { emit }) {
    return () =>
      h("a", {
        href: (props as Record<string, string>).href,
        "data-title": (props as Record<string, string>).title,
        "data-testid": "nav-card",
        onClick: () => emit("click"),
      });
  },
});

const mountOptions = {
  global: {
    stubs: {
      // Match by the component's __name (set by Vite from filename)
      AppSettingsNavCard: NavCardStub,
      AppSettingsTheme: { template: "<div />" },
      AppSettingsNotifications: { template: "<div />" },
    },
  },
};

describe("AppSettings.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $showInstallButton.set(false);
  });

  it("always renders cache nav card", async () => {
    const wrapper = mount(AppSettings, mountOptions);
    await flushPromises();
    const cards = wrapper.findAll("[data-testid='nav-card']");
    expect(cards.some((c) => c.attributes("href") === "/settings/cache")).toBe(true);
  });

  it("hides install nav card when showInstallButton is false", async () => {
    const wrapper = mount(AppSettings, mountOptions);
    await flushPromises();
    const cards = wrapper.findAll("[data-testid='nav-card']");
    expect(cards).toHaveLength(1);
  });

  it("shows install nav card when showInstallButton is true", async () => {
    $showInstallButton.set(true);
    const wrapper = mount(AppSettings, mountOptions);
    await flushPromises();
    const cards = wrapper.findAll("[data-testid='nav-card']");
    expect(cards.some((c) => c.attributes("data-title") === "App installieren")).toBe(true);
  });

  it("calls triggerPwaInstall when install card clicked", async () => {
    $showInstallButton.set(true);
    const wrapper = mount(AppSettings, mountOptions);
    await flushPromises();
    const installCard = wrapper
      .findAll("[data-testid='nav-card']")
      .find((c) => c.attributes("data-title") === "App installieren");
    await installCard!.trigger("click");
    expect(triggerPwaInstall).toHaveBeenCalledOnce();
  });


});
