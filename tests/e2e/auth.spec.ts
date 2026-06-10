import { expect, test } from '@playwright/test';

test('signup mock flow redirects into the app shell', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('test@example.com');
  await page.getByTestId('login-password').fill('supersecret');
  await page.getByTestId('signup-submit').click();

  await expect(page).toHaveURL(/e2e_auth=signup/);
});

test('login mock flow redirects into the app shell', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('test@example.com');
  await page.getByTestId('login-password').fill('supersecret');
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/e2e_auth=login/);
});
