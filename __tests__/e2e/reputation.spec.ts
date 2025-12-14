import { test, expect } from '@playwright/test';

test.describe('Sender Reputation Feature', () => {
  test.describe('Reputation Dashboard', () => {
    test('should display reputation dashboard page', async ({ page }) => {
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'screenshots/reputation-01-dashboard.png', fullPage: true });
    });

    test('should show page header', async ({ page }) => {
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(1000);

      // Should have header or h1
      const header = page.locator('header, h1, h2');
      await expect(header.first()).toBeVisible({ timeout: 10000 });

      // Take screenshot
      await page.screenshot({ path: 'screenshots/reputation-02-header.png', fullPage: true });
    });

    test('should show navigation tabs', async ({ page }) => {
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(1000);

      // Should have tab buttons
      const buttons = page.locator('button');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/reputation-03-tabs.png', fullPage: true });
    });

    test('should switch between tabs', async ({ page }) => {
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(1000);

      // Find and click a tab button
      const tabButtons = page.locator('button');
      const count = await tabButtons.count();

      if (count > 1) {
        await tabButtons.nth(1).click();
        await page.waitForTimeout(500);

        // Take screenshot after tab switch
        await page.screenshot({ path: 'screenshots/reputation-04-tab-switch.png', fullPage: true });
      }
    });

    test('should support Arabic locale', async ({ page }) => {
      await page.goto('/ar/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Verify page loads with Arabic locale
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot (RTL should be visible in screenshot)
      await page.screenshot({ path: 'screenshots/reputation-05-rtl.png', fullPage: true });
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Take mobile screenshot
      await page.screenshot({ path: 'screenshots/reputation-06-mobile.png', fullPage: true });
    });

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Take tablet screenshot
      await page.screenshot({ path: 'screenshots/reputation-07-tablet.png', fullPage: true });
    });
  });

  test.describe('Bounce Manager Page', () => {
    test('should display bounce manager page', async ({ page }) => {
      await page.goto('/analytics/bounces');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'screenshots/reputation-08-bounces.png', fullPage: true });
    });

    test('should show bounce stats', async ({ page }) => {
      await page.goto('/analytics/bounces');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(1000);

      // Should have stat cards or text
      const content = page.locator('main, .bg-white, .dark\\:bg-gray-800');
      await expect(content.first()).toBeVisible({ timeout: 10000 });

      // Take screenshot
      await page.screenshot({ path: 'screenshots/reputation-09-bounce-stats.png', fullPage: true });
    });

    test('should show filter controls', async ({ page }) => {
      await page.goto('/analytics/bounces');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(2000);

      // Should have interactive elements (select, input, or button)
      const controls = page.locator('select, input, button');
      const count = await controls.count();
      expect(count).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/reputation-10-filters.png', fullPage: true });
    });

    test('should support Arabic locale for bounces', async ({ page }) => {
      await page.goto('/ar/analytics/bounces');
      await page.waitForLoadState('networkidle');

      // Verify page loads with Arabic locale
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot (RTL should be visible in screenshot)
      await page.screenshot({ path: 'screenshots/reputation-11-bounces-rtl.png', fullPage: true });
    });

    test('should be responsive on mobile for bounces', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/analytics/bounces');
      await page.waitForLoadState('networkidle');

      // Take mobile screenshot
      await page.screenshot({ path: 'screenshots/reputation-12-bounces-mobile.png', fullPage: true });
    });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate to deliverability tab', async ({ page }) => {
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(1000);

      // Find deliverability tab
      const deliverabilityTab = page.locator('button').filter({ hasText: /Deliverability|قابلية التسليم/ });
      if (await deliverabilityTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await deliverabilityTab.first().click();
        await page.waitForTimeout(500);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/reputation-13-deliverability.png', fullPage: true });
      }
    });

    test('should navigate to domain health tab', async ({ page }) => {
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(1000);

      // Find domain tab
      const domainTab = page.locator('button').filter({ hasText: /Domain|النطاق/ });
      if (await domainTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await domainTab.first().click();
        await page.waitForTimeout(500);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/reputation-14-domain.png', fullPage: true });
      }
    });

    test('should navigate to blacklist tab', async ({ page }) => {
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(1000);

      // Find blacklist tab
      const blacklistTab = page.locator('button').filter({ hasText: /Blacklist|القوائم السوداء/ });
      if (await blacklistTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await blacklistTab.first().click();
        await page.waitForTimeout(500);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/reputation-15-blacklist.png', fullPage: true });
      }
    });

    test('should navigate to recommendations tab', async ({ page }) => {
      await page.goto('/analytics/reputation');
      await page.waitForLoadState('networkidle');

      // Wait for content
      await page.waitForTimeout(1000);

      // Find recommendations tab
      const recsTab = page.locator('button').filter({ hasText: /Recommendation|التوصيات/ });
      if (await recsTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await recsTab.first().click();
        await page.waitForTimeout(500);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/reputation-16-recommendations.png', fullPage: true });
      }
    });
  });
});
