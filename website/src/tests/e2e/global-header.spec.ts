import { test, expect } from "@playwright/test";

import { dismissToasts } from "./helpers";

const menuButton = (page: import("@playwright/test").Page) =>
  page.getByRole("banner").getByRole("button", { exact: true, name: "Menü" });

test.describe("Header", () => {
  test("Logo-Link führt zur Startseite", async ({ page }) => {
    await page.goto("/wort/anmachen");
    await dismissToasts(page);

    await page.getByRole("banner").getByRole("link", { name: "Berliner Schnauze" }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  });

  test("Farbschema im Menü bleibt nach Reload erhalten und lässt sich zurücknehmen", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissToasts(page);
    const html = page.locator("html");
    const pickMode = async (name: string) => {
      await menuButton(page).click();
      await page.getByTitle(name, { exact: true }).click();
      await expect(page.getByRole("radio", { name })).toBeChecked();
      await page.keyboard.press("Escape");
    };

    await pickMode("Dunkel");
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
    expect(await page.evaluate(() => localStorage.getItem("darkMode"))).toBe("true");

    await page.reload();
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);

    await pickMode("Hell");
    await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
    expect(await page.evaluate(() => localStorage.getItem("darkMode"))).toBe("false");
  });

  test("Menü zeigt die Navigation und schließt mit Escape", async ({ page }) => {
    await page.goto("/");
    await dismissToasts(page);

    await menuButton(page).click();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");
    for (const [name, href] of [
      [/Berliner oder nicht/, "/games/berliner-oder-nicht"],
      ["Magazin", "/magazin"],
      ["Wort vorschlagen", "/wort-vorschlagen"],
      ["Wort Index", "/wort"],
      ["Einstellungen", "/settings"],
      ["Was ist neu?", "/changelog"],
    ] as const) {
      await expect(page.getByRole("link", { name }).first()).toHaveAttribute("href", href);
    }

    await page.keyboard.press("Escape");

    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("Menü-Link navigiert und schließt das Menü", async ({ page }) => {
    await page.goto("/");
    await dismissToasts(page);

    await menuButton(page).click();
    await page.getByRole("link", { name: "Wort Index" }).first().click();

    await expect(page).toHaveURL(/\/wort$/, { timeout: 15_000 });
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
  });
});
