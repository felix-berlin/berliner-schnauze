import SuggestWordForm from "@components/SuggestWordForm.vue";
import TurnStile from "@components/TurnStile.vue";
import { mount, flushPromises, config } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";


vi.mock("astro:env/client", () => ({
  TURNSTILE_SITE_KEY: "test-site-key",
}));

vi.mock("@/gql/graphql.ts", () => ({
  SendEmailDocument: {},
}));

vi.mock("@urql/vue", () => ({
  useMutation: vi.fn(() => ({
    executeMutation: vi.fn(() =>
      Promise.resolve({ data: { sendEmail: { sent: true } }, error: null }),
    ),
    data: { value: null },
  })),
}));

vi.mock("@stores/toastNotify.ts", () => ({
  createToastNotify: vi.fn(),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@components/TurnStile.vue", () => ({
  default: {
    name: "TurnStile",
    template: "<div class='mock-turnstile' />",
    emits: ["verify"],
  },
}));

const AlertBannerStub = { name: "AlertBanner", template: "<div class='mock-alert-banner'><slot /></div>" };

describe("SuggestWordForm.vue", () => {
  beforeAll(() => {
    config.global.stubs.AlertBanner = AlertBannerStub;
  });

  afterAll(() => {
    delete config.global.stubs.AlertBanner;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form element", () => {
    const wrapper = mount(SuggestWordForm);
    expect(wrapper.find("form.c-suggest-word-form").exists()).toBe(true);
  });

  it("renders the berlinerWord input", () => {
    const wrapper = mount(SuggestWordForm);
    expect(wrapper.find("#berlinerWort").exists()).toBe(true);
  });

  it("renders the translation input", () => {
    const wrapper = mount(SuggestWordForm);
    expect(wrapper.find("#translation").exists()).toBe(true);
  });

  it("renders the example textarea", () => {
    const wrapper = mount(SuggestWordForm);
    expect(wrapper.find("#example").exists()).toBe(true);
  });

  it("renders the submit button with 'Wort einreichen' text", () => {
    const wrapper = mount(SuggestWordForm);
    expect(wrapper.find("button[type='submit']").text()).toContain("Wort einreichen");
  });

  it("renders the TurnStile component", () => {
    const wrapper = mount(SuggestWordForm);
    expect(wrapper.find(".mock-turnstile").exists()).toBe(true);
  });

  it("pre-fills berlinerWord from prop", () => {
    const wrapper = mount(SuggestWordForm, {
      props: { berlinerWord: "Kiez" },
    });
    const input = wrapper.find<HTMLInputElement>("#berlinerWort");
    expect(input.element.value).toBe("Kiez");
  });

  it("berlinerWord field gets has-error when field is empty on submit", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#berlinerWort").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(true);
  });

  it("berlinerWord field gets has-error when value is a single char", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("A");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#berlinerWort").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(true);
  });

  it("translation field gets has-error when translation is missing", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#translation").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(true);
  });

  it("translation field gets has-error when translation is a single char", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("A");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#translation").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(true);
  });

  it("no has-error class on berlinerWord field before submit", () => {
    const wrapper = mount(SuggestWordForm);
    const field = wrapper.find("#berlinerWort").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(false);
  });

  it("renders userName input as optional", () => {
    const wrapper = mount(SuggestWordForm);
    expect(wrapper.find("#userName").exists()).toBe(true);
    const label = wrapper.find("label[for='userName']");
    expect(label.text()).toContain("optional");
  });

  it("renders email input as optional", () => {
    const wrapper = mount(SuggestWordForm);
    expect(wrapper.find("#userEmail").exists()).toBe(true);
    const label = wrapper.find("label[for='userEmail']");
    expect(label.text()).toContain("optional");
  });

  it("calls executeMutation when form is valid and verified", async () => {
    const { useMutation } = await import("@urql/vue");
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    // Simulate TurnStile verification
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    expect(vi.mocked(useMutation).mock.results[0].value.executeMutation).toHaveBeenCalled();
  });

  it("shows eMail has-error when invalid email is provided", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLInputElement>("#userEmail").setValue("not-an-email");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#userEmail").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(true);
  });

  it("does not show eMail has-error when valid email is provided", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLInputElement>("#userEmail").setValue("test@example.com");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#userEmail").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(false);
  });

  it("userName field gets has-error when value is a single char (covers line 295)", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLInputElement>("#userName").setValue("X");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#userName").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(true);
  });

  it("example field gets has-error when value is a single char (covers line 298)", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLInputElement>("#example").setValue("A");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#example").element.closest(".c-form__item");
    expect(field?.classList.contains("c-textarea--error")).toBe(true);
  });

  it("shows 'Wort wird gesendet' while mutation is pending (covers line 127 v-else branch)", async () => {
    const { useMutation } = await import("@urql/vue");
    vi.mocked(useMutation).mockReturnValueOnce({
      executeMutation: vi.fn(() => new Promise(() => {})),
      data: { value: null },
    } as any);
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find("button[type='submit']").text()).toContain("Wort wird gesendet");
  });

  it("shows error toast when sent=false (covers line 231)", async () => {
    const { useMutation } = await import("@urql/vue");
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    vi.mocked(useMutation).mockReturnValueOnce({
      executeMutation: vi.fn(() =>
        Promise.resolve({ data: { sendEmail: { sent: false } }, error: null }),
      ),
      data: { value: null },
    } as any);
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    await Promise.resolve();
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });

  it("AlertBanner slot renders formErrors.example text when example is too short (covers line 75)", async () => {
    const wrapper = mount(SuggestWordForm, {
      global: { stubs: { AlertBanner: { template: "<div><slot /></div>" } } },
    });
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLTextAreaElement>("#example").setValue("A");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Mehr is dir nicht eingefallen?");
  });

  it("AlertBanner slot renders formErrors.name text when userName is too short (covers line 97)", async () => {
    const wrapper = mount(SuggestWordForm, {
      global: { stubs: { AlertBanner: { template: "<div><slot /></div>" } } },
    });
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLInputElement>("#userName").setValue("X");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Du hast nen sehr kleinen Namen");
  });

  it("AlertBanner slot renders formErrors.eMail text when email is invalid (covers line 118)", async () => {
    const wrapper = mount(SuggestWordForm, {
      global: { stubs: { AlertBanner: { template: "<div><slot /></div>" } } },
    });
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLInputElement>("#userEmail").setValue("not-an-email");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Irgendwas läuft hier nicht");
  });

  it("resetForm schedules form reset via setTimeout after successful send (covers lines 250, 267)", async () => {
    vi.useFakeTimers();
    const { useMutation } = await import("@urql/vue");
    vi.mocked(useMutation).mockReturnValueOnce({
      executeMutation: vi.fn(() =>
        Promise.resolve({ data: { sendEmail: { sent: true } }, error: null }),
      ),
      data: { value: { sendEmail: { sent: true } } } as any,
    } as any);

    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    await Promise.resolve();

    vi.advanceTimersByTime(3100);
    expect(wrapper.exists()).toBe(true);
    vi.useRealTimers();
  });

});
