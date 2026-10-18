import { afterEach, describe, expect, it, vi } from "vitest";

import { getTestPayload } from "./helpers/payload";

const WORD = "suggestions-test-wort";

afterEach(async () => {
  vi.restoreAllMocks();
  delete process.env.SUGGEST_MAIL_TO;
  const payload = await getTestPayload();
  await payload.delete({ collection: "suggestions", where: { berlinerWord: { equals: WORD } } });
});

const data = { berlinerWord: WORD, translation: "Testwort", userMail: "fan@example.com" };

describe("suggestions", () => {
  it("mails the editors with the suggester as reply target", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const payload = await getTestPayload();
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);

    const doc = await payload.create({ collection: "suggestions", data });

    expect(doc.status).toBe("new");
    expect(send).toHaveBeenCalledOnce();
    const mail = send.mock.calls[0]![0] as { replyTo: string; text: string; to: string };
    expect(mail.to).toBe("redaktion@example.com");
    expect(mail.replyTo).toBe("fan@example.com");
    expect(mail.text).toContain(`Berliner Wort: ${WORD}`);
  });

  it("keeps the suggestion when the mail fails", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const payload = await getTestPayload();
    vi.spyOn(payload, "sendEmail").mockRejectedValue(new Error("smtp down"));

    await payload.create({ collection: "suggestions", data });

    const { totalDocs } = await payload.count({
      collection: "suggestions",
      where: { berlinerWord: { equals: WORD } },
    });
    expect(totalDocs).toBe(1);
  });

  it("accepts the form's empty optional fields and mails without a reply target", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const payload = await getTestPayload();
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);

    await payload.create({
      collection: "suggestions",
      data: { ...data, example: "", userMail: "", userName: "" },
    });

    expect(send.mock.calls[0]![0]).not.toHaveProperty("replyTo");
  });

  it("sends no mail on update", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const payload = await getTestPayload();
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);
    const doc = await payload.create({ collection: "suggestions", data });
    send.mockClear();

    await payload.update({ collection: "suggestions", id: doc.id, data: { status: "rejected" } });

    expect(send).not.toHaveBeenCalled();
  });
});
