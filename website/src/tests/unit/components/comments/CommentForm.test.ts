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

  it("announces the remaining characters only near the limit", async () => {
    const wrapper = mount(CommentForm, { props: { submit: vi.fn() } });
    const status = () => wrapper.find("[role=status]").text();
    expect(wrapper.find(".c-comment-form__counter").attributes("aria-live")).toBeUndefined();
    await wrapper.find("textarea").setValue("a".repeat(100));
    expect(status()).toBe("");
    await wrapper.find("textarea").setValue("a".repeat(960));
    expect(status()).toBe("Noch 40 Zeichen");
    await wrapper.find("textarea").setValue("a".repeat(1003));
    expect(status()).toBe("3 Zeichen zu viel");
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

  it("shows a busy state while sending and blocks a second submit", async () => {
    let done!: (v: boolean) => void;
    const submit = vi.fn(() => new Promise<boolean>((r) => (done = r)));
    const wrapper = mount(CommentForm, { props: { submit } });
    await wrapper.find("textarea").setValue("Hallo Welt");
    await wrapper.find("form").trigger("submit");
    await wrapper.find("form").trigger("submit");
    const button = wrapper.find("button[type=submit]");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(button.text()).toBe("Wird jeschickt …");
    expect(button.attributes("aria-busy")).toBe("true");
    expect(button.attributes("disabled")).toBeDefined();
    done(true);
    await flushPromises();
    expect(button.text()).toBe("Abschicken");
  });

  it("marks the name placeholder as an example and describes the anonymous default", () => {
    const wrapper = mount(CommentForm, { props: { submit: vi.fn() } });
    const name = wrapper.find("input");
    expect(name.attributes("placeholder")).toBe("z. B. Kiez-Kalle");
    expect(wrapper.find(`#${name.attributes("aria-describedby")}`).text()).toContain(
      "Berliner Namen",
    );
  });
});
