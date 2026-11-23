// @vitest-environment jsdom
import { initRecordTooltip } from "@components/word/recordTooltip.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("initRecordTooltip", () => {
  let cleanup: () => void;
  let record: HTMLElement;
  let button: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = `<div class="c-word-beispiele"><span class="record"><button class="record-button">Einsprechen</button><span class="tip"></span></span></div><h1 id="out" tabindex="-1">x</h1>`;
    record = document.querySelector<HTMLElement>(".record")!;
    button = record.querySelector("button")!;
    cleanup = initRecordTooltip();
  });
  afterEach(() => cleanup());

  const state = () => ({
    dismissed: "dismissed" in record.dataset,
    open: record.hasAttribute("data-open"),
  });

  it("opens on a tap and closes on the second tap", () => {
    button.click();
    expect(state()).toEqual({ dismissed: false, open: true });
    button.click();
    expect(state()).toEqual({ dismissed: true, open: false });
  });

  it("closes on Esc and stays closed for a mouse move inside", () => {
    button.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(state()).toEqual({ dismissed: true, open: false });
    button.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true, relatedTarget: record.querySelector(".tip") }),
    );
    expect(state().dismissed).toBe(true);
  });

  it("reopens for a new focus or a pointer entry from outside", () => {
    button.click();
    button.click();
    button.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.getElementById("out") }),
    );
    expect(state().dismissed).toBe(false);
    button.click();
    button.click();
    button.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(state().dismissed).toBe(false);
  });

  it("leaves no dismissed state for a stray Esc", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(state()).toEqual({ dismissed: false, open: false });
  });

  it("dismisses a focused tooltip on Esc and a tap elsewhere closes an open one", () => {
    button.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(state().dismissed).toBe(true);
    button.click();
    document.getElementById("out")!.click();
    expect(state().open).toBe(false);
  });

  it("removes its listeners on cleanup", () => {
    cleanup();
    button.click();
    expect(state()).toEqual({ dismissed: false, open: false });
  });
});
