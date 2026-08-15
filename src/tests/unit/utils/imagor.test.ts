import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({
  IMAGOR_HOST: "https://assets.kasimir.dev",
  IMAGOR_SECRET: "1234",
}));

const { buildImagorPath, signImagorPath } = await import("@utils/imagor");

describe("buildImagorPath", () => {
  it("builds a fit-in path with format, quality, and an encoded upstream URL", () => {
    const path = buildImagorPath("https://cms.berliner-schnauze.wtf/wp-content/uploads/foo.png", {
      width: 400,
      height: 200,
      format: "webp",
      quality: 80,
    });

    expect(path).toBe(
      "fit-in/400x200/filters:format(webp):quality(80)/https%3A%2F%2Fcms.berliner-schnauze.wtf%2Fwp-content%2Fuploads%2Ffoo.png",
    );
  });

  it("defaults quality to 80 and format to webp when omitted", () => {
    const path = buildImagorPath("https://upload.wikimedia.org/x.jpg", {
      width: 100,
      height: 50,
    });

    expect(path).toBe(
      "fit-in/100x50/filters:format(webp):quality(80)/https%3A%2F%2Fupload.wikimedia.org%2Fx.jpg",
    );
  });
});

describe("signImagorPath", () => {
  it("matches Imagor's own reference test vector (cshum/imagor imagorpath/params_test.go, SHA256 signer)", () => {
    // Reference vector: secret "1234", HMAC-SHA256, base64url, truncated to 40 chars.
    const path = "meta/10x11:12x13/fit-in/-300x-200/5x6/left/top/smart/filters:some_filter()/img";

    const signed = signImagorPath(path);

    expect(signed).toBe(
      "https://assets.kasimir.dev/XBCO7esuLsNQuSF2v9ie36pESRGx2rzLjhUxXWnV/meta/10x11:12x13/fit-in/-300x-200/5x6/left/top/smart/filters:some_filter()/img",
    );
  });

  it("is deterministic for the same input", () => {
    expect(signImagorPath("fit-in/1x1/x")).toBe(signImagorPath("fit-in/1x1/x"));
  });

  it("produces a different hash when the path changes", () => {
    expect(signImagorPath("fit-in/1x1/a")).not.toBe(signImagorPath("fit-in/1x1/b"));
  });
});
