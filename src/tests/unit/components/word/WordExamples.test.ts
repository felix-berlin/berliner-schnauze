import WordExamples from "@components/word/WordExamples.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@components/AudioPlayerList.vue", () => ({
  __esModule: true,
  default: { name: "AudioPlayerList", template: "<div class='mock-audio-player'></div>" },
}));

describe("WordExamples.vue", () => {
  it("renders no single-example or list when examples is empty", () => {
    const wrapper = mount(WordExamples, { props: { examples: [] } });
    expect(wrapper.find(".c-word-list__single-example").exists()).toBe(false);
    expect(wrapper.find("ol").exists()).toBe(false);
  });

  it("renders no content when examples is null", () => {
    const wrapper = mount(WordExamples, { props: { examples: null } });
    expect(wrapper.find(".c-word-list__example-wrapper").exists()).toBe(false);
  });

  it("renders wrapper when a single example is provided", () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [{ example: "Det is keen Zufall.", exampleExplanation: null, exampleAudio: null }],
      },
    });
    expect(wrapper.find(".c-word-list__example-wrapper").exists()).toBe(true);
  });

  it("renders single example text", () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [{ example: "Ick bin een Berliner.", exampleExplanation: null, exampleAudio: null }],
      },
    });
    expect(wrapper.find(".c-word-list__example").text()).toBe("Ick bin een Berliner.");
  });

  it("renders example explanation when present", () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [
          {
            example: "Ick bin een Berliner.",
            exampleExplanation: "Ich bin ein Berliner.",
            exampleAudio: null,
          },
        ],
      },
    });
    expect(wrapper.find(".c-word-list__example-explanation").text()).toContain(
      "Ich bin ein Berliner.",
    );
  });

  it("does not render explanation element when exampleExplanation is absent", () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [{ example: "Ick bin een Berliner.", exampleExplanation: null, exampleAudio: null }],
      },
    });
    expect(wrapper.find(".c-word-list__example-explanation").exists()).toBe(false);
  });

  it("renders an ordered list when more than one example", () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [
          { example: "Beispiel eins.", exampleExplanation: null, exampleAudio: null },
          { example: "Beispiel zwei.", exampleExplanation: null, exampleAudio: null },
        ],
      },
    });
    expect(wrapper.find("ol").exists()).toBe(true);
    expect(wrapper.findAll("li")).toHaveLength(2);
  });

  it("renders the correct text for each item in the list", () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [
          { example: "Erster.", exampleExplanation: null, exampleAudio: null },
          { example: "Zweiter.", exampleExplanation: null, exampleAudio: null },
        ],
      },
    });
    const items = wrapper.findAll("li");
    expect(items[0].text()).toContain("Erster.");
    expect(items[1].text()).toContain("Zweiter.");
  });

  it("renders explanation in list item when exampleExplanation is set", () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [
          { example: "Erster.", exampleExplanation: "First.", exampleAudio: null },
          { example: "Zweiter.", exampleExplanation: null, exampleAudio: null },
        ],
      },
    });
    const firstItem = wrapper.findAll("li")[0];
    expect(firstItem.text()).toContain("First.");
  });

  it("applies custom rootBemClass to element classes", () => {
    const wrapper = mount(WordExamples, {
      props: {
        rootBemClass: "c-my-word",
        examples: [{ example: "Test.", exampleExplanation: null, exampleAudio: null }],
      },
    });
    expect(wrapper.find(".c-my-word__example-wrapper").exists()).toBe(true);
    expect(wrapper.find(".c-my-word__example").exists()).toBe(true);
  });

  it("renders the quote icon", () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [{ example: "Test.", exampleExplanation: null, exampleAudio: null }],
      },
    });
    expect(wrapper.find("[data-testid='icon-lucide-quote']").exists()).toBe(true);
  });

  it("renders AudioPlayerList when single example has exampleAudio", async () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [{ example: "Test.", exampleExplanation: null, exampleAudio: [{ url: "audio.mp3", label: "" }] as any }],
      },
    });
    await flushPromises();
    expect(wrapper.find(".mock-audio-player").exists()).toBe(true);
  });

  it("renders AudioPlayerList in list items when exampleAudio is present", async () => {
    const wrapper = mount(WordExamples, {
      props: {
        examples: [
          { example: "Erster.", exampleExplanation: null, exampleAudio: [{ url: "a.mp3", label: "" }] as any },
          { example: "Zweiter.", exampleExplanation: null, exampleAudio: null },
        ],
      },
    });
    await flushPromises();
    expect(wrapper.find(".mock-audio-player").exists()).toBe(true);
  });
});
