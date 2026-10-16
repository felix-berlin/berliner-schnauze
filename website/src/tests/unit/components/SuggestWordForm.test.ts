import SuggestWordForm from "@components/SuggestWordForm.vue";
import TurnStile from "@components/TurnStile.vue";
import { mount, config } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";

vi.mock("astro:env/client", () => ({
  TURNSTILE_SITE_KEY: "test-site-key",
}));

type ServerAnswer = { json: () => Promise<unknown>; ok: boolean };
const sent = (): Promise<ServerAnswer> =>
  Promise.resolve({ json: async () => ({ sent: true }), ok: true });
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
const postedBody = () =>
  JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body) as Record<
    string,
    unknown
  >;

vi.mock("@stores/toastNotify.ts", () => ({
  createToastNotify: vi.fn(),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@components/TurnStile.vue", () => ({
  default: {
    emits: ["token"],
    name: "TurnStile",
    template: "<div class='mock-turnstile' />",
  },
}));

const AlertBannerStub = {
  name: "AlertBanner",
  template: "<div class='mock-alert-banner'><slot /></div>",
};

describe("SuggestWordForm.vue", () => {
  beforeAll(() => {
    config.global.stubs.AlertBanner = AlertBannerStub;
  });

  afterAll(() => {
    delete config.global.stubs.AlertBanner;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockImplementation(sent);
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

  it("posts the suggestion with the turnstile token to the server", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    // Simulate TurnStile verification
    await wrapper.findComponent(TurnStile).vm.$emit("token", "tok");
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/suggest-word",
      expect.objectContaining({ method: "POST" }),
    );
    expect(postedBody()).toMatchObject({
      berlinerWord: "Kiez",
      translation: "Viertel",
      turnstileToken: "tok",
    });
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

  it("shows 'Wort wird gesendet' while the request is pending", async () => {
    fetchMock.mockImplementationOnce(() => new Promise(() => {}));
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("token", "tok");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find("button[type='submit']").text()).toContain("Wort wird gesendet");
  });

  it("shows an error toast when the server refuses", async () => {
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ json: async () => ({ error: "x" }), ok: false }),
    );
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("token", "tok");
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

  it("clears the form 3 s after a successful send", async () => {
    vi.useFakeTimers();

    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("token", "tok");
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    await Promise.resolve();

    const input = wrapper.find<HTMLInputElement>("#berlinerWort");
    expect(input.element.value).toBe("Kiez");
    vi.advanceTimersByTime(3100);
    await wrapper.vm.$nextTick();
    expect(input.element.value).toBe("");
    vi.useRealTimers();
  });
  it("treats a whitespace-only word as missing", async () => {
    const wrapper = mount(SuggestWordForm, {
      global: { stubs: { AlertBanner: { template: "<div><slot /></div>" } } },
    });
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("   ");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Hey du hast ditt Wort vergessen.");
  });

  it("posts the user's email as userMail and the raw text, the server builds the mail", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("<b>Kiez</b>");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLInputElement>("#userEmail").setValue("test@example.com");
    await wrapper.findComponent(TurnStile).vm.$emit("token", "tok");
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();

    expect(postedBody()).toMatchObject({
      berlinerWord: "<b>Kiez</b>",
      userMail: "test@example.com",
    });
    expect(postedBody()).not.toHaveProperty("body");
  });

  it("does not post before the captcha is solved", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("needs a fresh captcha after every send (a token works once)", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("token", "tok");
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    await Promise.resolve();
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-enables the submit button after a failed send", async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("boom")));
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("token", "tok");
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeUndefined();
  });
});
