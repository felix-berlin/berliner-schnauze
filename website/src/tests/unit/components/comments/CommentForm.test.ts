import CommentForm from "@components/comments/CommentForm.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

describe("CommentForm", () => {
  it("counter shows 1000 limit and blocks submit over it", async () => {
    const submit = vi.fn(async () => true);
    const wrapper = mount(CommentForm, { props: { submit } });
    expect(wrapper.find(".c-comment-form__counter").text()).toBe("0 / 1000");
    await wrapper.find("textarea").setValue("a".repeat(1001));
    expect(wrapper.find(".c-comment-form__counter").text()).toBe("1001 / 1000");
    await wrapper.find("form").trigger("submit");
    expect(submit).not.toHaveBeenCalled();
  });

  it("clears after a successful submit and keeps input after a failure", async () => {
    const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const wrapper = mount(CommentForm, { props: { submit } });
    const area = wrapper.find("textarea");
    await area.setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect((area.element as HTMLTextAreaElement).value).toBe("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect((area.element as HTMLTextAreaElement).value).toBe("");
  });

  it("makes the counter a live region only from 900 characters", async () => {
    const wrapper = mount(CommentForm, { props: { submit: vi.fn() } });
    const counter = () => wrapper.find(".c-comment-form__counter").attributes("aria-live");
    expect(counter()).toBeUndefined();
    await wrapper.find("textarea").setValue("a".repeat(899));
    expect(counter()).toBeUndefined();
    await wrapper.find("textarea").setValue("a".repeat(900));
    expect(counter()).toBe("polite");
    expect(wrapper.find("[role=status]").exists()).toBe(false);
  });

  it("explains a refused submit and clears the hint once the text is long enough", async () => {
    const submit = vi.fn(async () => true);
    const wrapper = mount(CommentForm, { props: { submit } });
    const area = wrapper.find("textarea");
    expect(wrapper.find("button[type=submit]").attributes("disabled")).toBeUndefined();
    await wrapper.find("form").trigger("submit");
    expect(submit).not.toHaveBeenCalled();
    const hint = wrapper.find(".c-comment-form__error");
    expect(hint.text()).toBe("Bisken mehr musste schon schreiben.");
    expect(area.attributes("aria-describedby")).toBe(hint.attributes("id"));
    expect(area.attributes("aria-invalid")).toBe("true");
    await area.setValue("Na, ditt stimmt.");
    expect(wrapper.find(".c-comment-form__error").exists()).toBe(false);
    expect(area.attributes("aria-invalid")).toBeUndefined();
  });

  it("explains an over-long text", async () => {
    const wrapper = mount(CommentForm, { props: { submit: vi.fn() } });
    await wrapper.find("textarea").setValue("a".repeat(1001));
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find(".c-comment-form__error").text()).toBe(
      "Dit is zu lang: höchstens 1000 Zeichen.",
    );
  });

  it("submits with Ctrl+Enter and Cmd+Enter, not plain Enter", async () => {
    const submit = vi.fn(async () => false);
    const wrapper = mount(CommentForm, { props: { submit } });
    const area = wrapper.find("textarea");
    await area.setValue("Hallo Welt");
    await area.trigger("keydown", { key: "Enter" });
    expect(submit).not.toHaveBeenCalled();
    await area.trigger("keydown", { ctrlKey: true, key: "Enter" });
    await flushPromises();
    await area.trigger("keydown", { key: "Enter", metaKey: true });
    await flushPromises();
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("Ctrl+Enter is locked like the button: empty text, pending send, offline", async () => {
    let done!: (v: boolean) => void;
    const submit = vi.fn(() => new Promise<boolean>((r) => (done = r)));
    const wrapper = mount(CommentForm, { props: { submit } });
    const area = wrapper.find("textarea");
    await area.trigger("keydown", { ctrlKey: true, key: "Enter" }); // empty
    expect(submit).not.toHaveBeenCalled();
    await area.setValue("Hallo Welt");
    await area.trigger("keydown", { ctrlKey: true, key: "Enter" });
    await area.trigger("keydown", { ctrlKey: true, key: "Enter" }); // pending
    expect(submit).toHaveBeenCalledTimes(1);
    done(true);
    await flushPromises();
  });

  it("Ctrl+Enter without a captcha token shows the same wait status as the button", async () => {
    const submit = vi.fn(async () => "wait" as const);
    const wrapper = mount(CommentForm, { props: { submit } });
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("textarea").trigger("keydown", { ctrlKey: true, key: "Enter" });
    await flushPromises();
    expect(wrapper.find("[role=status]").exists()).toBe(true);
    expect(wrapper.find("[role=alert]").exists()).toBe(false);
  });

  it("shows the spec privacy sentence and the shortcut hint with .c-kbd", () => {
    const wrapper = mount(CommentForm, { props: { submit: vi.fn() } });
    expect(wrapper.find(".c-comment-form__privacy").text()).toContain(
      "Mit dem Abschicken wird dein Kommentar öffentlich angezeigt.",
    );
    expect(wrapper.findAll(".c-comment-form__kbd .c-kbd").map((k) => k.text())).toEqual([
      "Strg",
      "Enter",
    ]);
    expect(wrapper.find(".c-comment-form__kbd").text()).toContain("zum Abschicken");
  });

  it("edit: „Speichern“ is a pressed choice, no primary button, no hint", () => {
    const wrapper = mount(CommentForm, {
      props: { cancellable: true, edit: true, submit: vi.fn() },
    });
    const save = wrapper.find("button[type=submit]");
    expect(save.text()).toBe("Speichern");
    expect(save.classes()).toContain("c-choice");
    expect(save.attributes("aria-pressed")).toBe("true");
    expect(wrapper.find(".c-button[data-variant~='primary']").exists()).toBe(false);
    expect(wrapper.find(".c-comment-form__kbd").exists()).toBe(false);
  });

  it("shows a busy state while sending and blocks a second submit", async () => {
    let done!: (v: boolean) => void;
    const submit = vi.fn(() => new Promise<boolean>((r) => (done = r)));
    const wrapper = mount(CommentForm, { props: { submit } });
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await wrapper.find("form").trigger("submit");
    const button = wrapper.find("button[type=submit]");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(button.text()).toBe("Abschicken");
    expect(button.attributes("aria-busy")).toBe("true");
    // aria-disabled, not :disabled: the button keeps the focus
    expect(button.attributes("aria-disabled")).toBe("true");
    expect(button.attributes("disabled")).toBeUndefined();
    done(true);
    await flushPromises();
    expect(button.attributes("aria-busy")).toBe("false");
  });

  it("a failed send shows the error box once, keeps the text and renames the button", async () => {
    const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const wrapper = mount(CommentForm, { props: { submit } });
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    const box = wrapper.find(".c-state[data-variant~='error']");
    expect(box.attributes("role")).toBe("alert");
    expect(box.text()).toContain("Ditt hat nich jeklappt.");
    expect(box.text()).toContain("Dein Text bleibt stehen");
    expect(wrapper.find("button[type=submit]").text()).toBe("Nochmal abschicken");
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find(".c-state[data-variant~='error']").exists()).toBe(false);
    expect(wrapper.find("button[type=submit]").text()).toBe("Abschicken");
  });

  it("a missing captcha token shows a calm status, no error box, and the retry works", async () => {
    const submit = vi.fn().mockResolvedValueOnce("wait").mockResolvedValueOnce(true);
    const wrapper = mount(CommentForm, { props: { submit } });
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find(".c-state[data-variant~='error']").exists()).toBe(false);
    expect(wrapper.find("[role=alert]").exists()).toBe(false);
    expect(wrapper.find("[role=status]").text()).toBe("Moment noch, ick prüf dich kurz.");
    expect(wrapper.find("button[type=submit]").text()).toBe("Abschicken");
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find("[role=status]").exists()).toBe(false);
  });

  it("the wait status clears when the token arrives or the text is edited", async () => {
    const submit = vi.fn(async () => "wait" as const);
    const wrapper = mount(CommentForm, { props: { captchaReady: false, submit } });
    const status = () => wrapper.find("[role=status]").exists();
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(status()).toBe(true);
    await wrapper.setProps({ captchaReady: true });
    expect(status()).toBe(false);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(status()).toBe(true);
    await wrapper.find("textarea").setValue("Hallo Welt, noch was");
    expect(status()).toBe(false);
  });

  it("a stuck captcha says so in the status box", async () => {
    const wrapper = mount(CommentForm, { props: { submit: vi.fn(async () => "stuck" as const) } });
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find("[role=status]").text()).toContain("klemmt");
    expect(wrapper.find(".c-state[data-variant~='error']").exists()).toBe(false);
  });

  it("a failure with a reason shows it under the Spec sentence, headline unchanged", async () => {
    const submit = vi.fn(async () => ({ error: "Ma langsam, Keule – versuch's gleich nochmal." }));
    const wrapper = mount(CommentForm, { props: { submit } });
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    const box = wrapper.find(".c-state[data-variant~='error']");
    expect(box.find("b").text()).toBe("Ditt hat nich jeklappt.");
    expect(box.text()).toContain("Dein Text bleibt stehen");
    expect(box.find(".c-comment-form__reason").text()).toBe(
      "Ma langsam, Keule – versuch's gleich nochmal.",
    );
    expect(wrapper.findAll("[role=alert]")).toHaveLength(1);
  });

  it("offline: the button locks with a visible reason and nothing is sent", async () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const submit = vi.fn(async () => true);
    const wrapper = mount(CommentForm, { props: { submit } });
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    const button = wrapper.find("button[type=submit]");
    expect(submit).not.toHaveBeenCalled();
    expect(button.attributes("aria-disabled")).toBe("true");
    expect(button.attributes("disabled")).toBeUndefined();
    expect(wrapper.find(`#${button.attributes("aria-describedby")}`).text()).toContain(
      "Du bist offline.",
    );
    online.mockRestore();
  });

  it("focusOnMount puts the focus into the textarea", () => {
    const wrapper = mount(CommentForm, {
      attachTo: document.body,
      props: { focusOnMount: true, submit: vi.fn() },
    });
    expect(document.activeElement).toBe(wrapper.find("textarea").element);
    wrapper.unmount();
  });

  it("marks the name placeholder as an example and describes the anonymous default", () => {
    const wrapper = mount(CommentForm, { props: { submit: vi.fn() } });
    const name = wrapper.find("input");
    expect(name.attributes("placeholder")).toBe("z. B. Kiez-Kalle");
    expect(wrapper.find(`#${name.attributes("aria-describedby")}`).text()).toContain(
      "Berliner Namen",
    );
  });

  it("sends the trimmed name and „Abbrechen“ emits cancel", async () => {
    const submit = vi.fn(async () => true);
    const wrapper = mount(CommentForm, { props: { cancellable: true, submit } });
    await wrapper.find("input").setValue("  Kiez-Kalle ");
    await wrapper.find("textarea").setValue("Na sowat");
    await wrapper.find("form").trigger("submit");
    expect(submit).toHaveBeenCalledWith({ authorName: "Kiez-Kalle", text: "Na sowat" });
    await wrapper.find("button[type=button]").trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("shows ⌘ on Apple devices and Strg elsewhere", async () => {
    expect(
      mount(CommentForm, { props: { submit: vi.fn() } })
        .find(".c-kbd")
        .text(),
    ).toBe("Strg");
    const ua = vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh)");
    const wrapper = mount(CommentForm, { props: { submit: vi.fn() } });
    await flushPromises();
    expect(wrapper.find(".c-kbd").text()).toBe("⌘");
    ua.mockRestore();
  });
});
