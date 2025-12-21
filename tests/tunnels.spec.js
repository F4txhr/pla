// @ts-check
import { test, expect } from '@playwright/test';

test('tunnels page', async ({ page }) => {
  await page.goto('/tunnels');
  await expect(page.locator('h1')).toContainText('Tunnels');
  await page.screenshot({ path: '/home/jules/verification/tunnels.png', fullPage: true });
});
