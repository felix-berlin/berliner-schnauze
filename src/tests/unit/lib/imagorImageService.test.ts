import { describe, expect, it, vi } from "vitest";

const buildImagorPathMock = vi.fn(() => "fit-in/400x200/filters:format(webp):quality(80)/encoded-url");
const signImagorPathMock = vi.fn((path: string) => `https://assets.kasimir.dev/signed-hash/${path}`);

vi.mock("@utils/imagor", () => ({
  buildImagorPath: buildImagorPathMock,
  signImagorPath: signImagorPathMock,
}));

const { default: imagorImageService } = await import("@lib/imagorImageService");

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
    expect(signImagorPathMock).toHaveBeenCalledWith("fit-in/400x200/filters:format(webp):quality(80)/encoded-url");
    expect(url).toBe(
      "https://assets.kasimir.dev/signed-hash/fit-in/400x200/filters:format(webp):quality(80)/encoded-url",
    );
  });

  it("throws when width is missing", () => {
    expect(() =>
      imagorImageService.getURL({ src: "https://cms.berliner-schnauze.wtf/foo.png", height: 200 }, {} as never),
    ).toThrow(/width and height/);
  });

  it("throws when height is missing", () => {
    expect(() =>
      imagorImageService.getURL({ src: "https://cms.berliner-schnauze.wtf/foo.png", width: 400 }, {} as never),
    ).toThrow(/width and height/);
  });

  it("throws for non-string (ESM-imported) src", () => {
    expect(() =>
      imagorImageService.getURL(
        { src: { src: "/local.png" } as never, width: 400, height: 200 },
        {} as never,
      ),
    ).toThrow(/remote/);
  });
});

describe("imagorImageService transform-shape hooks", () => {
  it("delegates validateOptions, getSrcSet, and getHTMLAttributes to Astro's baseService", async () => {
    const { baseService } = await import("astro/assets");

    expect(imagorImageService.validateOptions).toBe(baseService.validateOptions);
    expect(imagorImageService.getSrcSet).toBe(baseService.getSrcSet);
    expect(imagorImageService.getHTMLAttributes).toBe(baseService.getHTMLAttributes);
  });
});
