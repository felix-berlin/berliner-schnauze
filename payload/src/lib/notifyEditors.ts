import type { PayloadRequest } from "payload";

/**
 * Mails the editors; a failed mail is logged and never loses the doc that caused it. Not awaited: the hooks run
 * inside the request's DB transaction, which must not wait on SMTP.
 */
export const notifyEditors = (req: PayloadRequest, subject: string, lines: string[]): void => {
  const to = process.env.SUGGEST_MAIL_TO;
  if (!to) {
    req.payload.logger.warn(`"${subject}": SUGGEST_MAIL_TO is not set, no editor was mailed`);
    return;
  }
  Promise.resolve(req.payload.sendEmail({ subject, text: lines.join("\n"), to })).catch(
    (err: unknown) => {
      req.payload.logger.error({ err, msg: `"${subject}": mail not sent` });
    },
  );
};

export const commentAdminLink = (req: PayloadRequest, id: number | string): string =>
  `${req.payload.config.serverURL}/admin/collections/comments/${id}`;
