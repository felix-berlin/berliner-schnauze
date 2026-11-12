import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender, createComponentStub } from "../../helpers";

vi.mock("@layouts/Layout.astro", async () => {
  const { default: MockLayout } = await import("../../helpers/MockLayout.astro");
  return { default: MockLayout };
});
vi.mock("@components/games/BonLeaderboard.vue", () =>
  createComponentStub("<section class='mock-board' />"),
);

describe("games/berliner-oder-nicht/rangliste.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: Page } = await import("@/pages/games/berliner-oder-nicht/rangliste.astro");
    render = await createAstroRender(Page);
  }, 30_000);

  it("renders the leaderboard island", async () => {
    expect(await render({})).toContain("mock-board");
  });
});
