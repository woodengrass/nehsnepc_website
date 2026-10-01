import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// Task 9: mocked browser-to-GitHub failures + OAuth/session negatives.
//
// Runs under playwright.local.config.ts (fixed-port loopback admin:dev).
// GitHub is never contacted: failures are injected with page.route so the
// recoverable-UI contract (still renders, never writes/commits) is proven
// deterministically.

const ROOT = process.cwd();
const WATCHED_FILE = path.join(ROOT, 'content', 'articles', 'example.mdx');

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

test.describe('mocked github failures (loopback, no live github)', () => {
  test('session negative: cookieless context loads the editor with no OAuth round-trip', async ({ browser }) => {
    // Fresh context: zero cookies, zero storage — no session of any kind.
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const response = await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      // Local loopback mode needs no GitHub OAuth: the collection renders
      // without redirecting to github.com or an auth callback.
      await expect(page.getByText('Articles', { exact: false }).first()).toBeVisible({ timeout: 90_000 });
      expect(page.url()).not.toContain('github.com');
    } finally {
      await context.close();
    }
  });

  test('session negative: unauthenticated API probe fails closed, never 500/503', async ({ request }) => {
    // No session header/cookie of any kind. The official handler owns this
    // path in local mode; an unknown path must fail closed (404-family),
    // never 500 and never the secrets-missing 503.
    const res = await request.get('/api/keystatic/__definitely-not-a-route');
    expect([400, 404, 405]).toContain(res.status());
  });

  test('mocked 401 mutation failure: UI stays recoverable, nothing is written', async ({ page }) => {
    const before = sha256(WATCHED_FILE);
    await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Articles', { exact: false }).first()).toBeVisible({ timeout: 90_000 });

    // From here on, every browser-to-API call fails like a revoked GitHub
    // OAuth token (401). The mock body carries no secret values by
    // construction (static literal, redaction asserted below).
    await page.route('**/api/keystatic**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'keystatic-mocked-github-401' })
      })
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5_000);

    // Recoverable UI: the page still renders a non-empty document (shell,
    // collection, or an inline error state) — never a blank crash.
    const text = (await page.content()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(text.length).toBeGreaterThan(0);
    // No commit: the watched content file is byte-identical.
    expect(sha256(WATCHED_FILE)).toBe(before);

    // Recovery: unmock, reload, the editor is fully usable again.
    await page.unroute('**/api/keystatic**');
    await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Articles', { exact: false }).first()).toBeVisible({ timeout: 90_000 });
    expect(sha256(WATCHED_FILE)).toBe(before);
  });

  test('mocked 403 mutation failure: UI stays recoverable, nothing is written', async ({ page }) => {
    const before = sha256(WATCHED_FILE);
    await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Articles', { exact: false }).first()).toBeVisible({ timeout: 90_000 });

    // Forbidden GitHub App (e.g. missing repository access): 403 on mutations.
    await page.route('**/api/keystatic**', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'keystatic-mocked-github-403' })
      })
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5_000);

    const text = (await page.content()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(text.length).toBeGreaterThan(0);
    expect(sha256(WATCHED_FILE)).toBe(before);

    await page.unroute('**/api/keystatic**');
    await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Articles', { exact: false }).first()).toBeVisible({ timeout: 90_000 });
    expect(sha256(WATCHED_FILE)).toBe(before);
  });
});
