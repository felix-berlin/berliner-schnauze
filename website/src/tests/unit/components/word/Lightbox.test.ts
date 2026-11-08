import Lightbox from "@components/word/Lightbox.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

const images = [1, 2, 3].map((i) => ({ alt: `Bild ${i}`, credit: i === 2 ? "Foto <a href='#'>X</a>" : null, src: `/${i}.jpg` }));

const setup = async () => {
  const openers = images.map((_, i) => {
    const b = document.createElement("button");
    b.dataset.lightboxIndex = String(i);
    document.body.append(b);
    return b;
  });
  const wrapper = mount(Lightbox, { attachTo: document.body, props: { images } });
  await flushPromises();
  return { openers, wrapper };
};
const shown = (w: Awaited<ReturnType<typeof setup>>["wrapper"]) => w.find("img").attributes("src");

describe("Lightbox", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens at the index of the clicked opener", async () => {
    const { openers, wrapper } = await setup();
    openers[1]!.click();
    await flushPromises();
    expect(shown(wrapper)).toBe("/2.jpg");
    expect(wrapper.text()).toContain("2 / 3");
    expect(wrapper.find(".c-lightbox__caption").html()).toContain("<a href");
  });

  it("wraps with ArrowRight and ArrowLeft", async () => {
    const { openers, wrapper } = await setup();
    openers[2]!.click();
    await flushPromises();
    await wrapper.find("dialog").trigger("keydown", { key: "ArrowRight" });
    expect(shown(wrapper)).toBe("/1.jpg");
    await wrapper.find("dialog").trigger("keydown", { key: "ArrowLeft" });
    expect(shown(wrapper)).toBe("/3.jpg");
  });

  it("returns focus to the opener when the dialog closes", async () => {
    const { openers, wrapper } = await setup();
    openers[1]!.click();
    await flushPromises();
    await wrapper.find("dialog").trigger("close");
    expect(document.activeElement).toBe(openers[1]);
  });
});
