import type { PayloadRequest } from "payload";

import { describe, expect, it, vi } from "vitest";

import { notifyEditors, resetMailCap } from "../src/lib/notifyEditors";

describe("notifyEditors cap", () => {
  it("mails 30 an hour, then one summary, then only logs", () => {
    process.env.SUGGEST_MAIL_TO = "editors@example.com";
    const sendEmail = vi.fn<PayloadRequest["payload"]["sendEmail"]>().mockResolvedValue(undefined);
    const logger = {
      error: vi.fn<(msg: unknown) => void>(),
      warn: vi.fn<(msg: unknown) => void>(),
    };
    const req = { payload: { logger, sendEmail } } as unknown as PayloadRequest;

    for (let i = 0; i < 40; i++) notifyEditors(req, `s${i}`, ["x"]);

    expect(sendEmail).toHaveBeenCalledTimes(31);
    expect(sendEmail.mock.calls[30][0].subject).toMatch(/Viele Benachrichtigungen/);
    expect(logger.warn).toHaveBeenCalledTimes(9);
  });

  it("logs a swallowed-mail count at error once the hour window rolls over", async () => {
    resetMailCap();
    process.env.SUGGEST_MAIL_TO = "editors@example.com";
    const sendEmail = vi.fn<PayloadRequest["payload"]["sendEmail"]>().mockResolvedValue(undefined);
    const logger = {
      error: vi.fn<(msg: unknown) => void>(),
      warn: vi.fn<(msg: unknown) => void>(),
    };
    const req = { payload: { logger, sendEmail } } as unknown as PayloadRequest;
    vi.useFakeTimers({ now: 1_000_000_000_000 });
    try {
      for (let i = 0; i < 40; i++) notifyEditors(req, `s${i}`, ["x"]);
      expect(logger.error).not.toHaveBeenCalled();
      vi.setSystemTime(1_000_000_000_000 + 3_600_001);
      notifyEditors(req, "next", ["x"]);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("swallowed 9"));
    } finally {
      vi.useRealTimers();
      resetMailCap();
    }
  });

  it("logs a missing SUGGEST_MAIL_TO at error in production, warn otherwise", () => {
    delete process.env.SUGGEST_MAIL_TO;
    const logger = {
      error: vi.fn<(msg: unknown) => void>(),
      warn: vi.fn<(msg: unknown) => void>(),
    };
    const req = {
      payload: { logger, sendEmail: vi.fn<() => void>() },
    } as unknown as PayloadRequest;
    try {
      vi.stubEnv("NODE_ENV", "production");
      notifyEditors(req, "a", ["x"]);
      expect(logger.error).toHaveBeenCalledOnce();
      vi.stubEnv("NODE_ENV", "development");
      notifyEditors(req, "b", ["x"]);
      expect(logger.warn).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
      resetMailCap();
    }
  });
});
