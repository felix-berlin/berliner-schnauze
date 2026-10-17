import { beforeEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));
vi.mock("nodemailer", () => ({ default: { createTransport } }));
const env = vi.hoisted(() => ({
  SMTP_URL: "smtp://mail.example:587" as string | undefined,
  SUGGEST_MAIL_TO: "redaktion@example.org" as string | undefined,
}));
vi.mock("astro:env/server", () => env);

const suggestion = {
  berlinerWord: "Kiez",
  example: "Wir jehn int Kiez.",
  translation: "Viertel",
  userMail: "",
  userName: "",
};

beforeEach(() => {
  vi.resetModules();
  createTransport.mockReset().mockReturnValue({ sendMail });
  sendMail.mockReset().mockResolvedValue({});
  env.SMTP_URL = "smtp://mail.example:587";
  env.SUGGEST_MAIL_TO = "redaktion@example.org";
});

const load = () => import("@services/suggestMail.ts");

describe("sendSuggestionMail", () => {
  it("sends from the site to the editors with the suggestion as plain text", async () => {
    const { sendSuggestionMail } = await load();
    await sendSuggestionMail(suggestion);
    expect(createTransport).toHaveBeenCalledWith("smtp://mail.example:587");
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Berliner Schnauze <mail@berliner-schnauze.wtf>",
        subject: "Wortvorschlag - Berliner Schnauze",
        to: "redaktion@example.org",
      }),
    );
    const { text } = sendMail.mock.calls[0][0];
    expect(text).toContain("Berliner Wort: Kiez");
    expect(text).toContain("Übersetzung: Viertel");
    expect(text).toContain("Beispiel: Wir jehn int Kiez.");
  });

  it("makes the suggester only the reply target, and sets none without an address", async () => {
    const { sendSuggestionMail } = await load();
    await sendSuggestionMail({ ...suggestion, userMail: "gast@example.com" });
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      from: expect.stringContaining("berliner-schnauze.wtf"),
      replyTo: "gast@example.com",
    });
    await sendSuggestionMail(suggestion);
    expect(sendMail.mock.calls[1][0]).not.toHaveProperty("replyTo");
  });

  it("reuses one transport", async () => {
    const { sendSuggestionMail } = await load();
    await sendSuggestionMail(suggestion);
    await sendSuggestionMail(suggestion);
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("refuses to send without SMTP_URL or a recipient", async () => {
    env.SMTP_URL = undefined;
    const { sendSuggestionMail } = await load();
    await expect(sendSuggestionMail(suggestion)).rejects.toThrow(/SMTP_URL/);
    env.SMTP_URL = "smtp://x";
    env.SUGGEST_MAIL_TO = undefined;
    vi.resetModules();
    const again = await load();
    await expect(again.sendSuggestionMail(suggestion)).rejects.toThrow(/SUGGEST_MAIL_TO/);
  });
});
