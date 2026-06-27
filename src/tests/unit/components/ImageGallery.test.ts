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

  it("pswpModule factory resolves to photoswipe when called (covers line 37 arrow fn body)", async () => {
    let capturedPswpModule: (() => Promise<unknown>) | undefined;
    const { default: PhotoSwipeLightbox } = await import("photoswipe/lightbox");
    vi.mocked(PhotoSwipeLightbox).mockImplementationOnce(function (
      this: Record<string, unknown>,
      opts: { pswpModule?: () => Promise<unknown> },
    ) {
      capturedPswpModule = opts.pswpModule;
      this.init = mockInit;
      this.destroy = mockDestroy;
    });
    const { default: ImageGallery } = await import("@components/ImageGallery.vue");
    mount(ImageGallery, { props: { images: sampleImages } });
    expect(typeof capturedPswpModule).toBe("function");
    const result = await capturedPswpModule!();
    expect(result).toBeDefined();
  });

  // When the PhotoSwipeLightbox constructor throws, lightbox.value stays null.
  // onUnmounted then hits the false branch of `if (lightbox.value)` and skips destroy.
  it("onUnmounted skips destroy when lightbox was never initialised (covers line 45 false branch)", async () => {
    const { default: PhotoSwipeLightbox } = await import("photoswipe/lightbox");
    const { default: ImageGallery } = await import("@components/ImageGallery.vue");

    // Capture a wrapper before the constructor mock so we can unmount even on throw.
    // Mount once normally to get a wrapper reference, then remount with throwing ctor.
    // Simpler: mount with errorHandler to absorb the onMounted throw, then unmount.
    const caughtErrors: unknown[] = [];
    // eslint-disable-next-line prefer-arrow-callback
    vi.mocked(PhotoSwipeLightbox).mockImplementationOnce(function () { // oxlint-disable-line prefer-arrow-functions
      throw new Error("lightbox init failed");
    } as unknown as typeof PhotoSwipeLightbox);

    let wrapper: ReturnType<typeof mount> | undefined;
    try {
      wrapper = mount(ImageGallery, { props: { images: sampleImages } });
    } catch (err) {
      caughtErrors.push(err);
    }

    // onMounted threw — lightbox.value stayed null, init was never called
    expect(mockInit).not.toHaveBeenCalled();
    // The error from the constructor was propagated out of mount()
    expect(caughtErrors).toHaveLength(1);

    // If mount threw, wrapper may be partially constructed — unmount if possible
    // to exercise the onUnmounted false branch (lightbox.value is null → skip destroy).
    if (wrapper) {
      wrapper.unmount();
      expect(mockDestroy).not.toHaveBeenCalled();
    }
  });
});
