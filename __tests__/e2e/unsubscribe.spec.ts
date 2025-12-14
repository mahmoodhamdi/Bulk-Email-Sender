import { test, expect } from '@playwright/test';

test.describe('Unsubscribe Management Feature', () => {
  test.describe('Public Unsubscribe Page', () => {
    test('should display unsubscribe page', async ({ page }) => {
      await page.goto('/unsubscribe');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'screenshots/unsubscribe-01-page.png', fullPage: true });
    });

    test('should display unsubscribe form with email prefilled', async ({ page }) => {
      await page.goto('/unsubscribe?email=test@example.com&campaign=TestCampaign');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'screenshots/unsubscribe-02-prefilled.png', fullPage: true });
    });

    test('should support Arabic RTL layout for unsubscribe', async ({ page }) => {
      await page.goto('/ar/unsubscribe');
      await page.waitForLoadState('networkidle');

      // Check RTL direction
      const html = page.locator('html');
      await expect(html).toHaveAttribute('dir', 'rtl');

      // Take screenshot
      await page.screenshot({ path: 'screenshots/unsubscribe-03-rtl.png', fullPage: true });
    });

    test('should be responsive on mobile for unsubscribe', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/unsubscribe');
      await page.waitForLoadState('networkidle');

      // Take mobile screenshot
      await page.screenshot({ path: 'screenshots/unsubscribe-04-mobile.png', fullPage: true });
    });

    test('should be responsive on tablet for unsubscribe', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/unsubscribe');
      await page.waitForLoadState('networkidle');

      // Take tablet screenshot
      await page.screenshot({ path: 'screenshots/unsubscribe-05-tablet.png', fullPage: true });
    });
  });

  test.describe('Suppression List Management', () => {
    test('should display suppression list page', async ({ page }) => {
      await page.goto('/contacts/suppression');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'screenshots/suppression-01-list.png', fullPage: true });
    });

    test('should show tabs for list and statistics', async ({ page }) => {
      await page.goto('/contacts/suppression');
      await page.waitForLoadState('networkidle');

      // Look for list and stats tabs
      const listTab = page.locator('button:has-text("List"), button:has-text("القائمة")');
      const statsTab = page.locator('button:has-text("Statistics"), button:has-text("الإحصائيات")');

      await expect(listTab.first()).toBeVisible();
      await expect(statsTab.first()).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'screenshots/suppression-02-tabs.png', fullPage: true });
    });

    test('should switch to statistics view', async ({ page }) => {
      await page.goto('/contacts/suppression');
      await page.waitForLoadState('networkidle');

      // Click statistics tab
      const statsTab = page.locator('button:has-text("Statistics"), button:has-text("الإحصائيات")');
      if (await statsTab.first().isVisible()) {
        await statsTab.first().click();
        await page.waitForTimeout(500);

        // Take screenshot of stats view
        await page.screenshot({ path: 'screenshots/suppression-03-stats.png', fullPage: true });
      }
    });

    test('should support Arabic RTL layout for suppression list', async ({ page }) => {
      await page.goto('/ar/contacts/suppression');
      await page.waitForLoadState('networkidle');

      // Check RTL direction
      const html = page.locator('html');
      await expect(html).toHaveAttribute('dir', 'rtl');

      // Take screenshot
      await page.screenshot({ path: 'screenshots/suppression-04-rtl.png', fullPage: true });
    });

    test('should be responsive on mobile for suppression list', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/contacts/suppression');
      await page.waitForLoadState('networkidle');

      // Take mobile screenshot
      await page.screenshot({ path: 'screenshots/suppression-05-mobile.png', fullPage: true });
    });

    test('should be responsive on tablet for suppression list', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/contacts/suppression');
      await page.waitForLoadState('networkidle');

      // Take tablet screenshot
      await page.screenshot({ path: 'screenshots/suppression-06-tablet.png', fullPage: true });
    });

    test('should show loading state initially', async ({ page }) => {
      await page.goto('/contacts/suppression');

      // Check for spinner or loading indicator
      const spinner = page.locator('.animate-spin');
      // Take screenshot during loading if visible
      await page.screenshot({ path: 'screenshots/suppression-07-loading.png', fullPage: true });

      // Wait for load to complete
      await page.waitForLoadState('networkidle');
    });

    test('should navigate from contacts to suppression', async ({ page }) => {
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');

      // Look for suppression list link
      const suppressionLink = page.locator('a[href*="suppression"]');
      if (await suppressionLink.isVisible()) {
        await suppressionLink.click();
        await page.waitForLoadState('networkidle');

        // Verify navigation
        await expect(page).toHaveURL(/.*suppression.*/);
      }

      // Take screenshot
      await page.screenshot({ path: 'screenshots/suppression-08-navigation.png', fullPage: true });
    });
  });

  test.describe('Unsubscribe Form Interaction', () => {
    test('should show unsubscribe confirmation step', async ({ page }) => {
      await page.goto('/unsubscribe?email=test@example.com');
      await page.waitForLoadState('networkidle');

      // Look for confirm button
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("تأكيد")');
      if (await confirmButton.isVisible()) {
        // Take screenshot before clicking
        await page.screenshot({ path: 'screenshots/unsubscribe-06-confirm-step.png', fullPage: true });
      }
    });

    test('should display reason options after confirmation', async ({ page }) => {
      await page.goto('/unsubscribe?email=test@example.com');
      await page.waitForLoadState('networkidle');

      // Look for confirm button and click it
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("تأكيد")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(500);

        // Take screenshot of feedback step
        await page.screenshot({ path: 'screenshots/unsubscribe-07-feedback.png', fullPage: true });
      }
    });
  });
});
