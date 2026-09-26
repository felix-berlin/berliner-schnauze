// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

const { getWakapiStats } = vi.hoisted(() => ({ getWakapiStats: vi.fn() }));
vi.mock("@services/wakapiStats", () => ({ getWakapiStats }));

describe("AnkiDevHours.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: AnkiDevHours } = await import("@components/anki/AnkiDevHours.astro");
    render = await createAstroRender(AnkiDevHours);
  }, 30_000);

  it("shows hours and full working days in German notation", async () => {
    getWakapiStats.mockResolvedValue({ hours: 1234, minutes: 5 });
    const result = await render({});

    expect(result).toContain("c-anki-dev-hours");
    expect(result).toContain("<strong>1.234</strong>");
    expect(result).toContain("Knapp 154 volle Arbeitstage");
  });

  it("renders nothing without tracked hours", async () => {
    getWakapiStats.mockResolvedValue({ hours: 0, minutes: 0 });
    const result = await render({});

    expect(result).not.toContain("c-anki-dev-hours");
  });
});
