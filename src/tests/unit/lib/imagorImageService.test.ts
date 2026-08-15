import { describe, expect, it, vi } from "vitest";

const buildImagorPathMock = vi.fn(
  () => "fit-in/400x200/filters:format(webp):quality(80)/encoded-url",
);
const signImagorPathMock = vi.fn(
  (path: string) => `https://assets.kasimir.dev/signed-hash/${path}`,
);

vi.mock("@utils/imagor", () => ({
  buildImagorPath: buildImagorPathMock,
  signImagorPath: signImagorPathMock,
}));

const { default: imagorImageService } = await import("../../../lib/imagorImageService");

describe("imagorImageService.getURL", () => {
  it("builds and signs a path for a remote string src with width/height", () => {
    const url = imagorImageService.getURL(
      {
        src: "https://cms.berliner-schnauze.wtf/foo.png",
        width: 400,
        height: 200,
        format: "webp",
        quality: 80,
      },
      {} as never,
    );

    expect(buildImagorPathMock).toHaveBeenCalledWith("https://cms.berliner-schnauze.wtf/foo.png", {
      width: 400,
      height: 200,
      format: "webp",
      quality: 80,
    });
    expect(signImagorPathMock).toHaveBeenCalledWith(
      "fit-in/400x200/filters:format(webp):quality(80)/encoded-url",
    );
    expect(url).toBe(
      "https://assets.kasimir.dev/signed-hash/fit-in/400x200/filters:format(webp):quality(80)/encoded-url",
    );
  });

  it("throws when width is missing", () => {
    expect(() =>
      imagorImageService.getURL(
        { src: "https://cms.berliner-schnauze.wtf/foo.png", height: 200 },
        {} as never,
      ),
    ).toThrow(/width and height/);
  });

  it("throws when height is missing", () => {
    expect(() =>
      imagorImageService.getURL(
        { src: "https://cms.berliner-schnauze.wtf/foo.png", width: 400 },
        {} as never,
      ),
    ).toThrow(/width and height/);
  });

  it("returns the original asset URL for local (ESM-imported) src", () => {
    buildImagorPathMock.mockClear();
    signImagorPathMock.mockClear();

    const localSrc = { src: "/local-image-abc123.png" } as never;
    const url = imagorImageService.getURL({ src: localSrc, width: 100, height: 100 }, {} as never);

    expect(url).toBe("/local-image-abc123.png");
    expect(buildImagorPathMock).not.toHaveBeenCalled();
    expect(signImagorPathMock).not.toHaveBeenCalled();
  });

  it("skips the fallback format at 1x density (reserved for img tag), includes other formats and densities", () => {
    const srcSet = imagorImageService.getSrcSet(
      {
        src: "https://cms.berliner-schnauze.wtf/foo.png",
        width: 48,
        height: 66,
        format: "avif",
        densities: [1, 2],
        formats: ["avif", "webp"],
      },
      {} as never,
    );

    expect(srcSet).toHaveLength(3);
    expect(
      srcSet.map(
        (entry: {
          descriptor?: string;
          transform: { format?: string; width?: number; height?: number };
        }) => ({
          descriptor: entry.descriptor,
          format: entry.transform.format,
          width: entry.transform.width,
          height: entry.transform.height,
        }),
      ),
    ).toEqual([
      { descriptor: "1x", format: "avif", width: 48, height: 66 },
      { descriptor: "2x", format: "avif", width: 96, height: 132 },
      { descriptor: "2x", format: "webp", width: 96, height: 132 },
    ]);
  });
});

describe("imagorImageService transform-shape hooks", () => {
  it("delegates validateOptions and HTML attributes to Astro's baseService, but overrides srcset generation for Imagor", async () => {
    const { baseService } = await import("astro/assets");

    expect(imagorImageService.validateOptions).toBe(baseService.validateOptions);
    expect(imagorImageService.getSrcSet).not.toBe(baseService.getSrcSet);
    expect(imagorImageService.getHTMLAttributes).toBe(baseService.getHTMLAttributes);
  });
});
