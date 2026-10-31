import type { PublicComment } from "@utils/commentSchema.ts";

import CommentCard from "@components/comments/CommentCard.vue";
import CommentForm from "@components/comments/CommentForm.vue";
import { commentsKey } from "@composables/useComments.ts";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));
const { writeText } = vi.hoisted(() => ({ writeText: vi.fn(async () => {}) }));
vi.mock("@vueuse/core", async (orig) => ({
  ...(await orig<typeof import("@vueuse/core")>()),
  useClipboard: () => ({ copy: writeText }),
}));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const base: PublicComment = {
  authorName: "Anonymer Berliner",
  createdAt: new Date().toISOString(),
  downvotes: 0,
  edited: false,
  id: 1,
  myVote: 0,
  parentId: null,
  removalReason: null,
  replies: [],
  state: "visible",
  text: "Hallo",
  upvotes: 3,
};

const openMenu = async (wrapper: VueWrapper) => {
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "open" }));
  await wrapper.vm.$nextTick();
  return wrapper.findAll(".c-comment-card__menu-item");
};

const mountCard = (comment: Partial<PublicComment>, canEdit = false) => {
  const ctx = {
    busy: ref(new Set<number>()),
    canEdit: () => canEdit,
    edit: vi.fn(async () => "ok"),
    highlighted: ref<null | number>(null),
    isOwn: (id: number) => id === 99,
    post: vi.fn(async () => "ok"),
    remove: vi.fn(async () => true),
    report: vi.fn(async () => true),
    resetCaptcha: vi.fn(),
    takeToken: () => "tok",
    token: ref("tok"),
    vote: vi.fn(),
    wordId: 7,
  };
  return {
    ctx,
    wrapper: mount(CommentCard, {
      global: { provide: { [commentsKey as symbol]: ctx } },
      props: { comment: { ...base, ...comment } },
    }),
  };
};

describe("CommentCard", () => {
  it("keeps votes and „Antworten“ on the card, the rest behind „…“", async () => {
    const { wrapper } = mountCard({});
    expect(wrapper.find(".c-comment-card__vote").exists()).toBe(true);
    expect(wrapper.find(".c-comment-card__reply").exists()).toBe(true);
    expect(wrapper.find('[aria-label="Weitere Aktionen"]').exists()).toBe(true);
    expect(wrapper.findAll(".c-comment-card__menu-item")).toHaveLength(0);
  });

  it("menu: others' comment = Melden + Link; own comment in edit window = Link + Bearbeiten + Löschen", async () => {
    const labels = async (id: number, canEdit: boolean) =>
      (await openMenu(mountCard({ id }, canEdit).wrapper)).map((b) => b.text());
    expect(await labels(1, false)).toEqual(["Melden", "Link kopieren"]);
    expect(await labels(99, true)).toEqual(["Link kopieren", "Bearbeiten", "Löschen"]);
    expect(await labels(99, false)).toEqual(["Link kopieren"]);
  });

  it("placeholders have no menu", () => {
    const { wrapper } = mountCard({ state: "removed", text: null });
    expect(wrapper.find('[aria-label="Weitere Aktionen"]').exists()).toBe(false);
  });

  it("renders text as text (no HTML)", () => {
    const { wrapper } = mountCard({ text: "<b>fett</b><img src=x>" });
    expect(wrapper.find(".c-comment-card__text").text()).toBe("<b>fett</b><img src=x>");
    expect(wrapper.find("b").exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("placeholder shows „Wird geprüft“ without vote buttons", () => {
    const { wrapper } = mountCard({ state: "reviewing", text: null });
    expect(wrapper.text()).toContain("Wird geprüft");
    expect(wrapper.find(".c-comment-card__vote").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Antworten");
  });

  it("removed placeholder shows the reason", () => {
    const { wrapper } = mountCard({ removalReason: "Spam", state: "removed", text: null });
    expect(wrapper.text()).toContain("Kommentar entfernt: Spam");
  });

  it("reply prefills @Name", async () => {
    const { wrapper } = mountCard({ authorName: "Icke" });
    await wrapper.find(".c-comment-card__reply").trigger("click");
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("@Icke ");
  });

  it("vote sends the opposite when clicking the own vote again", async () => {
    const { ctx, wrapper } = mountCard({ myVote: 1 });
    await wrapper.find(".c-comment-card__vote-up").trigger("click");
    expect(ctx.vote).toHaveBeenCalledWith(1, 0);
  });

  it("report submit is disabled while pending and sends once", async () => {
    const { ctx, wrapper } = mountCard({});
    let done!: (v: boolean) => void;
    ctx.report.mockReturnValue(new Promise<boolean>((r) => (done = r)));
    await (await openMenu(wrapper)).find((b) => b.text() === "Melden")!.trigger("click");
    const form = wrapper.find(".c-comment-card__report");
    await form.trigger("submit");
    await form.trigger("submit");
    expect(ctx.report).toHaveBeenCalledTimes(1);
    expect(form.find("button").attributes("disabled")).toBeDefined();
    expect(form.find("button").attributes("aria-busy")).toBe("true");
    expect(form.find("button").text()).toBe("Wird jemeldet …");
    done(true);
  });

  it("report form sends the trimmed reason and „Abbrechen“ closes it", async () => {
    const { ctx, wrapper } = mountCard({});
    const openReport = async () =>
      (await openMenu(wrapper)).find((b) => b.text() === "Melden")!.trigger("click");
    await openReport();
    const buttons = () => wrapper.findAll(".c-comment-card__report button").map((b) => b.text());
    expect(buttons()).toEqual(["Melden", "Abbrechen"]);
    await wrapper.find(".c-comment-card__report button[type=button]").trigger("click");
    expect(wrapper.find(".c-comment-card__report").exists()).toBe(false);
    expect(ctx.report).not.toHaveBeenCalled();

    await openReport();
    await wrapper.find(".c-comment-card__report input").setValue("  Spam  ");
    await wrapper.find(".c-comment-card__report").trigger("submit");
    await flushPromises();
    expect(ctx.report).toHaveBeenCalledWith(1, "Spam", "tok");
    expect(wrapper.text()).toContain("Danke, wir kieken drüber.");
  });

  it("hides „Antworten“ on a reply under a placeholder", () => {
    const placeholder = { ...base, id: 2, replies: [{ ...base, id: 3, parentId: 2 }], state: "removed" as const, text: null };
    const { wrapper } = mountCard(placeholder);
    expect(wrapper.text()).toContain("Hallo");
    expect(wrapper.find(".c-comment-card__reply").exists()).toBe(false);
    expect(mountCard({}).wrapper.find(".c-comment-card__reply").exists()).toBe(true);
  });

  it("has an anchor id, a permalink and a link copy action", async () => {
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    const { wrapper } = mountCard({
      id: 4,
      replies: [{ ...base, id: 5, parentId: 4 }],
    });
    expect(wrapper.attributes("id")).toBe("kommentar-4");
    expect(wrapper.find("#kommentar-5").exists()).toBe(true);
    expect(wrapper.find("a.c-comment-card__permalink").attributes("href")).toBe("#kommentar-4");
    const copy = (await openMenu(wrapper)).find((b) => b.text() === "Link kopieren")!;
    await copy.trigger("click");
    await vi.waitFor(() => expect(createToastNotify).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(`${location.href.split("#")[0]}#kommentar-4`);
  });

  it("marks the linked comment as highlighted", () => {
    const { ctx, wrapper } = mountCard({ id: 4 });
    expect(wrapper.classes()).not.toContain("is-highlighted");
    ctx.highlighted.value = 4;
    return wrapper.vm.$nextTick().then(() => expect(wrapper.classes()).toContain("is-highlighted"));
  });

  it("vote down tracks the vote; a failed vote is not tracked", async () => {
    const { trackEvent } = await import("@utils/analytics");
    vi.mocked(trackEvent).mockClear();
    const { ctx, wrapper } = mountCard({});
    ctx.vote.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await wrapper.find(".c-comment-card__vote-down").trigger("click");
    await flushPromises();
    expect(ctx.vote).toHaveBeenCalledWith(1, -1);
    expect(trackEvent).toHaveBeenCalledWith("Comments", "Vote", "7");
    await wrapper.find(".c-comment-card__vote-down").trigger("click");
    await flushPromises();
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it("reply: posts under the thread root, closes on success, stays open on error or without token", async () => {
    const { ctx, wrapper } = mountCard({ id: 3, parentId: 1 });
    await wrapper.find(".c-comment-card__reply").trigger("click");
    const submit = () => wrapper.findComponent(CommentForm).props("submit") as (v: { authorName: string; text: string }) => Promise<boolean>;
    ctx.post.mockResolvedValueOnce("error");
    expect(await submit()({ authorName: "", text: "Jenau so" })).toBe(false);
    expect(ctx.post).toHaveBeenCalledWith({ authorName: "", parentId: 1, text: "Jenau so" }, "tok");
    expect(ctx.resetCaptcha).toHaveBeenCalled();
    ctx.takeToken = () => null as unknown as string;
    expect(await submit()({ authorName: "", text: "Jenau so" })).toBe(false);
    ctx.takeToken = () => "tok";
    expect(await submit()({ authorName: "", text: "Jenau so" })).toBe(true);
    await flushPromises();
    expect(wrapper.findComponent(CommentForm).exists()).toBe(false);
  });

  it("„Antworten“ toggles the reply form and „Abbrechen“ closes it", async () => {
    const { wrapper } = mountCard({});
    await wrapper.find(".c-comment-card__reply").trigger("click");
    await wrapper.find(".c-comment-card__reply").trigger("click");
    expect(wrapper.findComponent(CommentForm).exists()).toBe(false);
    await wrapper.find(".c-comment-card__reply").trigger("click");
    wrapper.findComponent(CommentForm).vm.$emit("cancel");
    await flushPromises();
    expect(wrapper.findComponent(CommentForm).exists()).toBe(false);
  });

  it("edit: „Bearbeiten“ opens the form with the text, success closes it, an error keeps it", async () => {
    const { ctx, wrapper } = mountCard({ edited: true, id: 99 }, true);
    expect(wrapper.text()).toContain("(bearbeitet)");
    await (await openMenu(wrapper)).find((b) => b.text() === "Bearbeiten")!.trigger("click");
    const form = () => wrapper.findComponent(CommentForm);
    expect(form().props("initialText")).toBe("Hallo");
    const submit = form().props("submit") as (v: { text: string }) => Promise<boolean>;
    ctx.edit.mockResolvedValueOnce("error");
    expect(await submit({ text: "Neu jeschrieben" })).toBe(false);
    expect(form().exists()).toBe(true);
    expect(await submit({ text: "Neu jeschrieben" })).toBe(true);
    expect(ctx.edit).toHaveBeenCalledWith(99, "Neu jeschrieben");
    await flushPromises();
    expect(form().exists()).toBe(false);
  });

  it("edit form cancels back to the text", async () => {
    const { wrapper } = mountCard({ id: 99 }, true);
    await (await openMenu(wrapper)).find((b) => b.text() === "Bearbeiten")!.trigger("click");
    wrapper.findComponent(CommentForm).vm.$emit("cancel");
    await flushPromises();
    expect(wrapper.find(".c-comment-card__text").exists()).toBe(true);
  });

  it("„Löschen“ removes the own comment", async () => {
    const { ctx, wrapper } = mountCard({ id: 99 }, true);
    await (await openMenu(wrapper)).find((b) => b.text() === "Löschen")!.trigger("click");
    expect(ctx.remove).toHaveBeenCalledWith(99);
  });

  it("report: no token sends nothing, a refused report keeps the form", async () => {
    const { ctx, wrapper } = mountCard({});
    await (await openMenu(wrapper)).find((b) => b.text() === "Melden")!.trigger("click");
    ctx.takeToken = () => null as unknown as string;
    await wrapper.find(".c-comment-card__report").trigger("submit");
    expect(ctx.report).not.toHaveBeenCalled();
    ctx.takeToken = () => "tok";
    ctx.report.mockResolvedValueOnce(false);
    await wrapper.find(".c-comment-card__report").trigger("submit");
    await flushPromises();
    expect(wrapper.find(".c-comment-card__report").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Danke");
  });

  it("shows the age relative to now", () => {
    const createdAt = new Date(Date.now() - 2 * 3600_000).toISOString();
    expect(mountCard({ createdAt }).wrapper.find("time").text()).toBe("vor 2 Stunden");
    expect(mountCard({}).wrapper.find("time").text()).toBe("jetzt");
  });

  it("removed placeholder without a reason", () => {
    expect(mountCard({ state: "removed", text: null }).wrapper.text()).toContain("Kommentar entfernt");
  });

  it("a reply to a top-level comment goes under that comment", async () => {
    const { ctx, wrapper } = mountCard({ id: 4 });
    await wrapper.find(".c-comment-card__reply").trigger("click");
    const submit = wrapper.findComponent(CommentForm).props("submit") as (v: { authorName: string; text: string }) => Promise<boolean>;
    await submit({ authorName: "", text: "Jenau so" });
    expect(ctx.post).toHaveBeenCalledWith({ authorName: "", parentId: 4, text: "Jenau so" }, "tok");
  });

  it("edit starts empty when the text is missing", async () => {
    const { wrapper } = mountCard({ id: 99, text: null }, true);
    await (await openMenu(wrapper)).find((b) => b.text() === "Bearbeiten")!.trigger("click");
    expect(wrapper.findComponent(CommentForm).props("initialText")).toBe("");
  });
});

