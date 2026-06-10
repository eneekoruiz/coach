import { expect, test } from '@playwright/test';

test('AI generate today creates a visible menu structure', async ({ page }) => {
  await page.goto('/nutrition');

  await page.getByTestId('generate-today-ai').click();

  await expect(page.getByTestId('today-meal-desayuno')).toBeVisible();
  await expect(page.getByTestId('today-meal-comida')).toBeVisible();
  await expect(page.getByTestId('today-meal-cena')).toBeVisible();
});
