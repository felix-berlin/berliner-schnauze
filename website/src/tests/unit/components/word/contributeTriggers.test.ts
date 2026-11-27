// @vitest-environment jsdom
import {
  initContributeTriggers,
  watchContributeTriggers,
} from "@components/word/contributeTriggers.ts";
import { rememberSubmission } from "@lib/ownSubmissions.ts";
import { openForm } from "@stores/contribute.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("initContributeTriggers", () => {
  let cleanup: () => void;

  beforeEach(() => {
    localStorage.clear();
    openForm.set(null);
    document.body.innerHTML = `
      <section data-form="example"><button data-contribute="example" aria-expanded="false">Ergänzen</button><div data-own="example" data-word="schrippe"></div></section>
      <section data-form="fact"><button data-contribute="fact" aria-expanded="false">Ergänzen</button><div data-own="fact" data-word="schrippe"></div></section>
      <section><button data-report aria-expanded="false">Fehler melden</button></section>`;
    cleanup = initContributeTriggers();
  });
  afterEach(() => cleanup());

  const button = (selector: string) => document.querySelector<HTMLElement>(selector)!;

  it("opens the form of the clicked trigger and mirrors it in aria-expanded / aria-controls", () => {
    button("[data-contribute=fact]").click();
    expect(openForm.get()).toBe("fact");
    expect(button("[data-contribute=fact]").getAttribute("aria-expanded")).toBe("true");
    expect(button("[data-contribute=fact]").getAttribute("aria-controls")).toBe("contribute-fact");
    expect(button("[data-contribute=example]").getAttribute("aria-expanded")).toBe("false");
    expect(button("[data-contribute=example]").hasAttribute("aria-controls")).toBe(false);
    expect(button("[data-form=fact]").dataset["state"]).toBe("form-open");
    expect(button("[data-form=example]").dataset["state"]).toBeUndefined();
  });

  it("opens only one form at a time and the report form from data-report", () => {
    button("[data-contribute=example]").click();
    button("[data-report]").click();
    expect(openForm.get()).toBe("error");
    expect(button("[data-report]").getAttribute("aria-expanded")).toBe("true");
    expect(button("[data-contribute=example]").getAttribute("aria-expanded")).toBe("false");
  });

  it("renders the chip „Wird jeprüft“ only for own stored submissions of that card", () => {
    expect(document.body.textContent).not.toContain("Wird jeprüft");
    cleanup();
    rememberSubmission("schrippe", "example", "Zwee <b>Schrippen</b>");
    rememberSubmission("andere", "example", "Fremdes Wort");
    cleanup = initContributeTriggers();
    const own = button("[data-own=example]");
    expect(own.textContent).toContain("Wird jeprüft");
    expect(own.textContent).toContain("Zwee <b>Schrippen</b>");
    expect(own.querySelector("b")).toBeNull();
    expect(own.textContent).not.toContain("Fremdes Wort");
    expect(button("[data-own=fact]").textContent).toBe("");
  });

  it("drops an own submission as soon as its text is public in the same card", () => {
    cleanup();
    rememberSubmission("schrippe", "example", "  Zwee   Schrippen, bitte! ");
    rememberSubmission("schrippe", "example", "Noch nich veröffentlicht");
    document
      .querySelector("[data-form=example]")!
      .insertAdjacentHTML("afterbegin", "<ol><li><q>Zwee Schrippen,\n bitte!</q></li></ol>");
    cleanup = initContributeTriggers();
    const own = button("[data-own=example]").textContent;
    expect(own).toContain("Noch nich veröffentlicht");
    expect(own).not.toContain("Zwee");
    expect(own?.match(/Wird jeprüft/g)).toHaveLength(1);
  });

  it("cleans up: no listener, no chips update afterwards", () => {
    cleanup();
    button("[data-contribute=fact]").click();
    expect(openForm.get()).toBeNull();
  });
});

describe("watchContributeTriggers (ClientRouter)", () => {
  const dom = `<section data-form="example"><button data-contribute="example" aria-expanded="false">Ergänzen</button><div data-own="example" data-word="schrippe"></div></section>`;
  let unwatch: () => void;

  beforeEach(() => {
    localStorage.clear();
    openForm.set(null);
    document.body.innerHTML = dom;
    unwatch = watchContributeTriggers();
  });
  afterEach(() => unwatch());

  const navigate = () => {
    document.dispatchEvent(new Event("astro:before-swap"));
    document.body.innerHTML = dom; // the next word page
    document.dispatchEvent(new Event("astro:page-load"));
  };

  it("wires on every page load and leaves exactly one listener after several navigations", () => {
    document.dispatchEvent(new Event("astro:page-load"));
    navigate();
    navigate();
    const seen: (null | string)[] = [];
    const stop = openForm.listen((v) => seen.push(v));
    document.querySelector<HTMLElement>("[data-contribute]")!.click();
    stop();
    expect(seen).toEqual(["example"]);
    expect(document.querySelector("[data-contribute]")!.getAttribute("aria-expanded")).toBe("true");
  });

  it("leaves one listener after two page loads without a swap in between", () => {
    document.dispatchEvent(new Event("astro:page-load"));
    document.dispatchEvent(new Event("astro:page-load"));
    const seen: (null | string)[] = [];
    const stop = openForm.listen((v) => seen.push(v));
    document.querySelector<HTMLElement>("[data-contribute]")!.click();
    stop();
    expect(seen).toEqual(["example"]);
    // Two live listeners would each call the cleanup once: after before-swap a click must do nothing.
    document.dispatchEvent(new Event("astro:before-swap"));
    document.querySelector<HTMLElement>("[data-contribute]")!.click();
    expect(openForm.get()).toBeNull();
  });

  it("renders the own chips after a navigation, not only on the first page", () => {
    document.dispatchEvent(new Event("astro:page-load"));
    rememberSubmission("schrippe", "example", "Zwee Schrippen");
    navigate();
    expect(document.querySelector("[data-own]")!.textContent).toContain("Wird jeprüft");
  });

  it("resets the open form before the swap and stops wiring until the next page load", () => {
    document.dispatchEvent(new Event("astro:page-load"));
    document.querySelector<HTMLElement>("[data-contribute]")!.click();
    expect(openForm.get()).toBe("example");
    document.dispatchEvent(new Event("astro:before-swap"));
    expect(openForm.get()).toBeNull();
    document.querySelector<HTMLElement>("[data-contribute]")!.click();
    expect(openForm.get()).toBeNull();
  });
});
