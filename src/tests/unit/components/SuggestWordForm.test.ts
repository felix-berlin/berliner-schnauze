import SuggestWordForm from "@components/SuggestWordForm.vue";
import TurnStile from "@components/TurnStile.vue";
import { mount, config } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";

vi.mock("astro:env/client", () => ({
  TURNSTILE_SITE_KEY: "test-site-key",
  WP_API: "https://wp.test/graphql",
}));

vi.mock("@/gql/graphql.ts", () => ({
  SendEmailDocument: {},
}));

type MutationResult = { data: unknown; error: unknown };
const { mutationMock } = vi.hoisted(() => ({
  mutationMock: vi.fn((_document: unknown, _variables: unknown): Promise<MutationResult> =>
    Promise.resolve({ data: { sendEmail: { sent: true } }, error: null }),
  ),
}));
const mutationInput = () => {
  const [, variables] = mutationMock.mock.calls[0] ?? [];
  return (variables as { input: Record<string, unknown> }).input;
};

vi.mock("@urql/core", () => ({
  Client: class {
    mutation(document: unknown, variables: unknown) {
      return { toPromise: () => mutationMock(document, variables) };
    }
  },
  fetchExchange: {},
}));

vi.mock("@stores/toastNotify.ts", () => ({
  createToastNotify: vi.fn(),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@components/TurnStile.vue", () => ({
  default: {
    emits: ["verify"],
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

  it("sends the mutation when form is valid and verified", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    // Simulate TurnStile verification
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    expect(mutationMock).toHaveBeenCalled();
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
    mutationMock.mockImplementationOnce(() => new Promise(() => {}));
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find("button[type='submit']").text()).toContain("Wort wird gesendet");
  });

  it("shows error toast when sent=false (covers line 231)", async () => {
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    mutationMock.mockImplementationOnce(() =>
      Promise.resolve({ data: { sendEmail: { sent: false } }, error: null }),
    );
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

  it("clears the form 3 s after a successful send", async () => {
    vi.useFakeTimers();
    mutationMock.mockImplementationOnce(() =>
      Promise.resolve({ data: { sendEmail: { sent: true } }, error: null }),
    );

    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
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

  it("escapes user input in the mail body", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("<b>Kiez</b>");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();

    const { body } = mutationInput() as { body: string };
    expect(body).toContain("&#60;b&#62;Kiez&#60;/b&#62;");
    expect(body).not.toContain("<b>Kiez</b>");
  });

  it("sends the user's email as replyTo, not as sender", async () => {
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.find<HTMLInputElement>("#userEmail").setValue("test@example.com");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();

    const input = mutationInput();
    expect(input.replyTo).toBe("test@example.com");
    expect(input).not.toHaveProperty("from");
  });

  it("re-enables the submit button after a failed send", async () => {
    mutationMock.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: new Error("boom") }),
    );
    const wrapper = mount(SuggestWordForm);
    await wrapper.find<HTMLInputElement>("#berlinerWort").setValue("Kiez");
    await wrapper.find<HTMLInputElement>("#translation").setValue("Viertel");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeUndefined();
  });
});
