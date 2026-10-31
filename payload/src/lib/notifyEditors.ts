import type { PayloadRequest } from "payload";

/** Mails the editors; a failed mail is logged and never loses the doc that caused it. */
export const notifyEditors = async (req: PayloadRequest, subject: string, lines: string[]): Promise<void> => {
  const to = process.env.SUGGEST_MAIL_TO;
  if (!to) {
    req.payload.logger.warn(`"${subject}": SUGGEST_MAIL_TO is not set, no editor was mailed`);
    return;
  }
  try {
    await req.payload.sendEmail({ subject, text: lines.join("\n"), to });
  } catch (err) {
    req.payload.logger.error({ err, msg: `"${subject}": mail not sent` });
  }
};

export const commentAdminLink = (req: PayloadRequest, id: number | string): string =>
  `${req.payload.config.serverURL}/admin/collections/comments/${id}`;
