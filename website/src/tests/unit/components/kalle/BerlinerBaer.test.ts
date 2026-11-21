import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";

import BerlinerBaer from "@/components/kalle/BerlinerBaer.vue";

const tok = (w: { attributes: (n: string) => string | undefined }, a: string) =>
  (w.attributes(a) ?? "").split(" ");

describe("BerlinerBaer", () => {
  it("rendert die Stimmung als Klasse", () => {
    const w = mount(BerlinerBaer, { props: { stimmung: "winken" } });
    expect(tok(w, "data-state")).toContain("winken");
  });

  it("ist ohne label dekorativ und mit label ein Bild", () => {
    const deko = mount(BerlinerBaer);
    expect(deko.find("svg").attributes("aria-hidden")).toBe("true");
    const bild = mount(BerlinerBaer, { props: { label: "Kalle winkt" } });
    expect(bild.find("svg").attributes("role")).toBe("img");
    expect(bild.find("svg").attributes("aria-label")).toBe("Kalle winkt");
  });

  it("zeigt Brauen erst ab 200px", () => {
    expect(tok(mount(BerlinerBaer, { props: { groesse: 199 } }), "data-variant")).not.toContain(
      "brauen",
    );
    expect(tok(mount(BerlinerBaer, { props: { groesse: 200 } }), "data-variant")).toContain(
      "brauen",
    );
  });

  it("setzt die a11y-Attribute auch auf dem Kopf und den Lugen", () => {
    for (const variante of ["kopf", "lugen"] as const) {
      const deko = mount(BerlinerBaer, { props: { variante } }).find("svg");
      expect(deko.attributes("aria-hidden")).toBe("true");
      const bild = mount(BerlinerBaer, { props: { label: "Kalle", variante } }).find("svg");
      expect(bild.attributes("role")).toBe("img");
      expect(bild.attributes("aria-label")).toBe("Kalle");
    }
  });

  it("wechselt unter 64px auf den Kopf und unter 96px auf die vereinfachte Fassung", () => {
    const klein = mount(BerlinerBaer, { props: { groesse: 48 } });
    expect(tok(klein, "data-variant")).toEqual(expect.arrayContaining(["kopf", "klein"]));
    expect(klein.find("mask").exists()).toBe(false);
    expect(tok(mount(BerlinerBaer, { props: { groesse: 80 } }), "data-variant")).toContain("klein");
  });

  it("ist unter 200px standardmäßig ruhig", () => {
    expect(tok(mount(BerlinerBaer, { props: { groesse: 120 } }), "data-variant")).toContain("calm");
    expect(tok(mount(BerlinerBaer, { props: { groesse: 300 } }), "data-variant")).not.toContain(
      "calm",
    );
    expect(
      tok(mount(BerlinerBaer, { props: { groesse: 300, ruhig: true } }), "data-variant"),
    ).toContain("calm");
  });

  it("vergibt nach dem Mounten seitenweit eindeutige Masken-IDs", async () => {
    const a = mount(BerlinerBaer);
    const b = mount(BerlinerBaer);
    await a.vm.$nextTick();
    await b.vm.$nextTick();
    const ida = a.find("mask").attributes("id");
    const idb = b.find("mask").attributes("id");
    expect(ida).toMatch(/^bv-\d+-m$/);
    expect(ida).not.toBe(idb);
    expect(a.find(`[mask="url(#${ida})"]`).exists()).toBe(true);
  });

  it("braucht beim Lugen keine ID", () => {
    const w = mount(BerlinerBaer, { props: { variante: "lugen" } });
    expect(w.find("clipPath").exists()).toBe(false);
    expect(w.findAll("svg").length).toBe(3); // außen + zwei Clip-Fenster
  });

  it("federt bei jedem Stimmungswechsel", async () => {
    const w = mount(BerlinerBaer, { props: { stimmung: "idle" } });
    expect(tok(w, "data-state")).not.toContain("sw-a");
    await w.setProps({ stimmung: "nicken" });
    expect(tok(w, "data-state")).toContain("sw-a");
    await w.setProps({ stimmung: "nee" });
    expect(tok(w, "data-state")).toContain("sw-b");
  });

  it("zuckt beim Antippen, brüllt beim dritten Mal und kehrt zurück", async () => {
    vi.useFakeTimers();
    const w = mount(BerlinerBaer, { props: { antippbar: true, stimmung: "tanzen" } });
    await w.trigger("click");
    expect(tok(w, "data-state")).toContain("zuck-a");
    expect(tok(w, "data-state")).toContain("tanzen");
    await w.trigger("click");
    expect(tok(w, "data-state")).toContain("zuck-b");
    await w.trigger("click");
    expect(tok(w, "data-state")).toContain("schnauze");
    vi.advanceTimersByTime(2000);
    await w.vm.$nextTick();
    expect(tok(w, "data-state")).toContain("tanzen");
    vi.useRealTimers();
  });

  it("ignoriert Klicks, wenn nicht antippbar", async () => {
    const w = mount(BerlinerBaer);
    await w.trigger("click");
    expect(tok(w, "data-state").some((c) => c.startsWith("zuck"))).toBe(false);
  });

  it("zuckt mit den Ohren über tippen()", async () => {
    const w = mount(BerlinerBaer);
    (w.vm as unknown as { tippen: () => void }).tippen();
    await w.vm.$nextTick();
    expect(tok(w, "data-state")).toContain("tipp-a");
  });

  it("meldet das Ende von Auftritt und Abgang", async () => {
    vi.useFakeTimers();
    const w = mount(BerlinerBaer, { props: { stimmung: "idle" } });
    await w.setProps({ stimmung: "auftritt" });
    vi.advanceTimersByTime(900);
    expect(w.emitted("fertig")?.[0]).toEqual(["auftritt"]);
    await w.setProps({ stimmung: "abgang" });
    vi.advanceTimersByTime(2000);
    expect(w.emitted("fertig")?.[1]).toEqual(["abgang"]);
    vi.useRealTimers();
  });

  it("begrenzt den Blick auf -1 bis 1", () => {
    const w = mount(BerlinerBaer, { props: { blickX: 3, blickY: -2, stimmung: "folgen" } });
    const style = w.attributes("style") ?? "";
    expect(style).toContain("--_lx: 1");
    expect(style).toContain("--_ly: -1");
  });
});
