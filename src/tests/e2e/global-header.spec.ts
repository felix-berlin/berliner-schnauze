import { test, expect } from "@playwright/test";

const menuButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Website Menu Navigation" });

test.describe("Header", () => {
  test("Logo-Link führt zur Startseite", async ({ page }) => {
    await page.goto("/wort/anmachen");

    await page.getByRole("banner").getByRole("link", { name: "Berliner Schnauze" }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  });

  test("Dark Mode bleibt nach Reload erhalten und lässt sich zurücknehmen", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.getByRole("banner").getByRole("button", { name: /Farbschema wechseln/ });

    await toggle.click();
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
    expect(await page.evaluate(() => localStorage.getItem("darkMode"))).toBe("true");

    await page.reload();
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);

    await expect(toggle).toHaveAccessibleName(/hell/);
    await toggle.click();
    await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
    expect(await page.evaluate(() => localStorage.getItem("darkMode"))).toBe("false");
  });

  test("Menü zeigt die Navigation und schließt mit Escape", async ({ page }) => {
    await page.goto("/");

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

    await menuButton(page).click();
    await page.getByRole("link", { name: "Wort Index" }).first().click();

    await expect(page).toHaveURL(/\/wort$/, { timeout: 15_000 });
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
  });
});
