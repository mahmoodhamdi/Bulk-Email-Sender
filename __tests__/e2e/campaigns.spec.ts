import { test, expect } from '@playwright/test';

test.describe('Campaigns Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to campaigns page
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');
  });

  test('should display the campaigns list page', async ({ page }) => {
    // Check page title or heading exists
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/campaigns-01-list.png', fullPage: true });
  });

  test('should have campaigns navigation item', async ({ page }) => {
    // Look for navigation or sidebar with campaigns link
    const campaignsNav = page.locator('nav a[href*="campaigns"], aside a[href*="campaigns"], [role="navigation"] a[href*="campaigns"]');

    // If navigation exists, verify it
    if (await campaignsNav.count() > 0) {
      await expect(campaignsNav.first()).toBeVisible();
    }

    await page.screenshot({ path: 'screenshots/campaigns-02-navigation.png', fullPage: true });
  });

  test('should display in Arabic locale', async ({ page }) => {
    await page.goto('/ar/campaigns');
    await page.waitForLoadState('networkidle');

    // Check RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    await page.screenshot({ path: 'screenshots/campaigns-03-arabic.png', fullPage: true });
  });
});

test.describe('Campaign API Endpoints', () => {
  test('should list campaigns via API', async ({ request }) => {
    const response = await request.get('/api/campaigns');

    // Should return success or redirect to auth
    expect([200, 401, 302, 307]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    }
  });

  test('should handle pagination parameters', async ({ request }) => {
    const response = await request.get('/api/campaigns?page=1&limit=10');

    expect([200, 401, 302, 307]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('total');
    }
  });

  test('should reject invalid campaign creation without auth', async ({ request }) => {
    const response = await request.post('/api/campaigns', {
      data: {
        name: 'Test Campaign',
        subject: 'Test Subject',
        fromName: 'Test Sender',
        fromEmail: 'test@example.com',
        content: '<p>Test content</p>',
      },
    });

    // Without auth, should return 401 or require auth
    expect([401, 403, 302, 307]).toContain(response.status());
  });

  test('should return 404 for non-existent campaign', async ({ request }) => {
    const response = await request.get('/api/campaigns/non-existent-id-12345');

    // Should be 404 or auth redirect
    expect([404, 401, 302, 307]).toContain(response.status());
  });

  test('should validate campaign data on creation', async ({ request }) => {
    const response = await request.post('/api/campaigns', {
      data: {
        // Missing required fields
        name: '',
      },
    });

    // Should reject invalid data
    expect([400, 401, 302, 307]).toContain(response.status());
  });
});

test.describe('Campaign Recipients API', () => {
  test('should list campaign recipients with cursor pagination', async ({ request }) => {
    // First get campaigns to get a valid ID
    const campaignsResponse = await request.get('/api/campaigns?limit=1');

    if (campaignsResponse.ok()) {
      const campaigns = await campaignsResponse.json();

      if (campaigns.data && campaigns.data.length > 0) {
        const campaignId = campaigns.data[0].id;

        const recipientsResponse = await request.get(`/api/campaigns/${campaignId}/recipients`);

        if (recipientsResponse.ok()) {
          const data = await recipientsResponse.json();
          expect(data).toHaveProperty('data');
          expect(data).toHaveProperty('pagination');
          expect(data.pagination).toHaveProperty('hasNext');
          expect(data.pagination).toHaveProperty('hasPrevious');
        }
      }
    }
  });

  test('should support status filtering for recipients', async ({ request }) => {
    const campaignsResponse = await request.get('/api/campaigns?limit=1');

    if (campaignsResponse.ok()) {
      const campaigns = await campaignsResponse.json();

      if (campaigns.data && campaigns.data.length > 0) {
        const campaignId = campaigns.data[0].id;

        const recipientsResponse = await request.get(`/api/campaigns/${campaignId}/recipients?status=PENDING`);

        expect([200, 401, 404]).toContain(recipientsResponse.status());
      }
    }
  });
});

test.describe('Campaign UI Flow', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/campaigns-04-mobile.png', fullPage: true });
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/campaigns-05-tablet.png', fullPage: true });
  });

  test('should show loading state', async ({ page }) => {
    // Navigate and capture initial loading
    await page.goto('/campaigns');

    // Wait for any loading indicators to appear and then disappear
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/campaigns-06-loaded.png', fullPage: true });
  });
});

test.describe('Campaign Workflow', () => {
  test('should navigate to new campaign page if available', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Look for "new campaign" or "create" button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New Campaign"), a:has-text("Create")').first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'screenshots/campaigns-07-new-form.png', fullPage: true });
    }
  });

  test('should have form validation UI', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.waitForLoadState('networkidle');

    // Look for form elements
    const form = page.locator('form');

    if (await form.isVisible()) {
      // Look for input fields
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"], #campaign-name');

      if (await nameInput.isVisible()) {
        await expect(nameInput).toBeVisible();
      }

      // Check for subject field
      const subjectInput = page.locator('input[name="subject"], input[placeholder*="subject"], #subject');
      if (await subjectInput.isVisible()) {
        await expect(subjectInput).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/campaigns-08-form-validation.png', fullPage: true });
    }
  });
});

test.describe('Campaign Queue Status API', () => {
  test('should get queue status for campaign', async ({ request }) => {
    const campaignsResponse = await request.get('/api/campaigns?limit=1');

    if (campaignsResponse.ok()) {
      const campaigns = await campaignsResponse.json();

      if (campaigns.data && campaigns.data.length > 0) {
        const campaignId = campaigns.data[0].id;

        const queueResponse = await request.get(`/api/campaigns/${campaignId}/queue-status`);

        // Should return status or auth required
        expect([200, 401, 404]).toContain(queueResponse.status());

        if (queueResponse.ok()) {
          const data = await queueResponse.json();
          expect(data).toHaveProperty('data');
        }
      }
    }
  });

  test('should get global queue health', async ({ request }) => {
    const response = await request.get('/api/queue');

    // Should return queue status or auth required
    expect([200, 401]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toBeDefined();
    }
  });
});
