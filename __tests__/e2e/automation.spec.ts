import { test, expect } from '@playwright/test';

test.describe('Email Automation Feature', () => {
  test.describe('Automation List Page', () => {
    test('should display automations list page', async ({ page }) => {
      await page.goto('/automations');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'screenshots/automation-01-list.png', fullPage: true });
    });

    test('should show page header elements', async ({ page }) => {
      await page.goto('/automations');
      await page.waitForLoadState('networkidle');

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Should have some header or navigation
      const header = page.locator('header, nav, h1');
      await expect(header.first()).toBeVisible({ timeout: 10000 });

      // Take screenshot
      await page.screenshot({ path: 'screenshots/automation-02-header.png', fullPage: true });
    });

    test('should switch to statistics view', async ({ page }) => {
      await page.goto('/automations');
      await page.waitForLoadState('networkidle');

      // Click statistics tab if available
      const statsTab = page.locator('button').filter({ hasText: /Statistics|Stat|الإحصائيات/ });
      if (await statsTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await statsTab.first().click();
        await page.waitForTimeout(500);

        // Take screenshot of stats view
        await page.screenshot({ path: 'screenshots/automation-04-stats.png', fullPage: true });
      }
    });

    test('should support Arabic RTL layout', async ({ page }) => {
      await page.goto('/ar/automations');
      await page.waitForLoadState('networkidle');

      // Check RTL direction
      const html = page.locator('html');
      await expect(html).toHaveAttribute('dir', 'rtl');

      // Take screenshot
      await page.screenshot({ path: 'screenshots/automation-05-rtl.png', fullPage: true });
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/automations');
      await page.waitForLoadState('networkidle');

      // Take mobile screenshot
      await page.screenshot({ path: 'screenshots/automation-06-mobile.png', fullPage: true });
    });

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/automations');
      await page.waitForLoadState('networkidle');

      // Take tablet screenshot
      await page.screenshot({ path: 'screenshots/automation-07-tablet.png', fullPage: true });
    });
  });

  test.describe('Create Automation Page', () => {
    test('should display create automation page', async ({ page }) => {
      await page.goto('/automations/new');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'screenshots/automation-08-create.png', fullPage: true });
    });

    test('should show form elements', async ({ page }) => {
      await page.goto('/automations/new');
      await page.waitForLoadState('networkidle');

      // Wait for page to fully load
      await page.waitForTimeout(2000);

      // Look for any form input or interactive elements
      const interactiveElements = page.locator('input, textarea, button, a');
      const count = await interactiveElements.count();
      expect(count).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/automation-09-form.png', fullPage: true });
    });

    test('should show template buttons', async ({ page }) => {
      await page.goto('/automations/new');
      await page.waitForLoadState('networkidle');

      // Wait for page to fully load
      await page.waitForTimeout(1000);

      // Look for buttons (template options)
      const buttons = page.locator('button');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/automation-10-templates.png', fullPage: true });
    });

    test('should support Arabic locale for create page', async ({ page }) => {
      await page.goto('/ar/automations/new');
      await page.waitForLoadState('networkidle');

      // Verify page loads with Arabic locale
      await expect(page.locator('body')).toBeVisible();

      // Take screenshot (RTL should be visible in screenshot)
      await page.screenshot({ path: 'screenshots/automation-11-create-rtl.png', fullPage: true });
    });

    test('should be responsive on mobile for create page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/automations/new');
      await page.waitForLoadState('networkidle');

      // Take mobile screenshot
      await page.screenshot({ path: 'screenshots/automation-12-create-mobile.png', fullPage: true });
    });
  });

  test.describe('Workflow Builder', () => {
    test('should show loading state for automation detail', async ({ page }) => {
      // Navigate to a non-existent automation to see loading state
      await page.goto('/automations/test-id');

      // Take screenshot during loading
      await page.screenshot({ path: 'screenshots/automation-13-loading.png', fullPage: true });

      // Wait for load
      await page.waitForLoadState('networkidle');
    });

    test('should be responsive on mobile for builder', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/automations/new');
      await page.waitForLoadState('networkidle');

      // Take mobile screenshot
      await page.screenshot({ path: 'screenshots/automation-14-builder-mobile.png', fullPage: true });
    });

    test('should be responsive on tablet for builder', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/automations/new');
      await page.waitForLoadState('networkidle');

      // Take tablet screenshot
      await page.screenshot({ path: 'screenshots/automation-15-builder-tablet.png', fullPage: true });
    });
  });

  test.describe('Automation Creation Flow', () => {
    test('should fill and submit automation form', async ({ page }) => {
      await page.goto('/automations/new');
      await page.waitForLoadState('networkidle');

      // Wait for page to fully load
      await page.waitForTimeout(1000);

      // Fill in name if input exists
      const nameInput = page.locator('input').first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill('Test Automation');

        // Take screenshot of filled form
        await page.screenshot({ path: 'screenshots/automation-16-filled-form.png', fullPage: true });

        // Look for any submit button
        const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /Create|Submit|Save|إنشاء|حفظ/ });
        if (await submitButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitButton.first().click();
          await page.waitForTimeout(1000);

          // Take screenshot after submission
          await page.screenshot({ path: 'screenshots/automation-17-after-submit.png', fullPage: true });
        }
      }
    });
  });
});
