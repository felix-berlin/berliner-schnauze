import type { SuggestWord } from "@utils/suggestWordSchema.ts";
import type { Transporter } from "nodemailer";

import { SMTP_URL, SUGGEST_MAIL_TO } from "astro:env/server";
import nodemailer from "nodemailer";

// The site stays the sender (SPF); the suggester is only the reply target.
const FROM = "Berliner Schnauze <mail@berliner-schnauze.wtf>";

let transport: Transporter | undefined;

export const sendSuggestionMail = async (suggestion: SuggestWord): Promise<void> => {
  if (!SMTP_URL) throw new Error("SMTP_URL is not set");
  if (!SUGGEST_MAIL_TO) throw new Error("SUGGEST_MAIL_TO is not set");
  transport ??= nodemailer.createTransport(SMTP_URL);

  const rows: [string, string][] = [
    ["Berliner Wort", suggestion.berlinerWord],
    ["Übersetzung", suggestion.translation],
    ["Beispiel", suggestion.example],
    ["Name", suggestion.userName],
    ["E-Mail", suggestion.userMail],
  ];
  await transport.sendMail({
    from: FROM,
    ...(suggestion.userMail ? { replyTo: suggestion.userMail } : {}),
    subject: "Wortvorschlag - Berliner Schnauze",
    text: [
      "Ein neues Berliner Wort wurde eingereicht:",
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
    ].join("\n"),
    to: SUGGEST_MAIL_TO,
  });
};
