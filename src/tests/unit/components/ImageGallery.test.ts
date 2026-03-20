import ImageGallery from "@components/ImageGallery.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  constructorSpy: vi.fn(),
  destroySpy: vi.fn(),
  initSpy: vi.fn(),
}));

vi.mock("photoswipe/lightbox", () => ({
  default: class PhotoSwipeLightbox {
    constructor(options: unknown) {
      spies.constructorSpy(options);
    }

    init() {
      spies.initSpy();
    }

    destroy() {
      spies.destroySpy();
    }
  },
}));

describe("ImageGallery.vue", () => {
  it("initializes and destroys lightbox during lifecycle", () => {
    const wrapper = mount(ImageGallery, {
      props: {
        id: "gallery-a",
        images: [
          {
            image: {
              preferred: {
                height: 480,
                url: "https://example.com/image-1.jpg",
                width: 640,
              },
            },
          },
        ],
      },
    });

    expect(spies.constructorSpy).toHaveBeenCalledTimes(1);
    expect(spies.constructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        childSelector: "a",
        gallerySelector: "#gallery-a",
      }),
    );
    expect(spies.initSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();

    expect(spies.destroySpy).toHaveBeenCalledTimes(1);
  });
});