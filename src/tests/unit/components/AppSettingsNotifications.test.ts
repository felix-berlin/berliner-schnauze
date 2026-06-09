import AppSettingsNotifications from "@components/AppSettingsNotifications.vue";
import { useNotificationSettings } from "@composables/useNotificationSettings";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

// ---- mock -----------------------------------------------------------------

const mockRequestNotificationPermission = vi.fn();
const mockTogglePush = vi.fn();

const makeState = (overrides: Partial<ReturnType<typeof useNotificationSettings>> = {}) => ({
  notificationPermission: ref<string>("default"),
  notificationsSupported: true,
  pushState: ref("unsubscribed"),
  pushSupported: true,
  vapidConfigured: true,
  showRevokeHint: ref(false),
  showPushSection: computed(() => false),
  requestNotificationPermission: mockRequestNotificationPermission,
  togglePush: mockTogglePush,
  ...overrides,
});

vi.mock("@composables/useNotificationSettings", () => ({
  useNotificationSettings: vi.fn(),
}));

const mockedUseNotificationSettings = vi.mocked(useNotificationSettings);

// ---- tests ----------------------------------------------------------------

describe("AppSettingsNotifications.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseNotificationSettings.mockReturnValue(makeState() as ReturnType<typeof useNotificationSettings>);
  });

  it("shows unsupported hint when notificationsSupported is false", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({ notificationsSupported: false }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.text()).toContain("unterstützt keine Benachrichtigungen");
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("shows status badge with 'Nicht aktiviert' text for default permission", () => {
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.find(".c-app-settings__status-badge").exists()).toBe(true);
    expect(wrapper.text()).toContain("Nicht aktiviert");
  });

  it("shows 'Aktiv' badge when permission is granted", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({ notificationPermission: ref("granted") }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.text()).toContain("Aktiv");
  });

  it("shows 'Blockiert' badge and browser-hint when permission is denied", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({ notificationPermission: ref("denied") }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.text()).toContain("Blockiert");
    expect(wrapper.text()).toContain("Browser-Einstellungen");
  });

  it("shows activate button when permission is default", () => {
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.find("button").text()).toContain("aktivieren");
  });

  it("calls requestNotificationPermission when activate button clicked", async () => {
    const wrapper = mount(AppSettingsNotifications);
    await wrapper.find("button").trigger("click");
    expect(mockRequestNotificationPermission).toHaveBeenCalledOnce();
  });

  it("does not show activate button when permission is granted", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({ notificationPermission: ref("granted") }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    const buttons = wrapper.findAll("button");
    expect(buttons.every((b) => !b.text().includes("Benachrichtigungen aktivieren"))).toBe(true);
  });

  it("shows push toggle when showPushSection is true", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({
        notificationPermission: ref("granted"),
        showPushSection: computed(() => true),
      }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.find("#push-toggle").exists()).toBe(true);
  });

  it("disables push toggle when vapidConfigured is false", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({
        notificationPermission: ref("granted"),
        vapidConfigured: false,
        showPushSection: computed(() => true),
      }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.find("#push-toggle").attributes("disabled")).toBeDefined();
  });

  it("disables push toggle when pushState is loading", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({
        notificationPermission: ref("granted"),
        pushState: ref("loading"),
        showPushSection: computed(() => true),
      }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.find("#push-toggle").attributes("disabled")).toBeDefined();
  });

  it("calls togglePush when push checkbox changes", async () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({
        notificationPermission: ref("granted"),
        showPushSection: computed(() => true),
      }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    await wrapper.find("#push-toggle").trigger("change");
    expect(mockTogglePush).toHaveBeenCalledOnce();
  });

  it("shows error hint when pushState is error", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({
        notificationPermission: ref("granted"),
        pushState: ref("error"),
        showPushSection: computed(() => true),
      }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.text()).toContain("konnten nicht aktiviert werden");
  });

  it("shows revoke section when permission is granted", () => {
    mockedUseNotificationSettings.mockReturnValue(
      makeState({ notificationPermission: ref("granted") }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.text()).toContain("Benachrichtigungen deaktivieren");
  });

  it("shows revoke hint text when showRevokeHint is true", async () => {
    const revokeRef = ref(true);
    mockedUseNotificationSettings.mockReturnValue(
      makeState({
        notificationPermission: ref("granted"),
        showRevokeHint: revokeRef,
      }) as ReturnType<typeof useNotificationSettings>,
    );
    const wrapper = mount(AppSettingsNotifications);
    expect(wrapper.text()).toContain("Schloss-Symbol");
  });
});
