import SuggestWordForm from "@components/SuggestWordForm.vue";
import TurnStile from "@components/TurnStile.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";


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

describe("SuggestWordForm.vue", () => {
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
});
