// @vitest-environment jsdom
import { initContributeTriggers } from "@components/word/contributeTriggers.ts";
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

  it("cleans up: no listener, no chips update afterwards", () => {
    cleanup();
    button("[data-contribute=fact]").click();
    expect(openForm.get()).toBeNull();
  });
});
