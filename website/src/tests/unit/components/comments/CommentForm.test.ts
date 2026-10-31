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
});
