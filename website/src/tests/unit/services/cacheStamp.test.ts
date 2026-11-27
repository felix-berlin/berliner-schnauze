import { createStampPoller } from "@services/cacheStamp.ts";
import { describe, expect, it, vi } from "vitest";

const setup = (reads: (string | null | Error)[]) => {
  let time = 0;
  const read = vi.fn(async () => {
    const next = reads.shift();
    if (next instanceof Error) throw next;
    return next ?? null;
  });
  const onChange = vi.fn();
  const warn = vi.fn();
  const poll = createStampPoller({ onChange, now: () => time, read, warn });
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  return {
    onChange,
    poll,
    read,
    settle,
    tick: (ms: number) => void (time += ms),
    warn,
  };
};

describe("createStampPoller", () => {
  it("remembers the first read and does not call onChange", async () => {
    const t = setup(["a"]);
    t.poll();
    await t.settle();
    expect(t.read).toHaveBeenCalledTimes(1);
    expect(t.onChange).not.toHaveBeenCalled();
  });

  it("calls onChange once for a changed value and not for the same value", async () => {
    const t = setup(["a", "b", "b"]);
    t.poll();
    await t.settle();
    t.tick(2000);
    t.poll();
    await t.settle();
    t.tick(2000);
    t.poll();
    await t.settle();
    expect(t.onChange).toHaveBeenCalledTimes(1);
  });

  it("starts no second read within the interval", async () => {
    const t = setup(["a", "a", "a"]);
    t.poll();
    await t.settle();
    t.tick(1999);
    t.poll();
    t.poll();
    await t.settle();
    expect(t.read).toHaveBeenCalledTimes(1);
  });

  it("starts no second read while one is pending", async () => {
    let finish!: (value: string) => void;
    const read = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    let time = 0;
    const poll = createStampPoller({ onChange: vi.fn(), now: () => time, read });
    poll();
    time += 5000;
    poll();
    expect(read).toHaveBeenCalledTimes(1);
    finish("a");
  });

  it("treats a stamp that appears after null as a change, and null after null as none", async () => {
    const t = setup([null, null, "2026-11-27T10:00:00.000Z"]);
    t.poll();
    await t.settle();
    t.tick(2000);
    t.poll();
    await t.settle();
    expect(t.onChange).not.toHaveBeenCalled();
    t.tick(2000);
    t.poll();
    await t.settle();
    expect(t.onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw or clear when a read fails, and retries after the interval", async () => {
    const t = setup(["a", new Error("db down"), "a"]);
    t.poll();
    await t.settle();
    t.tick(2000);
    expect(() => t.poll()).not.toThrow();
    await t.settle();
    expect(t.onChange).not.toHaveBeenCalled();
    t.tick(1999);
    t.poll();
    await t.settle();
    expect(t.read).toHaveBeenCalledTimes(2); // the failed read also waited the interval
    t.tick(1);
    t.poll();
    await t.settle();
    expect(t.read).toHaveBeenCalledTimes(3);
  });

  it("warns at most once per minute about a failing read", async () => {
    const t = setup([new Error("a"), new Error("b"), new Error("c")]);
    for (let i = 0; i < 2; i++) {
      t.poll();
      await t.settle();
      t.tick(2000);
    }
    expect(t.warn).toHaveBeenCalledTimes(1);
    t.tick(60_000);
    t.poll();
    await t.settle();
    expect(t.warn).toHaveBeenCalledTimes(2);
  });

  it("survives an onChange that rejects", async () => {
    let time = 0;
    const reads = ["a", "b"];
    const warn = vi.fn();
    const poll = createStampPoller({
      onChange: () => Promise.reject(new Error("invalidate failed")),
      now: () => time,
      read: async () => reads.shift() ?? null,
      warn,
    });
    poll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    time += 2000;
    expect(() => poll()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
