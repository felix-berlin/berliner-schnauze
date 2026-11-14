import supportedBrowsers from "@utils/supportedBrowsers.mjs";

// The regex is generated from .browserslistrc (pnpm run supportedBrowsers). @scope is load-bearing
// (design system spec §9): Firefox below 146 has no @scope and must get the unsupported-browser notice.
const re = supportedBrowsers as RegExp;
const ff = (v: number) =>
  `Mozilla/5.0 (X11; Linux x86_64; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`;

describe("supported browser regex", () => {
  it.each([140, 145])("rejects Firefox %i", (v) => expect(re.test(ff(v))).toBe(false));

  it("rejects Firefox for Android 140", () => {
    expect(re.test("Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0")).toBe(
      false,
    );
  });

  it("accepts Firefox 146", () => expect(re.test(ff(146))).toBe(true));

  it("accepts Chrome 124", () => {
    expect(
      re.test(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      ),
    ).toBe(true);
  });

  it("accepts Safari 17.5", () => {
    expect(
      re.test(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      ),
    ).toBe(true);
  });
});
