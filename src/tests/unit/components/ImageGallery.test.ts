import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockInit, mockDestroy } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockDestroy: vi.fn(),
}));

vi.mock("photoswipe/lightbox", () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.init = mockInit;
    this.destroy = mockDestroy;
  }),
}));

vi.mock("photoswipe/style.css", () => ({}));
vi.mock("photoswipe", () => ({ default: {} }));

const sampleImages = [
  { image: { preferred: { url: "https://example.com/img1.jpg", width: 800, height: 600 } } },
  { image: { preferred: { url: "https://example.com/img2.jpg", width: 1024, height: 768 } } },
];

describe("ImageGallery.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a gallery container", async () => {
    const ImageGallery = (await import("@components/ImageGallery.vue")).default;
    const wrapper = mount(ImageGallery, {
      props: { images: sampleImages },
    });
    expect(wrapper.find(".pswp-gallery").exists()).toBe(true);
  });

  it("renders links for each image", async () => {
    const ImageGallery = (await import("@components/ImageGallery.vue")).default;
    const wrapper = mount(ImageGallery, {
      props: { images: sampleImages },
    });
    const links = wrapper.findAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].attributes("href")).toBe("https://example.com/img1.jpg");
  });

  it("sets data-pswp-width and data-pswp-height attributes", async () => {
    const ImageGallery = (await import("@components/ImageGallery.vue")).default;
    const wrapper = mount(ImageGallery, {
      props: { images: sampleImages },
    });
    const firstLink = wrapper.find("a");
    expect(firstLink.attributes("data-pswp-width")).toBe("800");
    expect(firstLink.attributes("data-pswp-height")).toBe("600");
  });

  it("renders img tags with correct src", async () => {
    const ImageGallery = (await import("@components/ImageGallery.vue")).default;
    const wrapper = mount(ImageGallery, {
      props: { images: sampleImages },
    });
    const imgs = wrapper.findAll("img");
    expect(imgs[0].attributes("src")).toBe("https://example.com/img1.jpg");
  });

  it("uses provided id", async () => {
    const ImageGallery = (await import("@components/ImageGallery.vue")).default;
    const wrapper = mount(ImageGallery, {
      props: { id: "my-gallery", images: sampleImages },
    });
    expect(wrapper.find(".pswp-gallery").attributes("id")).toBe("my-gallery");
  });

  it("initializes and destroys lightbox", async () => {
    const PhotoSwipeLightbox = (await import("photoswipe/lightbox")).default;
    const ImageGallery = (await import("@components/ImageGallery.vue")).default;
    const wrapper = mount(ImageGallery, { props: { images: sampleImages } });
    expect(PhotoSwipeLightbox).toHaveBeenCalled();
    const instance = vi.mocked(PhotoSwipeLightbox).mock.results[0].value;
    expect(instance.init).toHaveBeenCalled();

    wrapper.unmount();
    expect(instance.destroy).toHaveBeenCalled();
  });
});
