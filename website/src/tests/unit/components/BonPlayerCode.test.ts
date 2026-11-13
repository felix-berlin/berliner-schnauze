import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  applyPlayerStats: vi.fn(),
  createPlayerCode: vi.fn(),
  playerLink: (c: string) => `http://x/games/berliner-oder-nicht#code=${c}`,
  redeemPlayerCode: vi.fn(),
  takeRedeemCode: vi.fn(),
}));
vi.mock("@services/bonPlayerApi.ts", () => api);
const uqr = vi.hoisted(() => ({ renderSVG: vi.fn() }));
vi.mock("uqr", () => uqr);

import BonPlayerCode from "@components/games/BonPlayerCode.vue";
import { $bonStats } from "@stores/bonStats";

const CODE = "K7QD-M2X9-ZT4B";
const stats = { bestStreak: 3, gamesPlayed: 2, highScore: 200, playerName: "Berta" };
const failure = (message: string, status?: number) => Object.assign(new Error(message), { status });

async function showCode(options: Parameters<typeof mount>[1] = {}) {
  api.createPlayerCode.mockResolvedValue(CODE);
  const w = mount(BonPlayerCode, options);
  await w.get("[data-test=get]").trigger("click");
  await flushPromises();
  return w;
}

async function submit(w: Awaited<ReturnType<typeof showCode>>, value: string) {
  await w.get("input").setValue(value);
  await w.get("form").trigger("submit");
  await flushPromises();
}

beforeEach(() => {
  vi.resetAllMocks();
  api.takeRedeemCode.mockReturnValue(undefined);
  uqr.renderSVG.mockReturnValue("<svg></svg>");
  $bonStats.setKey("playerName", "Ede");
});

describe("1 no code yet", () => {
  it("offers to get a code or to enter one", () => {
    const w = mount(BonPlayerCode);
    expect(w.get("h2").text()).toBe("Auf anderem Jerät weiterspielen");
    expect(w.get("[data-test=get]").classes()).toContain("c-choice");
    expect(w.get("[data-test=get]").text()).toBe("Spielercode holen");
    expect(w.get("[data-test=show-redeem]").classes()).toContain("c-textlink");
    expect(w.get("[data-test=show-redeem]").text()).toBe("Hab schon ’n Code");
  });

  it("starts in the redeem form with mode=redeem", () => {
    const w = mount(BonPlayerCode, { props: { mode: "redeem" } });
    expect(w.find("input").exists()).toBe(true);
    expect(w.find("[data-test=get]").exists()).toBe(false);
  });

  it("renders a server error and keeps the button usable", async () => {
    api.createPlayerCode.mockRejectedValue(new Error("Einen Moment noch."));
    const w = mount(BonPlayerCode);
    await w.get("[data-test=get]").trigger("click");
    await flushPromises();
    expect(w.get("[data-test=error]").text()).toContain("Einen Moment noch.");
    expect(w.get("[data-test=get]").attributes("disabled")).toBeUndefined();
  });

  it("disables the button and ignores a second click while pending", async () => {
    api.createPlayerCode.mockReturnValue(new Promise(() => {}));
    const w = mount(BonPlayerCode);
    await w.get("[data-test=get]").trigger("click");
    expect(w.get("[data-test=get]").attributes("disabled")).toBeDefined();
    await w.get("[data-test=get]").trigger("click");
    expect(api.createPlayerCode).toHaveBeenCalledTimes(1);
  });
});

describe("2 code shown", () => {
  it("names the player, splits the code into 3 blocks and spells it for screen readers", async () => {
    const w = await showCode({ attachTo: document.body });
    expect(w.get("h2").text()).toBe("Dein Spielercode für Ede:");
    const code = w.get("[data-test=code]");
    expect(code.findAll(".c-bon-player-code__block").map((b) => b.text())).toEqual([
      "K7QD",
      "M2X9",
      "ZT4B",
    ]);
    expect(code.attributes("aria-label")).toBe("K 7 Q D, M 2 X 9, Z T 4 B");
    expect(document.activeElement).toBe(code.element);
    w.unmount();
  });

  it("falls back to Anonym without a stored name", async () => {
    $bonStats.setKey("playerName", "");
    const w = await showCode();
    expect(w.get("h2").text()).toBe("Dein Spielercode für Anonym:");
  });

  it("shows the warning", async () => {
    const w = await showCode();
    expect(w.text()).toContain(
      "Wer diesen Code hat, kann deinen Namen und deine Ergebnisse nutzen.",
    );
    expect(w.text()).toContain("Schreib ihn dir auf – und zeig den QR-Code nich rum.");
  });

  it("copies the code, flips the label and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const w = await showCode();
    expect(w.get("[data-test=copy-code]").text()).toBe("Code kopieren");
    await w.get("[data-test=copy-code]").trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(CODE);
    expect(w.get("[data-test=copy-code]").text()).toBe("Code kopiert");
    expect(w.get("[data-test=status]").text()).toContain("Code kopiert");
  });

  it("copies the link, flips the label and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const w = await showCode();
    expect(w.get("[data-test=copy-link]").text()).toBe("Link kopieren");
    await w.get("[data-test=copy-link]").trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(`http://x/games/berliner-oder-nicht#code=${CODE}`);
    expect(w.get("[data-test=copy-link]").text()).toBe("Link kopiert");
    expect(w.get("[data-test=status]").text()).toContain("Link kopiert");
  });

  it("tells the player to type the code when copying fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    const w = await showCode();
    await w.get("[data-test=copy-link]").trigger("click");
    await flushPromises();
    expect(w.get("[data-test=error]").text()).toContain("Kopieren hat nich jeklappt");
  });
});

describe("2b QR code", () => {
  it("renders black on white with error correction M, labelled and captioned", async () => {
    const w = await showCode();
    expect(w.get("[data-test=qr-toggle]").text()).toBe("QR-Code zeigen");
    await w.get("[data-test=qr-toggle]").trigger("click");
    await flushPromises();
    expect(uqr.renderSVG).toHaveBeenCalledWith(
      `http://x/games/berliner-oder-nicht#code=${CODE}`,
      expect.objectContaining({
        blackColor: "#000",
        border: 0,
        ecc: "M",
        whiteColor: "#fff",
      }),
    );
    const qr = w.get("[data-test=qr]");
    expect(qr.attributes("role")).toBe("img");
    expect(qr.attributes("aria-label")).toBeTruthy();
    expect(qr.html()).toContain("<svg");
    expect(w.text()).toContain("Mit dem Handy scannen – dann biste dort gleich als Ede drin.");
    expect(w.get("[data-test=qr-toggle]").text()).toBe("QR-Code ausblenden");
  });

  it("hides it again", async () => {
    const w = await showCode();
    await w.get("[data-test=qr-toggle]").trigger("click");
    await flushPromises();
    await w.get("[data-test=qr-toggle]").trigger("click");
    expect(w.find("[data-test=qr]").exists()).toBe(false);
  });

  it("shows a German error when the QR library fails to load", async () => {
    uqr.renderSVG.mockImplementation(() => {
      throw new Error("chunk failed");
    });
    const w = await showCode();
    await w.get("[data-test=qr-toggle]").trigger("click");
    await flushPromises();
    expect(w.get("[data-test=error]").text()).toContain("Den QR-Code kriegen wa jerade nich hin.");
  });
});

describe("3 redeem", () => {
  it("describes the field by hint and error and sets the field attributes", async () => {
    const w = mount(BonPlayerCode, { props: { mode: "redeem" } });
    const input = w.get("input");
    expect(input.attributes("placeholder")).toBe("XXXX-XXXX-XXXX");
    expect(input.attributes("autocapitalize")).toBe("characters");
    expect(input.attributes("autocomplete")).toBe("off");
    expect(input.attributes("spellcheck")).toBe("false");
    const ids = input.attributes("aria-describedby")!.split(" ");
    expect(ids).toHaveLength(2);
    expect(w.get(`#${ids[0]}`).text()).toBe(
      "Groß- und Kleinschreibung, Leerzeichen und Bindestriche sind egal.",
    );
    expect(w.get(`#${ids[1]}`).attributes("aria-live")).toBe("assertive");
    expect(w.get("label").text()).toBe("Spielercode");
  });

  it("sends the canonical code and shows the name", async () => {
    api.redeemPlayerCode.mockResolvedValue(stats);
    const w = mount(BonPlayerCode);
    await w.get("[data-test=show-redeem]").trigger("click");
    await submit(w, "  k7qd m2x9_zt4b ");
    expect(api.redeemPlayerCode).toHaveBeenCalledWith(CODE);
    expect(api.applyPlayerStats).toHaveBeenCalledWith(stats);
    expect(w.text()).toContain("Willkommen zurück, Berta!");
  });

  it.each(["Anonym", ""])("welcomes a player named %j as Spieler", async (playerName) => {
    api.redeemPlayerCode.mockResolvedValue({ ...stats, playerName });
    const w = mount(BonPlayerCode);
    await w.get("[data-test=show-redeem]").trigger("click");
    await submit(w, CODE);
    expect(w.text()).toContain("Willkommen zurück, Spieler!");
  });

  it("rejects a malformed code without asking the server", async () => {
    const w = mount(BonPlayerCode, { props: { mode: "redeem" } });
    await submit(w, "K7QD-M2X9");
    expect(api.redeemPlayerCode).not.toHaveBeenCalled();
    expect(w.get("input").attributes("aria-invalid")).toBe("true");
    expect(w.get("[data-test=error]").text()).toContain("Den Code kenn ick nich.");
  });

  it("disables the submit and ignores a second submit while pending", async () => {
    let resolve!: (v: typeof stats) => void;
    api.redeemPlayerCode.mockReturnValue(new Promise((r) => (resolve = r)));
    const w = mount(BonPlayerCode, { props: { mode: "redeem" } });
    await w.get("input").setValue(CODE);
    await w.get("form").trigger("submit");
    expect(w.get("[data-test=submit]").attributes("disabled")).toBeDefined();
    await w.get("form").trigger("submit");
    expect(api.redeemPlayerCode).toHaveBeenCalledTimes(1);
    resolve(stats);
    await flushPromises();
  });

  it("cancels back to state 1 and clears the error", async () => {
    api.redeemPlayerCode.mockRejectedValue(failure("Nö."));
    const w = mount(BonPlayerCode);
    await w.get("[data-test=show-redeem]").trigger("click");
    await submit(w, CODE);
    expect(w.get("[data-test=error]").text()).toContain("Nö.");
    await w.get("[data-test=back]").trigger("click");
    expect(w.find("[data-test=get]").exists()).toBe(true);
    expect(w.get("[data-test=error]").text()).toBe("");
  });

  it("emits close instead when it was opened in redeem mode", async () => {
    const w = mount(BonPlayerCode, { props: { mode: "redeem" } });
    await w.get("[data-test=back]").trigger("click");
    expect(w.emitted("close")).toHaveLength(1);
  });
});

describe("3a wrong code", () => {
  it("marks the field invalid and shows the server text", async () => {
    api.redeemPlayerCode.mockRejectedValue(failure("Den Code kenn ick nich.", 404));
    const w = mount(BonPlayerCode, { props: { mode: "redeem" } });
    await submit(w, CODE);
    expect(w.get("input").attributes("aria-invalid")).toBe("true");
    const error = w.get("[data-test=error]");
    expect(error.attributes("aria-live")).toBe("assertive");
    expect(error.get(".c-state--error").text()).toContain("Den Code kenn ick nich.");
    expect(error.text()).toContain("Guck nochmal jenau hin – vielleicht ’n Zeichen vertippt?");
    expect(w.get("input").element.value).toBe(CODE);
  });
});

describe("3b locked", () => {
  it("says to wait, disables the submit with aria-disabled and sends nothing more", async () => {
    api.redeemPlayerCode.mockRejectedValue(failure("Zu viele Anfragen", 429));
    const w = mount(BonPlayerCode, { props: { mode: "redeem" } });
    await submit(w, CODE);
    expect(w.get("[data-test=error]").text()).toContain("Zu ville Versuche.");
    expect(w.get("[data-test=error]").text()).toContain(
      "Mach ma Pause und probier’s in 10 Minuten nochmal.",
    );
    expect(w.get("[data-test=submit]").attributes("aria-disabled")).toBe("true");
    await w.get("form").trigger("submit");
    expect(api.redeemPlayerCode).toHaveBeenCalledTimes(1);
  });
});

describe("4 success", () => {
  it("shows the success box in the persistent live region and focuses it", async () => {
    api.redeemPlayerCode.mockResolvedValue(stats);
    const w = mount(BonPlayerCode, { attachTo: document.body, props: { mode: "redeem" } });
    const region = w.get("[data-test=status]").element;
    await submit(w, CODE);
    expect(w.get("[data-test=status]").element).toBe(region);
    expect(w.get("[data-test=status] .c-state--done").text()).toContain(
      "Willkommen zurück, Berta!",
    );
    expect(region.textContent).toContain(
      "Dein Name und deine Ergebnisse sind jetzt in diesem Browser.",
    );
    expect(region.textContent).toContain("Bestes Ergebnis: 200");
    expect(document.activeElement).toBe(region);
    w.unmount();
  });

  it("offers Weiterspielen in redeem mode, which closes the card", async () => {
    api.redeemPlayerCode.mockResolvedValue(stats);
    const w = mount(BonPlayerCode, { props: { mode: "redeem" } });
    await submit(w, CODE);
    const go = w.get("[data-test=continue]");
    expect(go.attributes("data-variant")).toContain("primary");
    await go.trigger("click");
    expect(w.emitted("close")).toHaveLength(1);
  });
});

describe("5 link", () => {
  it("prefills a link code but redeems it only after a click", async () => {
    api.takeRedeemCode.mockReturnValue(CODE);
    api.redeemPlayerCode.mockResolvedValue(stats);
    const w = mount(BonPlayerCode);
    await flushPromises();
    expect(api.redeemPlayerCode).not.toHaveBeenCalled();
    expect(w.get("input").element.value).toBe(CODE);
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(api.redeemPlayerCode).toHaveBeenCalledWith(CODE);
    expect(w.text()).toContain("Willkommen zurück, Berta!");
    expect(w.text()).toContain("Der Link hat dich anjemeldet.");
  });

  it("prefills the input and shows the error when the link code fails, so it stays retryable", async () => {
    api.takeRedeemCode.mockReturnValue(CODE);
    api.redeemPlayerCode.mockRejectedValue(failure("Zu viele Versuche.", 500));
    const w = mount(BonPlayerCode);
    await flushPromises();
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.get("input").element.value).toBe(CODE);
    expect(w.get("[data-test=error]").text()).toContain("Zu viele Versuche.");
    expect(w.find(".c-skeleton").exists()).toBe(false);
  });
});
