// @ts-check
import { test, expect } from '@playwright/test';

test('dashboard page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Dashboard');
  await page.screenshot({ path: '/home/jules/verification/dashboard.png', fullPage: true });
});
