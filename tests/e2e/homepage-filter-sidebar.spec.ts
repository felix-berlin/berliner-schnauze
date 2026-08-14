// spec: specs/plan.md
// seed: tests/e2e/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Filter Sidebar (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // On narrow viewports the filter sidebar sits behind a "Filter öffnen" toggle.
    const filterToggle = page.getByRole('button', { name: 'Filter öffnen' });
    const opensBehindToggle = await filterToggle
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (opensBehindToggle) {
      await filterToggle.click();
    }
  });

  test('Sortiere-nach-Dropdown ändert die Reihenfolge der Wortliste', async ({ page }) => {
    const sortSelect = page.getByRole('complementary').getByLabel('Sortiere nach:');
    await expect(sortSelect.locator('option:checked')).toHaveText('Alphabetisch (A - Z)');

    // 2. Read and store the text of the first word link in the word list
    const wordList = page.locator('.c-word-list article a');
    const firstWordBefore = await wordList.first().textContent();

    // 3. In the complementary sidebar, select 'neuste zuerst' from the 'Sortiere nach:' combobox
    await sortSelect.selectOption('neuste zuerst');
    await expect(sortSelect.locator('option:checked')).toHaveText('neuste zuerst');

    // 4. Read the text of the first word link in the word list again
    await expect(wordList.first()).not.toHaveText(firstWordBefore ?? '');
  });

  test('Buchstaben-Filter (Alphabet) filtert die Wortliste auf einen Buchstaben', async ({ page }) => {
    // Content is a live WordPress dataset — capture the current count instead of a fixed number.
    const resultCount = page.getByText(/\d+ Ergebnisse/);
    const defaultCount = await resultCount.textContent();

    // 2. Click the letter filter button with accessible name 'Filter nach Buchstabe B'
    const letterFilter = page.locator('.c-letter-filter');
    await letterFilter.getByRole('button', { name: 'Filter nach Buchstabe B' }).click();
    await expect(resultCount).not.toHaveText(defaultCount ?? '');
    await expect(page.locator('.c-word-list article a').first()).toHaveAttribute(
      'href',
      /^\/wort\/b/,
    );

    // 3. Click the 'Alle' button in the same alphabet navigation
    await letterFilter.getByRole('button', { name: 'Alle' }).click();
    await expect(resultCount).toHaveText(defaultCount ?? '');
  });

  test('Zurücksetzen-Button setzt aktive Filter zurück', async ({ page }) => {
    const resultCount = page.getByText(/\d+ Ergebnisse/);
    const defaultCount = await resultCount.textContent();

    // 2. Click the letter filter button 'Filter nach Buchstabe B'
    await page.locator('.c-letter-filter').getByRole('button', { name: 'Filter nach Buchstabe B' }).click();
    await expect(resultCount).not.toHaveText(defaultCount ?? '');

    // 3. Click the button named 'Zurücksetzen' in the sidebar
    await page.getByRole('button', { name: 'Zurücksetzen' }).click();
    await expect(resultCount).toHaveText(defaultCount ?? '');
  });

  test('Berolinismus-Checkbox filtert die Wortliste', async ({ page }) => {
    const resultCount = page.getByText(/\d+ Ergebnisse/);
    const defaultCount = await resultCount.textContent();

    // 2. Click the checkbox with accessible name 'Berolinismus' in the sidebar
    const berolinismusCheckbox = page.getByRole('checkbox', { name: 'Berolinismus' });
    await berolinismusCheckbox.click();
    await expect(berolinismusCheckbox).toBeChecked();
    await expect(resultCount).not.toHaveText(defaultCount ?? '');

    // 3. Click the 'Berolinismus' checkbox again
    await berolinismusCheckbox.click();
    await expect(berolinismusCheckbox).not.toBeChecked();
    await expect(resultCount).toHaveText(defaultCount ?? '');
  });
});
