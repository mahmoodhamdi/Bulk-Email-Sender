import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the dashboard', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for dashboard elements
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/01-dashboard-en.png', fullPage: true });
  });

  test('should display in Arabic when locale is ar', async ({ page }) => {
    await page.goto('/ar');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/02-dashboard-ar.png', fullPage: true });
  });

  test('should have health endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});

test.describe('Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/03-mobile.png', fullPage: true });
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({ path: 'screenshots/04-tablet.png', fullPage: true });
  });
});
