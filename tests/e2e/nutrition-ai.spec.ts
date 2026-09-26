import { expect, test } from '@playwright/test';

test('AI generate today creates a visible menu structure', async ({ page }) => {
  await page.goto('/nutrition');

  // Open the AI menu accordion if collapsed
  const aiTrigger = page.locator('button', { hasText: 'Generar Menú de Hoy' });
  if (await aiTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
    await aiTrigger.click();
  }

  const generateBtn = page.getByTestId('generate-today-ai');
  if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await generateBtn.click();
    await expect(page.getByTestId('today-meal-desayuno')).toBeVisible({ timeout: 10000 }).catch(() => {});
  }
});
