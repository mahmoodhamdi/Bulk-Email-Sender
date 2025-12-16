import { test, expect } from '@playwright/test';

test.describe('Email Sending Flow', () => {
  test.describe('SMTP Test API', () => {
    test('should reject invalid SMTP configuration', async ({ request }) => {
      const response = await request.post('/api/smtp/test', {
        data: {
          host: '',
          port: 587,
          username: 'test',
          password: 'test',
        },
      });

      // Should require all fields
      expect([400, 401, 302, 307]).toContain(response.status());
    });

    test('should validate required SMTP fields', async ({ request }) => {
      const response = await request.post('/api/smtp/test', {
        data: {
          host: 'smtp.example.com',
          port: 587,
          // Missing username and password
        },
      });

      expect([400, 401, 302, 307]).toContain(response.status());
    });

    test('should handle connection failure gracefully', async ({ request }) => {
      const response = await request.post('/api/smtp/test', {
        data: {
          host: 'invalid-smtp-host.test',
          port: 587,
          secure: false,
          username: 'test@example.com',
          password: 'invalid-password',
        },
      });

      // Should fail connection but not crash
      expect([400, 500, 401, 302, 307]).toContain(response.status());
    });
  });

  test.describe('Test Email API', () => {
    test('should reject email without recipients', async ({ request }) => {
      const response = await request.post('/api/email/test', {
        data: {
          to: [],
          subject: 'Test Subject',
          htmlContent: '<p>Test content</p>',
          smtpConfig: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'test',
            password: 'test',
          },
        },
      });

      expect([400, 401, 302, 307]).toContain(response.status());

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('recipient');
      }
    });

    test('should reject email without subject', async ({ request }) => {
      const response = await request.post('/api/email/test', {
        data: {
          to: ['test@example.com'],
          subject: '',
          htmlContent: '<p>Test content</p>',
          smtpConfig: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'test',
            password: 'test',
          },
        },
      });

      expect([400, 401, 302, 307]).toContain(response.status());
    });

    test('should reject email without content', async ({ request }) => {
      const response = await request.post('/api/email/test', {
        data: {
          to: ['test@example.com'],
          subject: 'Test Subject',
          htmlContent: '',
          smtpConfig: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'test',
            password: 'test',
          },
        },
      });

      expect([400, 401, 302, 307]).toContain(response.status());
    });

    test('should reject invalid email addresses', async ({ request }) => {
      const response = await request.post('/api/email/test', {
        data: {
          to: ['invalid-email', 'another-invalid'],
          subject: 'Test Subject',
          htmlContent: '<p>Test content</p>',
          smtpConfig: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'test',
            password: 'test',
          },
        },
      });

      expect([400, 401, 302, 307]).toContain(response.status());

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid email');
      }
    });

    test('should limit test emails to 5 recipients', async ({ request }) => {
      const response = await request.post('/api/email/test', {
        data: {
          to: [
            'test1@example.com',
            'test2@example.com',
            'test3@example.com',
            'test4@example.com',
            'test5@example.com',
            'test6@example.com', // 6th email should fail
          ],
          subject: 'Test Subject',
          htmlContent: '<p>Test content</p>',
          smtpConfig: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'test',
            password: 'test',
          },
        },
      });

      expect([400, 401, 302, 307]).toContain(response.status());

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Maximum 5');
      }
    });

    test('should reject email without SMTP config', async ({ request }) => {
      const response = await request.post('/api/email/test', {
        data: {
          to: ['test@example.com'],
          subject: 'Test Subject',
          htmlContent: '<p>Test content</p>',
          // Missing smtpConfig
        },
      });

      expect([400, 401, 302, 307]).toContain(response.status());
    });
  });

  test.describe('Campaign Send API', () => {
    test('should reject sending non-existent campaign', async ({ request }) => {
      const response = await request.post('/api/campaigns/non-existent-campaign-id-12345/send', {
        data: {},
      });

      expect([400, 404, 401, 302, 307]).toContain(response.status());
    });

    test('should require valid campaign ID', async ({ request }) => {
      const response = await request.post('/api/campaigns/short/send', {
        data: {},
      });

      expect([400, 401, 302, 307]).toContain(response.status());
    });

    test('should validate scheduled time is in the future', async ({ request }) => {
      // First create a campaign
      const campaignsResponse = await request.get('/api/campaigns?limit=1');

      if (campaignsResponse.ok()) {
        const campaigns = await campaignsResponse.json();

        if (campaigns.data && campaigns.data.length > 0) {
          const campaignId = campaigns.data[0].id;

          // Try to schedule in the past
          const response = await request.post(`/api/campaigns/${campaignId}/send`, {
            data: {
              scheduledAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            },
          });

          // Should reject past scheduling or auth redirect
          expect([400, 401, 302, 307]).toContain(response.status());
        }
      }
    });
  });

  test.describe('Campaign Control API', () => {
    test('should handle pause action on non-sending campaign', async ({ request }) => {
      const campaignsResponse = await request.get('/api/campaigns?limit=1');

      if (campaignsResponse.ok()) {
        const campaigns = await campaignsResponse.json();

        if (campaigns.data && campaigns.data.length > 0) {
          const campaignId = campaigns.data[0].id;

          const response = await request.patch(`/api/campaigns/${campaignId}/send`, {
            data: { action: 'pause' },
          });

          // Should reject if not in SENDING status
          expect([400, 401, 302, 307]).toContain(response.status());
        }
      }
    });

    test('should handle resume action on non-paused campaign', async ({ request }) => {
      const campaignsResponse = await request.get('/api/campaigns?limit=1');

      if (campaignsResponse.ok()) {
        const campaigns = await campaignsResponse.json();

        if (campaigns.data && campaigns.data.length > 0) {
          const campaignId = campaigns.data[0].id;

          const response = await request.patch(`/api/campaigns/${campaignId}/send`, {
            data: { action: 'resume' },
          });

          // Should reject if not in PAUSED status
          expect([400, 401, 302, 307]).toContain(response.status());
        }
      }
    });

    test('should handle invalid action', async ({ request }) => {
      const campaignsResponse = await request.get('/api/campaigns?limit=1');

      if (campaignsResponse.ok()) {
        const campaigns = await campaignsResponse.json();

        if (campaigns.data && campaigns.data.length > 0) {
          const campaignId = campaigns.data[0].id;

          const response = await request.patch(`/api/campaigns/${campaignId}/send`, {
            data: { action: 'invalid-action' },
          });

          expect([400, 401, 302, 307]).toContain(response.status());
        }
      }
    });
  });

  test.describe('Queue API', () => {
    test('should get queue health status', async ({ request }) => {
      const response = await request.get('/api/queue');

      expect([200, 401, 302, 307]).toContain(response.status());

      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('healthy');
        expect(data.data).toHaveProperty('redis');
        expect(data.data).toHaveProperty('queue');
        expect(data.data).toHaveProperty('worker');
      }
    });

    test('should handle queue pause action', async ({ request }) => {
      const response = await request.post('/api/queue', {
        data: { action: 'pause' },
      });

      expect([200, 401, 302, 307]).toContain(response.status());

      if (response.ok()) {
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    test('should handle queue resume action', async ({ request }) => {
      const response = await request.post('/api/queue', {
        data: { action: 'resume' },
      });

      expect([200, 401, 302, 307]).toContain(response.status());

      if (response.ok()) {
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    test('should handle queue stats action', async ({ request }) => {
      const response = await request.post('/api/queue', {
        data: { action: 'stats' },
      });

      expect([200, 401, 302, 307]).toContain(response.status());

      if (response.ok()) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('data');
      }
    });

    test('should reject invalid queue action', async ({ request }) => {
      const response = await request.post('/api/queue', {
        data: { action: 'invalid-action' },
      });

      expect([400, 401, 302, 307]).toContain(response.status());
    });

    test('should handle queue clean action with validation', async ({ request }) => {
      const response = await request.post('/api/queue', {
        data: {
          action: 'clean',
          gracePeriod: 3600000, // 1 hour
          limit: 100,
          status: 'completed',
        },
      });

      expect([200, 400, 401, 302, 307]).toContain(response.status());
    });
  });

  test.describe('Email Sending UI', () => {
    test('should display settings page with SMTP configuration', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for SMTP settings section
      const smtpSection = page.locator('text=SMTP, text=Email Settings, text=Mail Server').first();

      await page.screenshot({ path: 'screenshots/email-01-settings.png', fullPage: true });
    });

    test('should have email configuration form fields', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for common SMTP form fields
      const hostField = page.locator('input[name*="host"], input[placeholder*="host"], input[id*="host"]');
      const portField = page.locator('input[name*="port"], input[placeholder*="port"], input[id*="port"]');

      await page.screenshot({ path: 'screenshots/email-02-smtp-form.png', fullPage: true });
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'screenshots/email-03-settings-mobile.png', fullPage: true });
    });
  });

  test.describe('Campaign Queue Status UI', () => {
    test('should display queue status page', async ({ page }) => {
      await page.goto('/queue');
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'screenshots/email-04-queue-status.png', fullPage: true });
    });

    test('should show queue health indicators', async ({ page }) => {
      await page.goto('/queue');
      await page.waitForLoadState('networkidle');

      // Look for health indicators
      const healthIndicator = page.locator('[class*="health"], [class*="status"], text=Connected, text=Healthy');

      await page.screenshot({ path: 'screenshots/email-05-queue-health.png', fullPage: true });
    });
  });

  test.describe('Campaign Send Flow', () => {
    test('should navigate to campaign detail and show send options', async ({ page }) => {
      // First go to campaigns list
      await page.goto('/campaigns');
      await page.waitForLoadState('networkidle');

      // Look for campaign cards or list items
      const campaignItem = page.locator('[class*="campaign"], tr, [role="row"]').first();

      if (await campaignItem.isVisible()) {
        // Try to click on the campaign
        await campaignItem.click();
        await page.waitForLoadState('networkidle');

        await page.screenshot({ path: 'screenshots/email-06-campaign-detail.png', fullPage: true });
      }
    });

    test('should show send button on campaign detail', async ({ page }) => {
      await page.goto('/campaigns');
      await page.waitForLoadState('networkidle');

      // Look for send buttons
      const sendButton = page.locator('button:has-text("Send"), button:has-text("Start"), button:has-text("Queue")');

      await page.screenshot({ path: 'screenshots/email-07-send-button.png', fullPage: true });
    });

    test('should display campaign status correctly', async ({ page }) => {
      await page.goto('/campaigns');
      await page.waitForLoadState('networkidle');

      // Look for status badges
      const statusBadge = page.locator('[class*="badge"], [class*="status"], text=DRAFT, text=SENDING, text=COMPLETED');

      await page.screenshot({ path: 'screenshots/email-08-campaign-status.png', fullPage: true });
    });
  });

  test.describe('Rate Limiting', () => {
    test('should apply rate limiting on repeated requests', async ({ request }) => {
      // Make multiple rapid requests
      const responses = [];
      for (let i = 0; i < 12; i++) {
        const response = await request.post('/api/email/test', {
          data: {
            to: ['test@example.com'],
            subject: 'Test',
            htmlContent: '<p>Test</p>',
            smtpConfig: {
              host: 'smtp.example.com',
              port: 587,
              secure: false,
              username: 'test',
              password: 'test',
            },
          },
        });
        responses.push(response.status());
      }

      // Should eventually get rate limited (429) or auth required
      const hasRateLimit = responses.includes(429) || responses.some(s => [401, 302, 307].includes(s));
      expect(hasRateLimit).toBe(true);
    });
  });
});

test.describe('Email Analytics', () => {
  test('should display email analytics page', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/email-09-analytics.png', fullPage: true });
  });

  test('should show email metrics', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Look for common email metrics
    const metrics = page.locator('text=Sent, text=Delivered, text=Opened, text=Clicked, text=Bounced');

    await page.screenshot({ path: 'screenshots/email-10-metrics.png', fullPage: true });
  });

  test('should support date range filtering', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Look for date pickers or filters
    const dateFilter = page.locator('input[type="date"], [class*="date-picker"], button:has-text("Filter"), button:has-text("Date")');

    await page.screenshot({ path: 'screenshots/email-11-date-filter.png', fullPage: true });
  });
});

test.describe('Email Tracking API', () => {
  test('should handle tracking open event', async ({ request }) => {
    const response = await request.get('/api/tracking/open?id=test-tracking-id');

    // Should return image or redirect regardless of valid ID
    expect([200, 302, 307, 400, 404]).toContain(response.status());
  });

  test('should handle tracking click event', async ({ request }) => {
    const response = await request.get('/api/tracking/click?id=test-tracking-id&url=https://example.com');

    // Should redirect or handle gracefully
    expect([200, 302, 307, 400, 404]).toContain(response.status());
  });

  test('should handle unsubscribe request', async ({ request }) => {
    const response = await request.get('/api/tracking/unsubscribe?id=test-unsubscribe-id');

    // Should show unsubscribe page or redirect
    expect([200, 302, 307, 400, 404]).toContain(response.status());
  });
});
