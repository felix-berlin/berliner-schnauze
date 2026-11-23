import ContributeForm from "@components/word/ContributeForm.vue";
import { ownSubmissions } from "@lib/ownSubmissions.ts";
import { openForm } from "@stores/contribute.ts";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";

vi.mock("@lib/wordSuggest.ts", () => ({
  suggestWords: vi.fn(async () => [
    { label: "Schusterjunge", meaning: "Roggenbrötchen", slug: "schusterjunge" },
    { label: "Schuster", meaning: "Handwerker", slug: "schuster" },
  ]),
}));

// The stub hands out a token right away, like Turnstile does once the check passed.
const TurnStile = defineComponent({
  emits: ["token", "error"],
  methods: { reset() {} },
  mounted() {
    this.$emit("token", "test-token");
  },
  template: "<div />",
});
const stubs = { BerlinerBaer: true, TurnStile };

type Props = { type: "error" | "example" | "fact" | "related" | "story"; word: string };
// Attached: jsdom only submits a form that is in the document.
const mounted: VueWrapper[] = [];
const mountForm = (type: Props["type"], testStubs: Record<string, unknown> = stubs) => {
  const w = mount(ContributeForm, {
    attachTo: document.body,
    global: { stubs: testStubs },
    props: { type, word: "schrippe" },
  });
  mounted.push(w);
  return w;
};
const make = (type: Props["type"]) => mountForm(type);
const open = async (type: string) => {
  openForm.set(type);
  await nextTick();
  await flushPromises();
};
const byLabel = (w: VueWrapper, text: string) => {
  const label = w.findAll("label").find((l) => l.text().startsWith(text));
  if (!label) throw new Error(`no label ${text}`);
  return w.find(`[id="${label.attributes("for")}"]`);
};
const submit = (w: VueWrapper) => w.find("button[type=submit]");
const okResponse = (body: unknown = { ok: true }) => ({
  json: async () => body,
  ok: true,
  status: 201,
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  openForm.set(null);
  fetchMock = vi.fn().mockResolvedValue(okResponse());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ContributeForm states", () => {
  it("renders nothing while its type is not the open form", () => {
    expect(make("example").find("form").exists()).toBe(false);
  });

  it("opens when the store names its type and focuses the first field", async () => {
    const w = make("example");
    await open("example");
    expect(w.find("form").exists()).toBe(true);
    expect(document.activeElement).toBe(byLabel(w, "Satz uff Berlinerisch").element);
  });

  it("aria-disabled follows the required fields, never disabled", async () => {
    const w = make("example");
    await open("example");
    expect(submit(w).attributes("aria-disabled")).toBe("true");
    expect(submit(w).attributes("disabled")).toBeUndefined();
    await byLabel(w, "Satz uff Berlinerisch").setValue("   ");
    expect(submit(w).attributes("aria-disabled")).toBe("true");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Zwee Schrippen, bitte.");
    expect(submit(w).attributes("aria-disabled")).toBe("false");
  });

  it("opening a second form closes the first and keeps its input", async () => {
    const a = make("example");
    const b = make("fact");
    await open("example");
    await byLabel(a, "Satz uff Berlinerisch").setValue("Mein Satz");
    await open("fact");
    expect(a.find("form").exists()).toBe(false);
    expect(b.find("form").exists()).toBe(true);
    await open("example");
    expect(b.find("form").exists()).toBe(false);
    expect((byLabel(a, "Satz uff Berlinerisch").element as HTMLTextAreaElement).value).toBe(
      "Mein Satz",
    );
  });

  it("Abbrechen closes the form", async () => {
    const w = make("example");
    await open("example");
    await w
      .findAll("button")
      .find((b) => b.text() === "Abbrechen")!
      .trigger("click");
    expect(w.find("form").exists()).toBe(false);
    expect(openForm.get()).toBeNull();
  });

  it("shows the counter from 80 % of the limit; the live text changes on state changes only", async () => {
    const w = make("example");
    await open("example");
    const area = byLabel(w, "Satz uff Berlinerisch");
    await area.setValue("x".repeat(159));
    expect(w.text()).not.toContain("159 / 200");
    await area.setValue("x".repeat(160));
    expect(w.text()).toContain("160 / 200");
    const live = () => w.find("[aria-live=polite]");
    expect(w.find(".counter").attributes("aria-live")).toBeUndefined();
    expect(live().text()).toBe("Fast am Limit.");
    await area.setValue("x".repeat(170));
    expect(live().text()).toBe("Fast am Limit."); // another keystroke, same text: nothing new is announced
    await area.setValue("x".repeat(201));
    expect(live().text()).toBe("Ditt is zu lang.");
    await area.setValue("x");
    expect(live().text()).toBe("");
  });

  it("a TypeError is reported while online, an offline failure is not", async () => {
    const send = async () => {
      const w = make("example");
      await open("example");
      await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
      await submit(w).trigger("click");
      await flushPromises();
    };
    fetchMock.mockRejectedValue(new TypeError("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await send();
    expect(spy.mock.calls.flat().some((a) => a instanceof TypeError)).toBe(true);
    spy.mockClear();
    fetchMock.mockImplementation(async () => {
      // the connection drops while the request is in flight
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      window.dispatchEvent(new Event("offline"));
      throw new TypeError("offline");
    });
    await send();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("over the limit keeps Absenden aria-disabled", async () => {
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("x".repeat(201));
    expect(submit(w).attributes("aria-disabled")).toBe("true");
  });
});

describe("ContributeForm sending", () => {
  it("a double click sends once and marks the button busy", async () => {
    let release!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => (release = r)));
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Zwee Schrippen, bitte.");
    await submit(w).trigger("click");
    await submit(w).trigger("click");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(submit(w).attributes("aria-busy")).toBe("true");
    release(okResponse());
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a failed request keeps the input and shows the error strip", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({}), ok: false, status: 502 });
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Zwee Schrippen, bitte.");
    await submit(w).trigger("click");
    await flushPromises();
    const alert = w.find("[role=alert]");
    expect(alert.text()).toContain("Ditt hat nich jeklappt.");
    expect(alert.text()).toContain("Deine Eingaben sind noch da, versuch’s gleich nochmal.");
    expect((byLabel(w, "Satz uff Berlinerisch").element as HTMLTextAreaElement).value).toBe(
      "Zwee Schrippen, bitte.",
    );
    expect(submit(w).text()).toBe("Nochmal absenden");
    expect(submit(w).attributes("aria-busy")).toBe("false");
  });

  it("a network failure shows the same strip", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    await submit(w).trigger("click");
    await flushPromises();
    expect(w.find("[role=alert]").exists()).toBe(true);
  });

  it("shows the server reason of a 400 under the strip", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ field: "text", message: "Ditt is ein bisken zu lang." }),
      ok: false,
      status: 400,
    });
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    await submit(w).trigger("click");
    await flushPromises();
    expect(w.find("[role=alert]").text()).toContain("Ditt is ein bisken zu lang.");
  });

  it("sends nothing and says so while the captcha has no token", async () => {
    const silent = defineComponent({ emits: ["token", "error"], template: "<div />" });
    const w = mountForm("example", { BerlinerBaer: true, TurnStile: silent });
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    await submit(w).trigger("click");
    await flushPromises();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(w.find("[role=status]").text()).toContain("Moment noch");
  });

  it("clicking a not yet ready button sends nothing and names the missing text", async () => {
    const w = make("example");
    await open("example");
    await submit(w).trigger("click");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(w.text()).toContain("Ohne Text wird dett nüscht.");
  });
});

describe("ContributeForm thanks", () => {
  const cases: [Props["type"], string][] = [
    ["example", "Beispiel"],
    ["story", "Jeschichte"],
    ["fact", "Eintrag"],
    ["related", "Vorschlag"],
  ];

  const fill = async (w: VueWrapper, type: Props["type"]) => {
    if (type === "example") await byLabel(w, "Satz uff Berlinerisch").setValue("Ein Satz");
    if (type === "story") await byLabel(w, "Deine Jeschichte").setValue("Eene Jeschichte");
    if (type === "fact") await byLabel(w, "Dein Text").setValue("Ein Fakt");
    if (type === "related") await byLabel(w, "Welchet Wort?").setValue("Semmel");
  };

  it.each(cases)("%s: thanks text names the %s", async (type, noun) => {
    fetchMock.mockResolvedValue(okResponse({ editKey: "k", ok: true }));
    const w = make(type);
    await open(type);
    await fill(w, type);
    await submit(w).trigger("click");
    await flushPromises();
    const status = w.find("[role=status]");
    expect(status.text()).toContain("Danke dir!");
    expect(status.text()).toContain("Ick kiek ma drüber.");
    expect(status.text()).toContain(
      `Dein ${noun} erscheint, sobald ick et jeprüft hab. Dit dauert meistens een paar Tage.`,
    );
    expect(w.find("form").exists()).toBe(false);
  });

  it("error report: own thanks text, no public promise", async () => {
    const w = make("error");
    await open("error");
    await byLabel(w, "Wat stimmt nich, und wat wär richtig?").setValue("Falsch");
    await submit(w).trigger("click");
    await flushPromises();
    const status = w.find("[role=status]");
    expect(status.text()).toContain("Danke für den Hinweis!");
    expect(status.text()).toContain("Wenn wat falsch is, wird’s korrigiert.");
    expect(status.text()).toContain("Deine Meldung is nirgends öffentlich zu sehen.");
  });

  it("„Noch wat ergänzen“ opens an empty form", async () => {
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Ein Satz");
    await submit(w).trigger("click");
    await flushPromises();
    await w
      .findAll("button")
      .find((b) => b.text() === "Noch wat ergänzen")!
      .trigger("click");
    await nextTick();
    expect(w.find("[role=status]").text()).toBe("");
    expect((byLabel(w, "Satz uff Berlinerisch").element as HTMLTextAreaElement).value).toBe("");
  });

  it("remembers a sent suggestion for the chip, a sent story leaves no edit key behind", async () => {
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Ein Satz");
    await byLabel(w, "Dein Name").setValue("Kalle");
    await submit(w).trigger("click");
    await flushPromises();
    expect(ownSubmissions("schrippe")).toMatchObject([{ preview: "Ein Satz", type: "example" }]);
    expect(localStorage.getItem("bs-own-submissions")).not.toContain("Kalle");

    fetchMock.mockResolvedValue(okResponse({ id: 42, ok: true }));
    const s = make("story");
    await open("story");
    await byLabel(s, "Deine Jeschichte").setValue("Eene Jeschichte");
    await submit(s).trigger("click");
    await flushPromises();
    expect(localStorage.getItem("bs-comment-keys")).toBeNull();
    expect(localStorage.getItem("bs-story-keys")).toBeNull();
  });
});

describe("ContributeForm requests", () => {
  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return { body: JSON.parse(init.body as string), init, url };
  };

  it("example: /api/contribute with the exact body, optional fields omitted when empty", async () => {
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("  Zwee Schrippen, bitte. ");
    await submit(w).trigger("click");
    await flushPromises();
    const { body, init, url } = lastCall();
    expect(url).toBe("/api/contribute");
    expect(init.method).toBe("POST");
    expect(body).toEqual({
      text: "Zwee Schrippen, bitte.",
      turnstileToken: "test-token",
      type: "example",
      word: "schrippe",
    });
  });

  it("example: Hochdeutsch and name are sent when filled", async () => {
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    await byLabel(w, "Uff Hochdeutsch").setValue("Satz hochdeutsch");
    await byLabel(w, "Dein Name").setValue("Kalle");
    await submit(w).trigger("click");
    await flushPromises();
    expect(lastCall().body).toMatchObject({ highdeutsch: "Satz hochdeutsch", name: "Kalle" });
  });

  it("fact: kind from the chips, default Herkunft", async () => {
    const w = make("fact");
    await open("fact");
    await byLabel(w, "Dein Text").setValue("Kommt von der Kerbe.");
    await w
      .findAll("button[aria-pressed]")
      .find((b) => b.text() === "Gebrauch heute")!
      .trigger("click");
    await submit(w).trigger("click");
    await flushPromises();
    expect(lastCall().url).toBe("/api/contribute");
    expect(lastCall().body).toEqual({
      kind: "gebrauch",
      text: "Kommt von der Kerbe.",
      turnstileToken: "test-token",
      type: "fact",
      word: "schrippe",
    });
  });

  it("related: free text goes to relatedText", async () => {
    const w = make("related");
    await open("related");
    await byLabel(w, "Welchet Wort?").setValue("Semmel");
    await submit(w).trigger("click");
    await flushPromises();
    expect(lastCall().body).toEqual({
      relatedText: "Semmel",
      relation: "gleich",
      turnstileToken: "test-token",
      type: "related",
      word: "schrippe",
    });
  });

  it("related: a picked dictionary word goes to relatedText too", async () => {
    const w = make("related");
    await open("related");
    await byLabel(w, "Welchet Wort?").setValue("Schuster");
    await flushPromises();
    const options = w.findAll("[role=option]");
    expect(options).toHaveLength(2);
    await options[0]!.trigger("click");
    await w
      .findAll("button[aria-pressed]")
      .find((b) => b.text() === "Gegenteil")!
      .trigger("click");
    await submit(w).trigger("click");
    await flushPromises();
    expect(lastCall().body).toMatchObject({ relatedText: "Schusterjunge", relation: "gegenteil" });
  });

  it("story: /api/stories with bezirk and name, no type field", async () => {
    fetchMock.mockResolvedValue(okResponse({ editKey: "k", ok: true }));
    const w = make("story");
    await open("story");
    await byLabel(w, "Deine Jeschichte").setValue("Oma hat Schrippen jeholt.");
    await (byLabel(w, "Wo wohnste?") as ReturnType<typeof byLabel>).setValue("pankow");
    await byLabel(w, "Dein Name").setValue("Kiezkind");
    await submit(w).trigger("click");
    await flushPromises();
    expect(lastCall().url).toBe("/api/stories");
    expect(lastCall().body).toEqual({
      bezirk: "pankow",
      name: "Kiezkind",
      text: "Oma hat Schrippen jeholt.",
      turnstileToken: "test-token",
      word: "schrippe",
    });
  });

  it("story: Bezirk select offers Keene Angabe, the 12 Bezirke and Nich aus Berlin", async () => {
    const w = make("story");
    await open("story");
    const labels = byLabel(w, "Wo wohnste?")
      .findAll("option")
      .map((o) => o.text());
    expect(labels).toHaveLength(14);
    expect(labels[0]).toBe("Keene Angabe");
    expect(labels.at(-1)).toBe("Nich aus Berlin");
  });

  it("error: /api/reports, Bedeutung preselected, no e-mail field when empty", async () => {
    const w = make("error");
    await open("error");
    await byLabel(w, "Wat stimmt nich, und wat wär richtig?").setValue("Stimmt nich.");
    await submit(w).trigger("click");
    await flushPromises();
    expect(lastCall().url).toBe("/api/reports");
    expect(lastCall().body).toEqual({
      kind: "meaning",
      text: "Stimmt nich.",
      turnstileToken: "test-token",
      word: "schrippe",
    });
    expect("email" in lastCall().body).toBe(false);
  });

  it("error: the e-mail is sent when given, as an email field", async () => {
    const w = make("error");
    await open("error");
    await byLabel(w, "Wat stimmt nich, und wat wär richtig?").setValue("Stimmt nich.");
    const mail = byLabel(w, "Deine E-Mail");
    expect(mail.attributes("type")).toBe("email");
    await mail.setValue("kalle@example.test");
    await submit(w).trigger("click");
    await flushPromises();
    expect(lastCall().body.email).toBe("kalle@example.test");
  });

  it("never logs the e-mail", async () => {
    const spies = (["log", "warn", "error", "info"] as const).map((m) => vi.spyOn(console, m));
    const w = make("error");
    await open("error");
    await byLabel(w, "Wat stimmt nich, und wat wär richtig?").setValue("Stimmt nich.");
    await byLabel(w, "Deine E-Mail").setValue("kalle@example.test");
    await submit(w).trigger("click");
    await flushPromises();
    for (const s of spies) expect(JSON.stringify(s.mock.calls)).not.toContain("kalle@example.test");
  });
});

describe("ContributeForm offline", () => {
  it("locks Absenden and says why, exactly as Spec §15", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Zwee Schrippen, bitte.");
    expect(w.text()).toContain(
      "Du bist offline. Abstimmen und Mitmachen jeht wieder, sobald du Netz hast.",
    );
    expect(submit(w).attributes("aria-disabled")).toBe("true");
    await submit(w).trigger("click");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reacts to the online and offline events", async () => {
    const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const w = make("example");
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    expect(submit(w).attributes("aria-disabled")).toBe("false");
    onLine.mockReturnValue(false);
    window.dispatchEvent(new Event("offline"));
    await nextTick();
    expect(submit(w).attributes("aria-disabled")).toBe("true");
    expect(w.text()).toContain("Du bist offline.");
    onLine.mockReturnValue(true);
    window.dispatchEvent(new Event("online"));
    await nextTick();
    expect(submit(w).attributes("aria-disabled")).toBe("false");
  });
});

describe("ContributeForm captcha timing", () => {
  it("a click before the token arrives sends once the token is there", async () => {
    const late = defineComponent({
      emits: ["token", "error"],
      methods: {
        issue() {
          this.$emit("token", "late-token");
        },
        reset() {},
      },
      template: "<div />",
    });
    const w = mountForm("example", { BerlinerBaer: true, TurnStile: late });
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    await submit(w).trigger("click");
    expect(fetchMock).not.toHaveBeenCalled();
    (w.findComponent(late).vm as unknown as { issue: () => void }).issue();
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)
        .turnstileToken,
    ).toBe("late-token");
  });
});

describe("ContributeForm close and reopen", () => {
  const late = defineComponent({
    emits: ["token", "error"],
    methods: {
      issue(value = "tok") {
        this.$emit("token", value);
      },
      reset() {},
    },
    template: "<div />",
  });
  const issue = (w: VueWrapper, value?: string) =>
    (w.findComponent(late).vm as unknown as { issue: (v?: string) => void }).issue(value);
  const cancel = (w: VueWrapper) =>
    w
      .findAll("button")
      .find((b) => b.text() === "Abbrechen")!
      .trigger("click");

  it("a click before the token, cancel and reopen: the new widget's first token does not send", async () => {
    const w = mountForm("example", { BerlinerBaer: true, TurnStile: late });
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    await submit(w).trigger("click");
    await cancel(w);
    await open("example");
    issue(w);
    await flushPromises();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(w.find("[role=status]").text()).toBe("");
  });

  it("closing by another form also drops the pending send", async () => {
    const w = mountForm("example", { BerlinerBaer: true, TurnStile: late });
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    await submit(w).trigger("click");
    await open("fact");
    await open("example");
    issue(w);
    await flushPromises();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a token from before the close is not reused after reopening", async () => {
    const w = mountForm("example", { BerlinerBaer: true, TurnStile: late });
    await open("example");
    await byLabel(w, "Satz uff Berlinerisch").setValue("Satz");
    issue(w, "old-token");
    await cancel(w);
    await open("example");
    await submit(w).trigger("click");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(w.find("[role=status]").text()).toContain("Moment noch");
  });

  it("cancel returns the focus to the first visible trigger", async () => {
    const hidden = document.createElement("button");
    hidden.dataset.contribute = "example";
    hidden.hidden = true;
    const shown = document.createElement("button");
    shown.dataset.contribute = "example";
    document.body.append(hidden, shown);
    const original = Element.prototype.checkVisibility;
    Element.prototype.checkVisibility = function (this: Element) {
      return !(this as HTMLElement).hidden;
    };
    const w = make("example");
    await open("example");
    await cancel(w);
    await nextTick();
    expect(document.activeElement).toBe(shown);
    Element.prototype.checkVisibility = original;
    hidden.remove();
    shown.remove();
  });
});

describe("ContributeForm errors", () => {
  const sendWith = async (
    type: Props["type"],
    response: unknown,
    fill?: (w: VueWrapper) => Promise<void>,
  ) => {
    fetchMock.mockResolvedValue(response);
    const w = make(type);
    await open(type);
    await byLabel(
      w,
      type === "error" ? "Wat stimmt nich, und wat wär richtig?" : "Satz uff Berlinerisch",
    ).setValue("Satz");
    await fill?.(w);
    await submit(w).trigger("click");
    await flushPromises();
    return w;
  };

  it("refused click marks the field aria-invalid and describes it with the error", async () => {
    const w = make("example");
    await open("example");
    await submit(w).trigger("click");
    const area = byLabel(w, "Satz uff Berlinerisch");
    expect(area.attributes("aria-invalid")).toBe("true");
    expect(area.attributes("aria-describedby")).toContain("error");
  });

  it.each([
    [403, "Captcha nicht bestanden"],
    [503, "Die Captcha-Prüfung ist gerade gestört, bitte versuch es später nochmal."],
    [429, "Zu viele Anfragen, versuch es später nochmal."],
  ])("%i shows the server's own text", async (status, error) => {
    const w = await sendWith("example", { json: async () => ({ error }), ok: false, status });
    expect(w.find("[role=alert]").text()).toContain(error);
    expect(submit(w).text()).toBe("Nochmal absenden");
  });

  it("429 without a body falls back to the generic rate-limit text", async () => {
    const w = await sendWith("example", {
      json: async () => {
        throw new Error("no json");
      },
      ok: false,
      status: 429,
    });
    expect(w.find("[role=alert]").text()).toContain("Ma langsam, Keule");
  });

  it("a 400 on the optional e-mail marks that field and moves the focus there", async () => {
    const w = await sendWith(
      "error",
      {
        json: async () => ({ field: "email", message: "Irgendwas läuft hier nicht" }),
        ok: false,
        status: 400,
      },
      async (f) => {
        await byLabel(f, "Deine E-Mail").setValue("kaputt");
      },
    );
    const mail = byLabel(w, "Deine E-Mail");
    expect(mail.attributes("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(mail.element);
    expect(w.text()).toContain("Irgendwas läuft hier nicht");
  });
});
