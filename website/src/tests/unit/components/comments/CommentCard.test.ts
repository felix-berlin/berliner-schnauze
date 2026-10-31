import type { PublicComment } from "@utils/commentSchema.ts";

import CommentCard from "@components/comments/CommentCard.vue";
import { commentsKey } from "@composables/useComments.ts";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));
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

const mountCard = (comment: Partial<PublicComment>) => {
  const ctx = {
    busy: ref(new Set<number>()),
    canEdit: () => false,
    edit: vi.fn(async () => "ok"),
    post: vi.fn(async () => "ok"),
    remove: vi.fn(async () => true),
    report: vi.fn(async () => true),
    resetCaptcha: vi.fn(),
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
});
