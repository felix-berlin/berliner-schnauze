import type { PayloadRequest } from "payload";

import { describe, expect, it, vi } from "vitest";

import { notifyEditors } from "../src/lib/notifyEditors";

describe("notifyEditors cap", () => {
  it("mails 30 an hour, then one summary, then only logs", () => {
    process.env.SUGGEST_MAIL_TO = "editors@example.com";
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const logger = { error: vi.fn(), warn: vi.fn() };
    const req = { payload: { logger, sendEmail } } as unknown as PayloadRequest;

    for (let i = 0; i < 40; i++) notifyEditors(req, `s${i}`, ["x"]);

    expect(sendEmail).toHaveBeenCalledTimes(31);
    expect(sendEmail.mock.calls[30][0].subject).toMatch(/Viele Benachrichtigungen/);
    expect(logger.warn).toHaveBeenCalledTimes(9);
  });
});
