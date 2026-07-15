// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("sendEmailViaContactForm7", () => {
  it("makes two fetch calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmailViaContactForm7 } = await import("@services/mutations/sendMail.ts");
    await sendEmailViaContactForm7({ name: "Felix", email: "felix@test.de" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips undefined form values", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmailViaContactForm7 } = await import("@services/mutations/sendMail.ts");
    await sendEmailViaContactForm7({ name: "Felix", email: undefined });

    const secondCall = fetchMock.mock.calls[1];
    const body = secondCall[1].body as FormData;
    expect(body.has("name")).toBe(true);
    expect(body.has("email")).toBe(false);
  });

  it("throws when contact form 7 response is not ok", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: "error" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmailViaContactForm7 } = await import("@services/mutations/sendMail.ts");
    await expect(sendEmailViaContactForm7({ name: "Felix" })).rejects.toThrow("Send E-Mail failed");
  });

  it("logs error when auth fetch fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmailViaContactForm7 } = await import("@services/mutations/sendMail.ts");
    try {
      await sendEmailViaContactForm7({ name: "Felix" });
    } catch {
      // may or may not throw
    }

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("second fetch call uses POST method", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmailViaContactForm7 } = await import("@services/mutations/sendMail.ts");
    await sendEmailViaContactForm7({ name: "Felix" });

    const [, secondCallOptions] = fetchMock.mock.calls[1];
    expect(secondCallOptions.method).toBe("POST");
  });

  it("includes Authorization header in both calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmailViaContactForm7 } = await import("@services/mutations/sendMail.ts");
    await sendEmailViaContactForm7({ name: "Felix" });

    const [, firstCallOptions] = fetchMock.mock.calls[0];
    const [, secondCallOptions] = fetchMock.mock.calls[1];
    expect(firstCallOptions.headers.Authorization).toMatch(/^Bearer /);
    expect(secondCallOptions.headers.Authorization).toMatch(/^Bearer /);
  });

  it("second call url contains contact-form-7 feedback path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmailViaContactForm7 } = await import("@services/mutations/sendMail.ts");
    await sendEmailViaContactForm7({ name: "Felix" });

    const [secondUrl] = fetchMock.mock.calls[1];
    expect(secondUrl).toContain("contact-form-7");
    expect(secondUrl).toContain("feedback");
  });
});
