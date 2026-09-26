import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchJson } = vi.hoisted(() => ({ fetchJson: vi.fn() }));
vi.mock("@services/fetchJson.ts", () => ({ fetchJson }));

const mockEnv = (env: Record<string, unknown>) => {
  vi.doMock("astro:env/server", () => ({
    ANKI_DECK_FULL_PRODUCT_ID: "prod_1",
    POLAR_PRICE_TOKEN: "token",
    POLAR_SANDBOX: false,
    ...env,
  }));
};

const loadPrice = async () => {
  const { getPolarFullDeckPrice } = await import("@services/polar.ts");
  return getPolarFullDeckPrice();
};

beforeEach(() => {
  vi.resetModules();
  fetchJson.mockReset();
  mockEnv({});
});

afterEach(() => {
  vi.doUnmock("astro:env/server");
});

describe("getPolarFullDeckPrice", () => {
  it("formats the fixed price in German euro notation", async () => {
    fetchJson.mockResolvedValue({
      prices: [{ amount_type: "custom" }, { amount_type: "fixed", price_amount: 499 }],
    });

    expect(await loadPrice()).toBe("4,99 €");
    expect(fetchJson).toHaveBeenCalledWith(
      "https://api.polar.sh/v1/products/prod_1",
      { Authorization: "Bearer token" },
      "Polar price",
    );
  });

  it("uses the sandbox API when POLAR_SANDBOX is set", async () => {
    mockEnv({ POLAR_SANDBOX: true });
    fetchJson.mockResolvedValue({ prices: [{ amount_type: "fixed", price_amount: 500 }] });

    expect(await loadPrice()).toBe("5,00 €");
    expect(fetchJson.mock.calls[0]?.[0]).toBe("https://sandbox-api.polar.sh/v1/products/prod_1");
  });

  it("skips the request when token or product id is missing", async () => {
    mockEnv({ POLAR_PRICE_TOKEN: "" });

    expect(await loadPrice()).toBeUndefined();
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("returns undefined without a fixed price or on a failed request", async () => {
    fetchJson.mockResolvedValue({ prices: [{ amount_type: "free" }] });
    expect(await loadPrice()).toBeUndefined();

    vi.resetModules();
    fetchJson.mockResolvedValue(undefined);
    expect(await loadPrice()).toBeUndefined();
  });

  it("resolves the price only once per module instance", async () => {
    fetchJson.mockResolvedValue({ prices: [{ amount_type: "fixed", price_amount: 100 }] });
    const { getPolarFullDeckPrice } = await import("@services/polar.ts");

    await getPolarFullDeckPrice();
    await getPolarFullDeckPrice();
    expect(fetchJson).toHaveBeenCalledOnce();
  });
});
