import { chromium } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'http://localhost:3011';
const OUT = join(process.cwd(), 'screenshots');
const VIDEO_DIR = join(process.cwd(), 'videos');

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
};

async function captureAt(viewport, name, route, wait = 1500) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport, locale: 'en-US' });
  const page = await context.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(wait);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  console.log(`Captured ${name}.png (${viewport.width}x${viewport.height})`);
  await browser.close();
}

async function recordWalkthrough() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORTS.desktop, locale: 'en-US',
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORTS.desktop },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  const tour = [
    '/en/campaigns',
    '/en/campaigns/new',
    '/en/contacts',
    '/en/contacts/segments',
    '/en/templates',
    '/en/templates/builder',
    '/en/automations',
    '/en/analytics',
    '/en/analytics/bounces',
    '/en/analytics/reputation',
    '/en/billing',
    '/en/settings',
  ];
  for (const path of tour) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(10500);
  }
  await page.close();
  await context.close();
  await browser.close();
  console.log('Walkthrough recorded.');
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });

  await captureAt(VIEWPORTS.desktop, 'desktop-01-dashboard', '/en');
  await captureAt(VIEWPORTS.desktop, 'desktop-02-campaigns', '/en/campaigns');
  await captureAt(VIEWPORTS.desktop, 'desktop-03-templates-builder', '/en/templates/builder');

  await captureAt(VIEWPORTS.tablet, 'tablet-01-contacts', '/en/contacts');
  await captureAt(VIEWPORTS.tablet, 'tablet-02-analytics', '/en/analytics');

  await captureAt(VIEWPORTS.mobile, 'mobile-01-dashboard', '/en');
  await captureAt(VIEWPORTS.mobile, 'mobile-02-campaigns', '/en/campaigns');
  await captureAt(VIEWPORTS.mobile, 'mobile-03-billing', '/en/billing');

  await recordWalkthrough();
}

main().catch((err) => { console.error(err); process.exit(1); });
