import BonName from "@components/games/BonName.vue";
import { $bonStats } from "@stores/bonStats";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { renamePlayer } = vi.hoisted(() => ({ renamePlayer: vi.fn() }));

vi.mock("@services/bonPlayerApi.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@services/bonPlayerApi.ts")>()),
  renamePlayer,
}));

const fail = (status: number) => Object.assign(new Error("x"), { status });
let wrapper: VueWrapper;

const open = async (props: { name: string; tag?: string } = { name: "Kalle" }) => {
  wrapper = mount(BonName, { attachTo: document.body, props });
  await wrapper.find("button").trigger("click");
  return wrapper.find("input");
};

beforeEach(() => {
  vi.useFakeTimers();
  renamePlayer.mockReset();
  $bonStats.setKey("playerName", "Kalle");
});

afterEach(() => {
  wrapper.unmount();
  vi.useRealTimers();
});

describe("display", () => {
  it("shows the name and a collapsed link", () => {
    wrapper = mount(BonName, { props: { name: "Kalle" } });
    expect(wrapper.text()).toContain("Du spielst als Kalle");
    const link = wrapper.get("button");
    expect(link.text()).toBe("Namen ändern");
    expect(link.attributes("aria-expanded")).toBe("false");
  });

  it("shows the tag of an anonymous player", () => {
    wrapper = mount(BonName, { props: { name: "Anonym", tag: "K7QX" } });
    expect(wrapper.text()).toContain("Anonym");
    expect(wrapper.text()).toContain("#K7QX");
  });
});

describe("tag", () => {
  it("does not show the tag next to a real name but keeps it in the hint", async () => {
    wrapper = mount(BonName, { attachTo: document.body, props: { name: "Kalle", tag: "K7QX" } });
    expect(wrapper.text()).not.toContain("#K7QX");
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("Leer jelassen = „Anonym #K7QX“.");
  });
});

describe("editor", () => {
  it("opens prefilled, focused and selected", async () => {
    const input = await open();
    const el = input.element as HTMLInputElement;
    expect(wrapper.find("[aria-expanded]").exists()).toBe(false);
    expect(el.value).toBe("Kalle");
    expect(document.activeElement).toBe(el);
    expect([el.selectionStart, el.selectionEnd]).toEqual([0, 5]);
    expect(input.attributes()).toMatchObject({
      autocomplete: "nickname",
      maxlength: "24",
      placeholder: "Anonym",
    });
    expect(wrapper.find("[aria-live=polite]").text()).toBe("5 / 24");
  });

  it("closes on Esc and Abbrechen without a call", async () => {
    const input = await open();
    await input.trigger("keydown", { key: "Escape" });
    expect(wrapper.find("input").exists()).toBe(false);
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
    await open();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Abbrechen")!
      .trigger("click");
    expect(wrapper.find("input").exists()).toBe(false);
    expect(renamePlayer).not.toHaveBeenCalled();
  });

  it("saves on Enter, ignores a second Enter while saving", async () => {
    let resolve!: (v: unknown) => void;
    renamePlayer.mockReturnValue(new Promise((r) => (resolve = r)));
    const input = await open();
    await input.setValue("Kalle2");
    await input.trigger("keydown", { key: "Enter" });
    await input.trigger("keydown", { key: "Enter" });
    expect(renamePlayer).toHaveBeenCalledTimes(1);
    expect(renamePlayer).toHaveBeenCalledWith("Kalle2");
    expect(wrapper.find("button[aria-busy=true]").exists()).toBe(true);
    expect((input.element as HTMLInputElement).disabled).toBe(true);
    resolve({ name: "Kalle2" });
    await flushPromises();
  });

  it("on success remembers, emits, confirms for 3 s", async () => {
    renamePlayer.mockResolvedValue({ name: "Kalle2" });
    const input = await open();
    await input.setValue("Kalle2");
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(wrapper.emitted("saved")).toEqual([[{ name: "Kalle2" }]]);
    expect($bonStats.get().playerName).toBe("Kalle2");
    expect(wrapper.text()).toContain("Du spielst als Kalle2");
    expect(wrapper.get("[role=status]").text()).toContain("Jespeichert");
    vi.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[role=status]").exists()).toBe(false);
  });

  it("422 keeps the field open and marks it invalid", async () => {
    renamePlayer.mockRejectedValue(fail(422));
    const input = await open();
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(wrapper.find("input").attributes("aria-invalid")).toBe("true");
    expect(wrapper.text()).toContain("Der Name jeht so nich.");
    expect(wrapper.text()).toContain("Bitte keene Beleidigungen oder Schimpfwörter");
    expect((wrapper.find("input").element as HTMLInputElement).disabled).toBe(false);
  });

  it("422 on a far-right name points to exit help", async () => {
    renamePlayer.mockRejectedValue(fail(422));
    const input = await open();
    await input.setValue("Nazi");
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(wrapper.find("input").attributes("aria-invalid")).toBe("true");
    expect(wrapper.text()).toContain("Rechtsextreme Namen jibt’s hier nich.");
    expect(wrapper.get("a").attributes("href")).toBe("https://www.exit-deutschland.de/");
  });

  it("429 shows the limit text", async () => {
    renamePlayer.mockRejectedValue(fail(429));
    const input = await open();
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(wrapper.text()).toContain("Heute jenug umjetauft – morjen wieder.");
    expect(wrapper.find("input").exists()).toBe(true);
  });

  it.each([502, undefined])("status %s shows the network text and retries", async (status) => {
    renamePlayer.mockRejectedValueOnce(status ? fail(status) : new Error("offline"));
    const input = await open();
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(wrapper.text()).toContain("Ditt hat nich jeklappt.");
    expect(wrapper.text()).toContain("Dein Name is nich anjekommen. Versuch’s gleich nochmal.");
    const retry = wrapper.findAll("button").find((b) => b.text() === "Nochmal speichern")!;
    renamePlayer.mockResolvedValueOnce({ name: "Kalle" });
    await retry.trigger("click");
    await flushPromises();
    expect(renamePlayer).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted("saved")).toHaveLength(1);
  });
});
