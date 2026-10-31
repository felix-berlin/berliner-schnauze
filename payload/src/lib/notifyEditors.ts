import type { PayloadRequest } from "payload";

const MAX_PER_HOUR = 30;
let windowStart = 0;
let sent = 0;

/** For tests: starts a fresh hourly window. */
export const resetMailCap = (): void => {
  windowStart = 0;
  sent = 0;
};

/**
 * Mails the editors; a failed mail is logged and never loses the doc that caused it. Not awaited: the hooks run
 * inside the request's DB transaction, which must not wait on SMTP.
 */
export const notifyEditors = (
  req: PayloadRequest,
  subject: string,
  lines: string[],
  replyTo?: string,
): void => {
  // At most MAX_PER_HOUR mails an hour per process; the first one over the cap is a single summary, the rest is logged.
  const now = Date.now();
  if (now - windowStart > 3_600_000) [windowStart, sent] = [now, 0];
  if (++sent > MAX_PER_HOUR) {
    if (sent > MAX_PER_HOUR + 1) {
      req.payload.logger.warn(`"${subject}": mail cap reached, not mailed`);
      return;
    }
    subject = "Viele Benachrichtigungen – Berliner Schnauze";
    lines = [
      `Mehr als ${MAX_PER_HOUR} Benachrichtigungen in einer Stunde, weitere werden nicht gemailt.`,
    ];
    replyTo = undefined;
  }
  const to = process.env.SUGGEST_MAIL_TO;
  if (!to) {
    req.payload.logger.warn(`"${subject}": SUGGEST_MAIL_TO is not set, no editor was mailed`);
    return;
  }
  Promise.resolve(
    req.payload.sendEmail({ ...(replyTo ? { replyTo } : {}), subject, text: lines.join("\n"), to }),
  ).catch((err: unknown) => {
    req.payload.logger.error({ err, msg: `"${subject}": mail not sent` });
  });
};

export const commentAdminLink = (req: PayloadRequest, id: number | string): string =>
  `${req.payload.config.serverURL}/admin/collections/comments/${id}`;
