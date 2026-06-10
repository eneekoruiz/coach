import { expect, test } from '@playwright/test';

test('task counter increments and persists after reload', async ({ page }) => {
  await page.goto('/routines');

  const progress = page.getByTestId('routine-progress-routine-water-1');
  const card = page.getByTestId('routine-item-routine-water-1');

  await expect(progress).toHaveText('0/5');
  await card.click();
  await expect(progress).toHaveText('1/5');

  await page.reload();
  await expect(page.getByTestId('routine-progress-routine-water-1')).toHaveText('1/5');
});
