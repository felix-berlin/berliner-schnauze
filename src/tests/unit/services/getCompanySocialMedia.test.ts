import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ WP_API: "http://test.local/graphql" }));
vi.mock("astro:env/server", () => ({ WP_AUTH_PASS: "test", WP_AUTH_USER: "test" }));

const toPromiseMock = vi.fn();
const queryMock = vi.fn(() => ({ toPromise: toPromiseMock }));

vi.mock("@urql/core", () => ({
  cacheExchange: {},
  Client: vi.fn().mockImplementation(function (this: { query: typeof queryMock }) {
    this.query = queryMock;
  }),
  fetchExchange: {},
}));

const successResponse = (socialMedia: unknown) => ({
  data: { company: { companyInformations: { socialMedia } } },
  error: undefined,
});

beforeEach(() => {
  vi.resetModules();
  toPromiseMock.mockReset();
  queryMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchSocialMenu", () => {
  it("maps entries with both value and label to link/title/rel", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([
        {
          networkname: ["github", "GitHub"],
          networkprofile: "https://github.com/felix-berlin/berliner-schnauze",
          rel: "me",
        },
      ]),
    );
    const { fetchSocialMenu } = await import("@services/queries/getCompanySocialMedia");

    expect(await fetchSocialMenu()).toEqual([
      {
        link: "https://github.com/felix-berlin/berliner-schnauze",
        rel: "me",
        title: "GitHub",
      },
    ]);
  });

  it("omits rel when the entry has none", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([
        { networkname: ["facebook", "Facebook"], networkprofile: "https://facebook.com/x" },
      ]),
    );
    const { fetchSocialMenu } = await import("@services/queries/getCompanySocialMedia");

    expect(await fetchSocialMenu()).toEqual([
      { link: "https://facebook.com/x", title: "Facebook" },
    ]);
  });

  it("capitalizes value as title when label is missing", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([{ networkname: ["mastodon"], networkprofile: "https://mastodon.social/x" }]),
    );
    const { fetchSocialMenu } = await import("@services/queries/getCompanySocialMedia");

    expect(await fetchSocialMenu()).toEqual([
      { link: "https://mastodon.social/x", title: "Mastodon" },
    ]);
  });

  it("filters out an entry when networkname is null", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([{ networkname: null, networkprofile: "https://example.com/x" }]),
    );
    const { fetchSocialMenu } = await import("@services/queries/getCompanySocialMedia");

    expect(await fetchSocialMenu()).toEqual([]);
  });

  it("filters out an entry missing networkprofile", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([{ networkname: ["github", "GitHub"], networkprofile: null }]),
    );
    const { fetchSocialMenu } = await import("@services/queries/getCompanySocialMedia");

    expect(await fetchSocialMenu()).toEqual([]);
  });

  it("filters out null entries in the list", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([
        null,
        { networkname: ["github", "GitHub"], networkprofile: "https://github.com/x" },
      ]),
    );
    const { fetchSocialMenu } = await import("@services/queries/getCompanySocialMedia");

    expect(await fetchSocialMenu()).toEqual([{ link: "https://github.com/x", title: "GitHub" }]);
  });

  it("returns an empty array when socialMedia is missing", async () => {
    toPromiseMock.mockResolvedValue({
      data: { company: { companyInformations: { socialMedia: null } } },
      error: undefined,
    });
    const { fetchSocialMenu } = await import("@services/queries/getCompanySocialMedia");

    expect(await fetchSocialMenu()).toEqual([]);
  });

  it("throws on GraphQL error instead of silently returning empty data", async () => {
    const gqlError = new Error("GraphQL boom");
    toPromiseMock.mockResolvedValue({ data: undefined, error: gqlError });
    const { fetchSocialMenu } = await import("@services/queries/getCompanySocialMedia");

    await expect(fetchSocialMenu()).rejects.toThrow("Fetching company social media links failed");
  });
});
