import { test, expect } from "@playwright/test";

test.describe("Wort vorschlagen (/wort-vorschlagen)", () => {
  test("Formular zeigt alle Felder mit Pflichtmarkierung", async ({ page }) => {
    await page.goto("/wort-vorschlagen");

    await expect(page).toHaveTitle(/Wort vorschlagen/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vermisste hier");
    await expect(page.getByLabel("Berliner Wort")).toBeVisible();
    await expect(page.getByLabel("Übersetzung in Hochdeutsche")).toBeVisible();
    await expect(page.getByLabel("Schreibe einen Beispielsatz:")).toBeVisible();
    await expect(page.getByLabel("Dein Name (optional)")).toBeVisible();
    await expect(page.getByLabel("Deine E-Mailadresse (optional)")).toBeVisible();
    await expect(page.getByLabel("Berliner Wort")).toHaveAttribute("required", "");
    await expect(page.getByRole("button", { name: "Wort einreichen" })).toBeVisible();
  });

  test("Felder nehmen Eingaben an", async ({ page }) => {
    await page.goto("/wort-vorschlagen");

    await page.getByLabel("Berliner Wort").fill("Kiezkrawall");
    await page.getByLabel("Übersetzung in Hochdeutsche").fill("Streit im Viertel");
    await page.getByLabel("Schreibe einen Beispielsatz:").fill("Heute gab's wieder Kiezkrawall.");

    await expect(page.getByLabel("Berliner Wort")).toHaveValue("Kiezkrawall");
    await expect(page.getByLabel("Schreibe einen Beispielsatz:")).toHaveValue(
      "Heute gab's wieder Kiezkrawall.",
    );
  });

  test("leeres Formular wird nicht abgeschickt", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r) => r.method() === "POST" && requests.push(r.url()));
    await page.goto("/wort-vorschlagen");

    await page.getByRole("button", { name: "Wort einreichen" }).click();

    await expect
      .poll(() =>
        page
          .getByLabel("Berliner Wort")
          .evaluate((el: HTMLInputElement) => el.validity.valueMissing),
      )
      .toBe(true);
    expect(
      requests.filter((u) => !/analytics|matomo|sentry|challenges\.cloudflare\.com/i.test(u)),
    ).toEqual([]);
  });
});
