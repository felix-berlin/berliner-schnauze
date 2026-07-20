import WordFeedbackForm from "@components/word/WordFeedbackForm.vue";
import TurnStile from "@components/TurnStile.vue";
import { mount, config } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";

vi.mock("astro:env/client", () => ({
  SITE_URL: "https://berliner-schnauze.wtf",
  TURNSTILE_SITE_KEY: "test-site-key",
}));

vi.mock("@/gql/graphql.ts", () => ({
  SendEmailDocument: {},
}));

vi.mock("@utils/helpers.ts", () => ({
  routeToWord: vi.fn((slug: string) => `/wort/${slug}`),
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

const AlertBannerStub = {
  name: "AlertBanner",
  template: "<div class='mock-alert-banner'><slot /></div>",
};

const verifyAndSubmit = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
  await wrapper.find("form").trigger("submit");
  await Promise.resolve();
  await Promise.resolve();
};

describe("WordFeedbackForm.vue", () => {
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
    const wrapper = mount(WordFeedbackForm);
    expect(wrapper.find("form.c-word-feedback-form").exists()).toBe(true);
  });

  it("renders the word context when berlinerWord prop is given", () => {
    const wrapper = mount(WordFeedbackForm, { props: { berlinerWord: "Kiez" } });
    expect(wrapper.find(".c-word-feedback-form__word-context").text()).toContain("Kiez");
  });

  it("does not render word context when berlinerWord is missing", () => {
    const wrapper = mount(WordFeedbackForm);
    expect(wrapper.find(".c-word-feedback-form__word-context").exists()).toBe(false);
  });

  it("defaults the type radio to 'error' when no type prop is given", () => {
    const wrapper = mount(WordFeedbackForm);
    const errorRadio = wrapper.find<HTMLInputElement>("input[type='radio'][value='error']");
    expect(errorRadio.element.checked).toBe(true);
  });

  it("preselects the 'content' radio when type prop is 'content'", () => {
    const wrapper = mount(WordFeedbackForm, { props: { type: "content" } });
    const contentRadio = wrapper.find<HTMLInputElement>("input[type='radio'][value='content']");
    expect(contentRadio.element.checked).toBe(true);
  });

  it("preselects the 'error' radio when type prop is 'error'", () => {
    const wrapper = mount(WordFeedbackForm, { props: { type: "error" } });
    const errorRadio = wrapper.find<HTMLInputElement>("input[type='radio'][value='error']");
    expect(errorRadio.element.checked).toBe(true);
  });

  it("switches type when the content radio is clicked", async () => {
    const wrapper = mount(WordFeedbackForm, { props: { type: "error" } });
    await wrapper.find<HTMLInputElement>("input[type='radio'][value='content']").setValue(true);
    expect(wrapper.find("button[type='submit']").text()).toContain("Vorschlag senden");
  });

  it("renders 'Fehler melden' submit button text by default", () => {
    const wrapper = mount(WordFeedbackForm);
    expect(wrapper.find("button[type='submit']").text()).toContain("Fehler melden");
  });

  it("renders 'Vorschlag senden' submit button text for content type", () => {
    const wrapper = mount(WordFeedbackForm, { props: { type: "content" } });
    expect(wrapper.find("button[type='submit']").text()).toContain("Vorschlag senden");
  });

  it("renders the TurnStile component", () => {
    const wrapper = mount(WordFeedbackForm);
    expect(wrapper.find(".mock-turnstile").exists()).toBe(true);
  });

  it("renders userName and userEmail as optional", () => {
    const wrapper = mount(WordFeedbackForm);
    expect(wrapper.find("label[for='userName']").text()).toContain("optional");
    expect(wrapper.find("label[for='userEmail']").text()).toContain("optional");
  });

  it("message field gets has-error when empty on submit", async () => {
    const wrapper = mount(WordFeedbackForm);
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#message").element.closest(".c-form__item");
    expect(field?.classList.contains("c-textarea--error")).toBe(true);
  });

  it("message field gets has-error when too short", async () => {
    const wrapper = mount(WordFeedbackForm);
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Hi");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#message").element.closest(".c-form__item");
    expect(field?.classList.contains("c-textarea--error")).toBe(true);
  });

  it("no has-error class on message field before submit", () => {
    const wrapper = mount(WordFeedbackForm);
    const field = wrapper.find("#message").element.closest(".c-form__item");
    expect(field?.classList.contains("c-textarea--error")).toBe(false);
  });

  it("shows eMail has-error when invalid email is provided", async () => {
    const wrapper = mount(WordFeedbackForm);
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Da ist ein Fehler drin.");
    await wrapper.find<HTMLInputElement>("#userEmail").setValue("not-an-email");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#userEmail").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(true);
  });

  it("userName field gets has-error when value is a single char", async () => {
    const wrapper = mount(WordFeedbackForm);
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Da ist ein Fehler drin.");
    await wrapper.find<HTMLInputElement>("#userName").setValue("X");
    await wrapper.find("form").trigger("submit");
    const field = wrapper.find("#userName").element.closest(".c-form__item");
    expect(field?.classList.contains("has-error")).toBe(true);
  });

  it("calls executeMutation with error subject/clientMutationId when type is error", async () => {
    const { useMutation } = await import("@urql/vue");
    const wrapper = mount(WordFeedbackForm, {
      props: { berlinerWord: "Kiez", slug: "kiez", type: "error" },
    });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Die Übersetzung stimmt nicht.");
    await verifyAndSubmit(wrapper);

    const executeMutation = vi.mocked(useMutation).mock.results[0].value.executeMutation;
    expect(executeMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          clientMutationId: "wordErrorReport",
          subject: "Fehlermeldung - Kiez - Berliner Schnauze",
        }),
      }),
    );
  });

  it("calls executeMutation with content subject/clientMutationId when type is content", async () => {
    const { useMutation } = await import("@urql/vue");
    const wrapper = mount(WordFeedbackForm, {
      props: { berlinerWord: "Kiez", slug: "kiez", type: "content" },
    });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Hier fehlt ein Beispielsatz.");
    await verifyAndSubmit(wrapper);

    const executeMutation = vi.mocked(useMutation).mock.results[0].value.executeMutation;
    expect(executeMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          clientMutationId: "wordContentSuggestion",
          subject: "Inhaltsvorschlag - Kiez - Berliner Schnauze",
        }),
      }),
    );
  });

  it("tracks 'Word Error Report' on successful error submission", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(WordFeedbackForm, { props: { berlinerWord: "Kiez", type: "error" } });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Die Übersetzung stimmt nicht.");
    await verifyAndSubmit(wrapper);
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith("Form", "Send", "Word Error Report");
  });

  it("tracks 'Word Content Suggestion' on successful content submission", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(WordFeedbackForm, { props: { berlinerWord: "Kiez", type: "content" } });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Hier fehlt ein Beispielsatz.");
    await verifyAndSubmit(wrapper);
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith("Form", "Send", "Word Content Suggestion");
  });

  it("shows success toast with error copy for error type", async () => {
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    const wrapper = mount(WordFeedbackForm, { props: { berlinerWord: "Kiez", type: "error" } });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Die Übersetzung stimmt nicht.");
    await verifyAndSubmit(wrapper);
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Danke, deine Fehlermeldung wurde versandt",
        status: "success",
      }),
    );
  });

  it("shows success toast with content copy for content type", async () => {
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    const wrapper = mount(WordFeedbackForm, { props: { berlinerWord: "Kiez", type: "content" } });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Hier fehlt ein Beispielsatz.");
    await verifyAndSubmit(wrapper);
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Danke, dein Inhaltsvorschlag wurde versandt",
        status: "success",
      }),
    );
  });

  it("shows error toast when sent=false", async () => {
    const { useMutation } = await import("@urql/vue");
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    vi.mocked(useMutation).mockReturnValueOnce({
      executeMutation: vi.fn(() =>
        Promise.resolve({ data: { sendEmail: { sent: false } }, error: null }),
      ),
      data: { value: null },
    } as any);
    const wrapper = mount(WordFeedbackForm, { props: { berlinerWord: "Kiez" } });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Die Übersetzung stimmt nicht.");
    await verifyAndSubmit(wrapper);
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });

  it("shows sending state text while mutation is pending", async () => {
    const { useMutation } = await import("@urql/vue");
    vi.mocked(useMutation).mockReturnValueOnce({
      executeMutation: vi.fn(() => new Promise(() => {})),
      data: { value: null },
    } as any);
    const wrapper = mount(WordFeedbackForm, { props: { type: "error" } });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Die Übersetzung stimmt nicht.");
    await wrapper.findComponent(TurnStile).vm.$emit("verify", true);
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find("button[type='submit']").text()).toContain("Wird gemeldet");
  });

  it("resetForm keeps the original type after a successful submission (fake timers)", async () => {
    vi.useFakeTimers();
    const { useMutation } = await import("@urql/vue");
    vi.mocked(useMutation).mockReturnValueOnce({
      executeMutation: vi.fn(() =>
        Promise.resolve({ data: { sendEmail: { sent: true } }, error: null }),
      ),
      data: { value: { sendEmail: { sent: true } } } as any,
    } as any);

    const wrapper = mount(WordFeedbackForm, { props: { type: "content" } });
    await wrapper.find<HTMLTextAreaElement>("#message").setValue("Hier fehlt ein Beispielsatz.");
    await verifyAndSubmit(wrapper);

    vi.advanceTimersByTime(3100);
    await Promise.resolve();

    const contentRadio = wrapper.find<HTMLInputElement>("input[type='radio'][value='content']");
    expect(contentRadio.element.checked).toBe(true);
    vi.useRealTimers();
  });
});
