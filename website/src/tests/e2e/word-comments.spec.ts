import { test, expect, type Page } from "@playwright/test";

// Comments and page states of the word page (Spec §7/§9). The comment API is mocked per test (invented authors only),
// so no comment rows are needed in the e2e seed and the real endpoints keep their behaviour.
const WORD = "/wort/aasen";

const comment = (id: number, extra: object = {}) => ({
  authorName: `Kiez-Kalle ${id}`,
  createdAt: new Date(Date.now() - id * 3_600_000).toISOString(),
  downvotes: 0,
  edited: false,
  id,
  myVote: 0,
  parentId: null,
  removalReason: null,
  replies: [],
  state: "visible",
  text: `Erfundener Kommentar Nummer ${id}.`,
  upvotes: id,
  ...extra,
});

const mockList = async (page: Page, comments: object[]) => {
  await page.route(/\/api\/comments\?/, (route) =>
    route.fulfill({
      json: { comments, hasMore: false, total: comments.length },
    }),
  );
};

// Turnstile needs Cloudflare; a stub that hands out a token at once keeps the form testable offline.
const stubTurnstile = async (page: Page) => {
  await page.addInitScript(() => {
    (window as unknown as { turnstile: object }).turnstile = {
      render: (_el: string, o: { callback: (t: string) => void }) => {
        setTimeout(() => {
          o.callback("test-token");
          (window as unknown as { tokenReady: boolean }).tokenReady = true;
        }, 0);
        return "w1";
      },
      reset: () => {},
    };
  });
};

// The island hydrates when it scrolls into view (client:visible).
const open = async (page: Page) => {
  await page.goto(WORD);
  const card = page.locator("#kommentare");
  await card.scrollIntoViewIfNeeded();
  // Server-rendered first: a click or focus check before it hydrated does nothing.
  await expect(card.locator("astro-island").first()).not.toHaveAttribute("ssr", "");
  return card;
};

test.describe("word comments", () => {
  test("every comment has thumbs up and down as a pair and a ⋯ menu with its link", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 1280 });
    await mockList(page, [comment(1, { downvotes: 2 })]);
    const card = await open(page);
    const group = card.getByRole("group", { name: "Kommentar bewerten" });
    await expect(group.getByRole("button", { name: "Hilfreich, 1" })).toBeVisible();
    await expect(group.getByRole("button", { name: "Nich hilfreich, 2" })).toBeVisible();
    await card
      .getByRole("button", { name: "Weitere Aktionen zum Kommentar von Kiez-Kalle 1" })
      .click();
    await expect(page.getByRole("button", { name: "Link kopieren" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Melden" })).toBeVisible();
  });

  test("Strg+Enter shows its hint from 808px on hover devices and is hidden below", async ({
    isMobile,
    page,
  }) => {
    test.skip(isMobile, "phone emulation has no hover, the hint is never shown");
    await mockList(page, []);
    await stubTurnstile(page);
    await page.setViewportSize({ height: 800, width: 1280 });
    const card = await open(page);
    await card.getByRole("button", { name: "Kommentar schreiben" }).click();
    await expect(card.locator(".c-comment-form .kbd")).toBeVisible();
    await page.setViewportSize({ height: 800, width: 390 });
    await expect(card.locator(".c-comment-form .kbd")).toBeHidden();
  });

  test("a word without comments shows the empty copy and no sort", async ({ page }) => {
    await mockList(page, []);
    const card = await open(page);
    await expect(card.getByRole("heading", { name: "Wat sagste dazu? (0)" })).toBeVisible();
    await expect(
      card.getByText("Hier hat noch keener wat jesacht. Fang du doch an!"),
    ).toBeVisible();
    await expect(card.getByRole("group", { name: "Sortierung" })).toHaveCount(0);
  });

  test("four comments show three plus „Alle 4 Kommentare zeigen“", async ({ page }) => {
    await mockList(
      page,
      [1, 2, 3, 4].map((id) => comment(id)),
    );
    const card = await open(page);
    await expect(card.getByRole("heading", { name: "Wat sagste dazu? (4)" })).toBeVisible();
    await expect(card.getByRole("group", { name: "Sortierung" })).toBeVisible();
    await expect(card.locator(".c-word-comments .item")).toHaveCount(3);
    await card.getByRole("button", { name: "Alle 4 Kommentare zeigen" }).click();
    await expect(card.locator(".c-word-comments .item")).toHaveCount(4);
    await expect(card.getByRole("button", { name: /Kommentare zeigen/ })).toHaveCount(0);
  });

  test("a failed send keeps the text, says why and offers „Nochmal abschicken“", async ({
    page,
  }) => {
    await stubTurnstile(page);
    await mockList(page, []);
    // The POST answers after a moment, so the busy state can be observed.
    await page.route(/\/api\/comments$/, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 500));
      return route.fulfill({ json: { error: "kaputt" }, status: 500 });
    });
    const card = await open(page);
    const write = card.getByRole("button", { name: "Kommentar schreiben" });
    await write.click();
    const area = card.getByRole("textbox", { name: "Dein Kommentar" });
    await expect(area).toBeFocused();
    await area.fill("Ein erfundener Text, der stehen bleiben soll.");
    const send = card.getByRole("button", { exact: true, name: "Abschicken" });
    // Deterministic: the stub hands out its token once the widget mounted on the first focus.
    await page.waitForFunction(() => (window as unknown as { tokenReady?: boolean }).tokenReady);
    await send.click();
    await expect(send).toHaveAttribute("aria-busy", "true");
    await expect(card.getByText("Ditt hat nich jeklappt.")).toBeVisible();
    // The focus stays on the send button (aria-disabled, never :disabled).
    await expect(card.getByRole("button", { name: "Nochmal abschicken" })).toBeFocused();
    await expect(area).toHaveValue("Ein erfundener Text, der stehen bleiben soll.");
    const retry = card.getByRole("button", { name: "Nochmal abschicken" });
    await expect(retry).toBeVisible();
    // One channel only: the inline alert, no toast on top of it.
    await expect(card.getByRole("alert")).toHaveCount(1);
    // Scoped to the failure: unrelated global toasts (outdated WebKit, "offline ready") may be up.
    await expect(
      page.locator(".c-toast-notify").filter({ hasText: /nich geklappt|kaputt/ }),
    ).toHaveCount(0);
  });

  test("offline: banner shows, writing locks but stays focusable", async ({ page, context }) => {
    await mockList(page, []);
    const card = await open(page);
    const write = card.getByRole("button", { name: "Kommentar schreiben" });
    // The count only renders once the island is hydrated and has loaded; offline before that no chunk would arrive.
    await expect(card.getByRole("heading", { name: "Wat sagste dazu? (0)" })).toBeVisible();
    await expect(write).not.toHaveAttribute("aria-disabled", "true");
    await context.setOffline(true);
    await expect(page.getByRole("status").filter({ hasText: "Du bist offline." })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Du bist offline." })).toContainText(
      "Du bist offline.",
    );
    await expect(write).toHaveAttribute("aria-disabled", "true");
    await write.focus();
    await expect(write).toBeFocused();
    // force: Playwright waits forever for an aria-disabled button to become enabled
    await write.click({ force: true });
    await expect(card.getByRole("textbox")).toHaveCount(0);
    await context.setOffline(false);
    await expect(page.getByRole("status").filter({ hasText: "Du bist offline." })).toHaveCount(0);
  });
});

test.describe("word page loading skeleton", () => {
  // The ClientRouter takes over every click on a link, also on one added later.
  const navigateTo = async (page: Page, href: string) =>
    page.evaluate((to) => {
      const a = document.createElement("a");
      a.href = to;
      a.textContent = "test-link";
      document.body.append(a);
      a.click();
    }, href);

  test("shows after 300 ms of a slow client navigation, then goes", async ({ page }) => {
    await page.goto(WORD);
    await page.route("**/wort/ab", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    await navigateTo(page, "/wort/ab");
    const skeleton = page.getByLabel("Wort wird jeladen");
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    // The page is held back 1.2 s on purpose; WebKit on a loaded runner needs more than the default 5 s on top.
    await expect(page).toHaveURL(/\/wort\/ab$/, { timeout: 15_000 });
    await expect(skeleton).toHaveCount(0);
  });

  // "Never for a fast load" is a unit test (wordLoading.test.ts): in a parallel e2e run the server can take more than 300 ms.
});
