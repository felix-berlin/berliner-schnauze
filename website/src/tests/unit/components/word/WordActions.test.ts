import WordActions from "@components/word/WordActions.vue";
import { openForm } from "@stores/contribute.ts";
import { $feedback } from "@stores/wordFeedback.ts";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const cite = vi.hoisted(() => vi.fn());
vi.mock("@lib/wordCite.ts", async () => {
  const actual = await vi.importActual<typeof import("@lib/wordCite.ts")>("@lib/wordCite.ts");
  return {
    ...actual,
    formatCitation: (...args: Parameters<typeof actual.formatCitation>) => {
      cite(...args);
      return actual.formatCitation(...args);
    },
  };
});

vi.mock("@composables/useOnline.ts", async () => {
  const { ref: vueRef } = await import("vue");
  const state = vueRef(true);
  return {
    OFFLINE_HINT: "Du bist offline. Abstimmen und Mitmachen jeht wieder, sobald du Netz hast.",
    __state: state,
    useOnline: () => state,
  };
});
const { __state: online } = (await import("@composables/useOnline.ts")) as unknown as {
  __state: ReturnType<typeof ref<boolean>>;
};

const reaction = vi.hoisted(() => ({ toggle: vi.fn() }));
vi.mock("@utils/wordReaction.ts", () => ({ toggleReaction: reaction.toggle }));
const load = vi.hoisted(() => vi.fn());
vi.mock("@stores/wordFeedback.ts", async () => {
  const actual =
    await vi.importActual<typeof import("@stores/wordFeedback.ts")>("@stores/wordFeedback.ts");
  return { ...actual, loadFeedback: load };
});

const URL_ = "https://berliner-schnauze.wtf/wort/testwort";
// Invented data only.
const props = {
  meaning: "Prüfung",
  slug: "testwort",
  updatedAt: "2026-01-05T10:00:00.000Z",
  url: URL_,
  word: "Testwort",
  wordId: 7,
};

const mountIt = async (extra: Record<string, unknown> = {}) => {
  const w = mount(WordActions, { attachTo: document.body, props: { ...props, ...extra } });
  await flushPromises();
  return w;
};
type Wrapper = Awaited<ReturnType<typeof mountIt>>;

const trigger = (w: Wrapper) => w.get('button[aria-haspopup="menu"]');
const items = (w: Wrapper) => w.findAll('[role="menuitem"]');
const live = () => document.querySelector('[role="status"]')!;
const key = async (el: Element, k: string) => {
  el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: k }));
  await flushPromises();
};
const openMenu = async (w: Wrapper) => {
  await trigger(w).trigger("click"); // detail 0 = keyboard
  await flushPromises();
};
const clipboard = (writeText: () => Promise<void>) =>
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
const state = (like: number, mine: "like" | "dislike" | null = null, dislike = 3) =>
  ({ mine: { reaction: mine }, totals: { dislike, like } }) as never;

let wrapper: Wrapper | undefined;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.clearAllMocks();
  $feedback.set(state(12));
  openForm.set(null);
  online.value = true;
  load.mockResolvedValue(undefined);
  reaction.toggle.mockResolvedValue(true);
  clipboard(() => Promise.resolve());
  Reflect.deleteProperty(navigator, "share");
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("WordActions menu", () => {
  it("opens from the keyboard onto the first item and walks with the arrows, Home and End", async () => {
    wrapper = await mountIt();
    const t = trigger(wrapper);
    expect(t.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    await openMenu(wrapper);
    expect(t.attributes("aria-expanded")).toBe("true");
    const menu = wrapper.get('[role="menu"]');
    const list = items(wrapper);
    expect(list.map((i) => i.find("b").text())).toEqual([
      "Link kopieren",
      "Wort kopieren",
      "Zitieren",
      "Fehler melden",
    ]);
    expect(document.activeElement).toBe(list[0]!.element);
    await key(menu.element, "ArrowDown");
    expect(document.activeElement).toBe(list[1]!.element);
    await key(menu.element, "End");
    expect(document.activeElement).toBe(list[3]!.element);
    await key(menu.element, "ArrowDown");
    expect(document.activeElement).toBe(list[0]!.element);
    await key(menu.element, "ArrowUp");
    expect(document.activeElement).toBe(list[3]!.element);
    await key(menu.element, "Home");
    expect(document.activeElement).toBe(list[0]!.element);
  });

  it("Esc closes the menu and returns the focus to the trigger", async () => {
    wrapper = await mountIt();
    await openMenu(wrapper);
    await key(items(wrapper)[1]!.element, "Escape");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger(wrapper).element);
  });

  it("a pointer open keeps the focus on the trigger", async () => {
    wrapper = await mountIt();
    await trigger(wrapper).trigger("click", { detail: 1 });
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    expect(items(wrapper).some((i) => i.element === document.activeElement)).toBe(false);
  });

  it("opens with ArrowDown on the trigger", async () => {
    wrapper = await mountIt();
    trigger(wrapper).element.focus();
    await key(trigger(wrapper).element, "ArrowDown");
    expect(document.activeElement).toBe(items(wrapper)[0]!.element);
  });

  it("a click outside closes it, a click inside does not", async () => {
    wrapper = await mountIt();
    await openMenu(wrapper);
    await items(wrapper)[0]!.trigger("click");
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    document.body.click();
    await flushPromises();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });

  it("Tab closes it", async () => {
    wrapper = await mountIt();
    await openMenu(wrapper);
    await key(items(wrapper)[0]!.element, "Tab");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });

  it("a stray Esc does nothing and leaves nothing stuck", async () => {
    wrapper = await mountIt();
    trigger(wrapper).element.focus();
    await key(trigger(wrapper).element, "Escape");
    expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
    expect(wrapper.find('[role="region"]').exists()).toBe(false);
    await openMenu(wrapper);
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    await key(items(wrapper)[0]!.element, "Escape");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });

  it("copies the canonical link, says so, keeps the menu open and reverts after 2 s", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    wrapper = await mountIt();
    await openMenu(wrapper);
    expect(wrapper.text()).toContain("berliner-schnauze.wtf/wort/testwort");
    await items(wrapper)[0]!.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(URL_);
    expect(live().textContent).toBe("Link kopiert");
    expect(items(wrapper)[0]!.text()).toContain("Link kopiert");
    expect(items(wrapper)[0]!.text()).toContain("Jetzt einfügen, wo de willst");
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    vi.advanceTimersByTime(2000);
    await flushPromises();
    expect(items(wrapper)[0]!.text()).toContain("Link kopieren");
  });

  it("copies the word with its meaning", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    wrapper = await mountIt();
    await openMenu(wrapper);
    expect(items(wrapper)[1]!.text()).toContain("„Testwort – Prüfung“ als Text");
    await items(wrapper)[1]!.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("Testwort – Prüfung");
    expect(live().textContent).toBe("Wort kopiert");
  });

  it("selects the text and says so when the clipboard is denied", async () => {
    clipboard(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    wrapper = await mountIt();
    await openMenu(wrapper);
    await items(wrapper)[0]!.trigger("click");
    await flushPromises();
    expect(live().textContent).toBe("Markiert. Mit Strg+C kopieren.");
    expect(window.getSelection()!.toString()).toBe("berliner-schnauze.wtf/wort/testwort");
    expect(items(wrapper)[0]!.text()).toContain("Link kopieren");
  });

  it("the live region is in the DOM from the start", async () => {
    wrapper = await mountIt();
    expect(live().textContent).toBe("");
    expect(live().getAttribute("aria-live")).toBe("polite");
  });

  it("Fehler melden closes the menu, scrolls to the report anchor and opens the error form", async () => {
    const anchor = document.createElement("div");
    anchor.id = "fehler";
    anchor.scrollIntoView = vi.fn();
    document.body.append(anchor);
    wrapper = await mountIt();
    await openMenu(wrapper);
    await items(wrapper)[3]!.trigger("click");
    await flushPromises();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(anchor.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    expect(openForm.get()).toBe("error");
  });
});

describe("WordActions citing", () => {
  const openCite = async (w: Wrapper) => {
    await openMenu(w);
    await items(w)[2]!.trigger("click");
    await flushPromises();
  };
  const tabs = (w: Wrapper) => w.findAll('[role="tab"]');
  const text = (w: Wrapper) => w.get('[role="region"] code').text();

  it("opens a region with the tabs Kurz, APA, Wikipedia, APA selected, and closes the menu", async () => {
    wrapper = await mountIt();
    await openCite(wrapper);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    const region = wrapper.get('[role="region"]');
    expect(region.attributes("aria-labelledby")).toBeTruthy();
    expect(tabs(wrapper).map((t) => t.text())).toEqual(["Kurz", "APA", "Wikipedia"]);
    expect(tabs(wrapper).map((t) => t.attributes("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    expect(tabs(wrapper).map((t) => t.attributes("tabindex"))).toEqual(["-1", "0", "-1"]);
    expect(text(wrapper)).toContain("Berliner Schnauze. (2026, 5. Januar). Testwort.");
    expect(wrapper.text()).toContain("Für Schule und Uni (APA 7)");
    expect(wrapper.text()).toContain(
      "Abrufdatum is heute, dit Datum davor is die letzte Änderung am Eintrag.",
    );
  });

  it("calls formatCitation with the canonical url, the model's updatedAt and today", async () => {
    wrapper = await mountIt();
    await openCite(wrapper);
    expect(cite).toHaveBeenCalledWith(
      "apa",
      expect.objectContaining({
        updatedAt: new Date(props.updatedAt),
        url: URL_,
        word: "Testwort",
      }),
    );
    const { today } = cite.mock.calls.at(-1)![1] as { today: Date };
    expect(Math.abs(today.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("switching the tab changes the text; the arrows rove with the selection", async () => {
    wrapper = await mountIt();
    await openCite(wrapper);
    const apa = text(wrapper);
    const list = tabs(wrapper);
    await key(list[1]!.element, "ArrowRight");
    expect(list[2]!.attributes("aria-selected")).toBe("true");
    expect(list[2]!.attributes("tabindex")).toBe("0");
    expect(list[1]!.attributes("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(list[2]!.element);
    expect(text(wrapper)).toContain("{{Internetquelle |url=" + URL_);
    expect(text(wrapper)).not.toBe(apa);
    await key(list[2]!.element, "ArrowRight");
    expect(list[0]!.attributes("aria-selected")).toBe("true");
    expect(text(wrapper)).toContain("„Testwort“. In: Berliner Schnauze");
    await key(list[0]!.element, "ArrowLeft");
    expect(list[2]!.attributes("aria-selected")).toBe("true");
    await list[1]!.trigger("click");
    expect(text(wrapper)).toBe(apa);
    expect(wrapper.get('[role="tabpanel"]').attributes("aria-labelledby")).toBe(
      list[1]!.attributes("id"),
    );
  });

  it("copies the shown text and shows Kopiert for 2 s", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    wrapper = await mountIt();
    await openCite(wrapper);
    const shown = text(wrapper);
    const copy = wrapper.findAll("button").find((b) => b.text() === "Kopieren")!;
    await copy.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(shown);
    expect(copy.text()).toBe("Kopiert");
    vi.advanceTimersByTime(2000);
    await flushPromises();
    expect(copy.text()).toBe("Kopieren");
  });

  it("selects the citation and says so when the clipboard is denied", async () => {
    clipboard(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    wrapper = await mountIt();
    await openCite(wrapper);
    const copy = wrapper.findAll("button").find((b) => b.text() === "Kopieren")!;
    await copy.trigger("click");
    await flushPromises();
    expect(live().textContent).toBe("Markiert. Mit Strg+C kopieren.");
    expect(window.getSelection()!.toString()).toBe(text(wrapper));
    expect(copy.text()).toBe("Kopieren");
  });

  it("Esc closes the panel and returns the focus to the menu button", async () => {
    wrapper = await mountIt();
    await openCite(wrapper);
    await key(tabs(wrapper)[1]!.element, "Escape");
    expect(wrapper.find('[role="region"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger(wrapper).element);
  });

  it("the close button closes it and returns the focus", async () => {
    wrapper = await mountIt();
    await openCite(wrapper);
    await wrapper.get('button[aria-label="Zitieren schließen"]').trigger("click");
    expect(wrapper.find('[role="region"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger(wrapper).element);
  });
});

describe("WordActions share", () => {
  it("uses navigator.share with title and url", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const writeText = vi.fn();
    clipboard(writeText);
    wrapper = await mountIt();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Teilen")!
      .trigger("click");
    await flushPromises();
    expect(share).toHaveBeenCalledWith({ title: "Testwort", url: URL_ });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("a dismissed share sheet is silent", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")),
    });
    const writeText = vi.fn();
    clipboard(writeText);
    wrapper = await mountIt();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Teilen")!
      .trigger("click");
    await flushPromises();
    expect(writeText).not.toHaveBeenCalled();
    expect(live().textContent).toBe("");
  });

  it("copies the link without the Web Share API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    wrapper = await mountIt();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Teilen")!
      .trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(URL_);
    expect(live().textContent).toBe("Link kopiert");
  });
});

describe("WordActions reactions", () => {
  const thumbs = (w: Wrapper) => w.findAll('[role="group"] button');

  it("shows both thumbs with the counts and aria-pressed", async () => {
    $feedback.set(state(12, "like"));
    wrapper = await mountIt();
    const [up, down] = thumbs(wrapper);
    expect(up!.attributes("aria-label")).toBe("Daumen hoch, 12");
    expect(up!.attributes("aria-pressed")).toBe("true");
    expect(down!.attributes("aria-label")).toBe("Daumen runter, 3");
    expect(down!.attributes("aria-pressed")).toBe("false");
    expect(load).toHaveBeenCalledWith(7);
  });

  it("counts optimistically while the request runs and rolls back on a failure", async () => {
    let finish!: (ok: boolean) => void;
    reaction.toggle.mockReturnValue(new Promise((r) => (finish = r)));
    wrapper = await mountIt();
    await thumbs(wrapper)[0]!.trigger("click");
    expect(thumbs(wrapper)[0]!.attributes("aria-pressed")).toBe("true");
    expect(thumbs(wrapper)[0]!.attributes("aria-label")).toBe("Daumen hoch, 13");
    expect(reaction.toggle).toHaveBeenCalledWith(7, "like");
    finish(false);
    await flushPromises();
    expect(thumbs(wrapper)[0]!.attributes("aria-pressed")).toBe("false");
    expect(thumbs(wrapper)[0]!.attributes("aria-label")).toBe("Daumen hoch, 12");
  });

  it("offline: aria-disabled, the verbatim hint, no request", async () => {
    online.value = false;
    wrapper = await mountIt();
    expect(thumbs(wrapper).every((b) => b.attributes("aria-disabled") === "true")).toBe(true);
    expect(wrapper.text()).toContain(
      "Du bist offline. Abstimmen und Mitmachen jeht wieder, sobald du Netz hast.",
    );
    await thumbs(wrapper)[0]!.trigger("click");
    expect(reaction.toggle).not.toHaveBeenCalled();
  });

  it("without a word id (draft) there are no thumbs but Teilen and the menu stay", async () => {
    wrapper = await mountIt({ wordId: undefined });
    expect(wrapper.find('[role="group"]').exists()).toBe(false);
    expect(trigger(wrapper).exists()).toBe(true);
  });
});

describe("WordActions lifecycle", () => {
  it("removes its document listener on unmount", async () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    wrapper = await mountIt();
    const added = add.mock.calls.filter(([type]) => type === "click");
    expect(added.length).toBeGreaterThan(0);
    wrapper.unmount();
    wrapper = undefined;
    for (const [type, fn] of added)
      expect(remove.mock.calls.some(([t, f]) => t === type && f === fn)).toBe(true);
    add.mockRestore();
    remove.mockRestore();
  });
});
