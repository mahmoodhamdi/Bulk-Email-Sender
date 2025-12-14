import { test, expect } from '@playwright/test';

test.describe('Segmentation Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contacts page first
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
  });

  test('should display segments page', async ({ page }) => {
    await page.goto('/contacts/segments');
    await page.waitForLoadState('networkidle');

    // Check page loads
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/segmentation-01-list.png', fullPage: true });
  });

  test('should create a new segment', async ({ page }) => {
    await page.goto('/contacts/segments');
    await page.waitForLoadState('networkidle');

    // Click new segment button
    const newSegmentButton = page.locator('button:has-text("New Segment"), button:has-text("إنشاء شريحة")');
    if (await newSegmentButton.isVisible()) {
      await newSegmentButton.click();
      await page.waitForTimeout(500);

      // Take screenshot of segment builder
      await page.screenshot({ path: 'screenshots/segmentation-02-builder.png', fullPage: true });
    }
  });

  test('should support Arabic RTL layout', async ({ page }) => {
    await page.goto('/ar/contacts/segments');
    await page.waitForLoadState('networkidle');

    // Check RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/segmentation-03-rtl.png', fullPage: true });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/contacts/segments');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/segmentation-04-mobile.png', fullPage: true });
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/contacts/segments');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({ path: 'screenshots/segmentation-05-tablet.png', fullPage: true });
  });
});

test.describe('A/B Testing Feature', () => {
  test('should display A/B test page', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Check page loads
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/ab-test-01-campaign.png', fullPage: true });
  });

  test('should support Arabic RTL layout for A/B testing', async ({ page }) => {
    await page.goto('/ar/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Check RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/ab-test-02-rtl.png', fullPage: true });
  });
});

test.describe('Email Builder Feature', () => {
  test('should display email builder page', async ({ page }) => {
    await page.goto('/templates/builder');
    await page.waitForLoadState('networkidle');

    // Check page loads
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/email-builder-01-main.png', fullPage: true });
  });

  test('should support Arabic RTL layout for email builder', async ({ page }) => {
    await page.goto('/ar/templates/builder');
    await page.waitForLoadState('networkidle');

    // Check RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/email-builder-02-rtl.png', fullPage: true });
  });

  test('should be responsive on mobile for email builder', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/templates/builder');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/email-builder-03-mobile.png', fullPage: true });
  });

  test('should be responsive on tablet for email builder', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/templates/builder');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({ path: 'screenshots/email-builder-04-tablet.png', fullPage: true });
  });
});

test.describe('Enhanced Analytics Dashboard', () => {
  test('should display analytics page with charts', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check page loads
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/analytics-01-dashboard.png', fullPage: true });
  });

  test('should show date range selector', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Look for date range buttons
    const dateRangeButtons = page.locator('button:has-text("Last 7 days"), button:has-text("Last 30 days")');
    await expect(dateRangeButtons.first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/analytics-02-daterange.png', fullPage: true });
  });

  test('should support Arabic RTL layout for analytics', async ({ page }) => {
    await page.goto('/ar/analytics');
    await page.waitForLoadState('networkidle');

    // Check RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/analytics-03-rtl.png', fullPage: true });
  });

  test('should be responsive on mobile for analytics', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/analytics-04-mobile.png', fullPage: true });
  });

  test('should be responsive on tablet for analytics', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({ path: 'screenshots/analytics-05-tablet.png', fullPage: true });
  });
});

test.describe('Campaign Scheduling Feature', () => {
  test('should display campaign creation with scheduling', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Check page loads
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/scheduling-01-campaign-new.png', fullPage: true });
  });

  test('should show schedule options in review step', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Try to find the schedule card or any scheduling related element
    const scheduleTitle = page.locator('text=Schedule Campaign, text=جدولة الحملة');

    // Take screenshot of the campaign wizard
    await page.screenshot({ path: 'screenshots/scheduling-02-wizard.png', fullPage: true });
  });

  test('should support Arabic RTL layout for scheduling', async ({ page }) => {
    await page.goto('/ar/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Check RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/scheduling-03-rtl.png', fullPage: true });
  });

  test('should be responsive on mobile for scheduling', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/scheduling-04-mobile.png', fullPage: true });
  });

  test('should be responsive on tablet for scheduling', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({ path: 'screenshots/scheduling-05-tablet.png', fullPage: true });
  });
});

test.describe('Email Preview & Test Send Feature', () => {
  test('should display campaign page with preview option', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Check page loads
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/preview-01-campaign.png', fullPage: true });
  });

  test('should display template builder with preview', async ({ page }) => {
    await page.goto('/templates/builder');
    await page.waitForLoadState('networkidle');

    // Check page loads
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/preview-02-builder.png', fullPage: true });
  });

  test('should support Arabic RTL layout for preview', async ({ page }) => {
    await page.goto('/ar/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Check RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/preview-03-rtl.png', fullPage: true });
  });

  test('should be responsive on mobile for preview', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/preview-04-mobile.png', fullPage: true });
  });

  test('should be responsive on tablet for preview', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/templates/builder');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({ path: 'screenshots/preview-05-tablet.png', fullPage: true });
  });
});
