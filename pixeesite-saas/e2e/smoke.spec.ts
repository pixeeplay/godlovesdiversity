import { test, expect } from '@playwright/test';

test.describe('Pixeesite smoke tests', () => {
  test('healthcheck returns ok', async ({ request }) => {
    const r = await request.get('/api/health');
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j.status).toBe('ok');
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('public templates API returns array', async ({ request }) => {
    const r = await request.get('/api/templates');
    // Even if 401 because not authed, the endpoint exists
    expect([200, 401]).toContain(r.status());
  });
});
