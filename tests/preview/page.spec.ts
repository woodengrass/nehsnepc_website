/**
 * `/preview` browser gate (ADR-0006).
 *
 * QUOTA CONTRACT: unauthenticated `api.github.com` allows 60 req/hr per
 * origin IP. Dozens of local runs exhaust it, and then EVERY live assertion
 * fails with the rate-limit message instead of its expected text (proven
 * 2026-10-01: the 404 test received "已達 GitHub 未登入讀取配額…" instead of
 * "找不到"). So exactly ONE test in this file is live (the desktop
 * happy-path, marked LIVE below); every other test stubs its GitHub traffic
 * with `page.route` and asserts the exact honest zh-TW UI. If the LIVE test
 * fails with the quota message, the app is fine — wait for the hourly reset
 * and re-run; do NOT "fix" it by weakening assertions.
 *
 * The desktop LIVE test fetches the real committed `example` article from
 * the public GitHub repo (branch `main`) and asserts the client renderer
 * produces the production structure: title, heading order,
 * Callout/Figure/Model3D presence, cover, noindex, and the
 * saved-commits-only honesty note. Error states (missing slug, stalled
 * connection, malformed slug) are asserted in Traditional Chinese.
 */
import { expect, test, type Page } from '@playwright/test';

const EXPECTED_H2 = ['這篇文章適合誰？', '先理解一個核心觀念', '拍攝步驟', '設定參考', '延伸練習', '結語'];

// Minimal stubbed article for the mobile readable-render check: no cover,
// no images, so the only GitHub traffic is the stubbed MDX fetch.
const MOBILE_FIXTURE_H2 = ['夾具小節一', '夾具小節二'];
const MOBILE_FIXTURE_MDX = [
  '---',
  'title: 行動版夾具標題',
  'description: 行動版夾具描述文字，用於驗證窄視窗可讀渲染。',
  "date: '2026-09-02'",
  'category: tutorial',
  "tags: ['夾具']",
  'draft: true',
  "author: '夾具作者'",
  '---',
  '## 夾具小節一',
  '',
  '夾具段落一，用於驗證窄視窗下的內文可讀性。',
  '',
  '## 夾具小節二',
  '',
  '夾具段落二，用於驗證窄視窗下的內文可讀性。',
  ''
].join('\n');

// 1×1 transparent PNG: proves the original-fallback <img> renders real
// pixels without shipping any fixture file.
const STUB_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test.describe('preview renders committed article like production', () => {
  // LIVE-ONLY (quota-dependent): the single live happy-path test in this
  // file. Hits the real api.github.com; fails with the honest zh-TW quota
  // message (not an app bug) when the 60/hr unauthenticated quota is spent.
  test('desktop: full structure, noindex, honesty note', async ({ page }) => {
    await page.goto('/preview?slug=example&branch=main');
    const article = page.locator('[data-preview-article="example"]');
    await expect(article).toBeVisible({ timeout: 60_000 });

    await expect(article.locator('h1')).toHaveText('格式範例文章');
    await expect(article.locator('[data-preview-body] h2')).toHaveText(EXPECTED_H2);

    // Same component census as the committed source: 2 Callouts, 1 Figure, 1 Model3D.
    await expect(article.locator('[data-preview-body] aside[data-type]')).toHaveCount(2);
    await expect(article.locator('[data-preview-body] figure').first()).toBeVisible();
    await expect(article.locator('figure.article-model')).toBeVisible();

    // Cover: either the generated responsive image or the honest placeholder.
    const coverImg = article.locator('img[alt="攝影社成員在戶外觀察拍攝場景"]');
    const coverPlaceholder = article.locator('[data-preview-missing-image]');
    await expect(coverImg.or(coverPlaceholder).first()).toBeVisible();

    // Figure image: generated srcset or honest placeholder, never silent.
    const figureImg = article.locator('[data-preview-body] figure img[alt="不同光線條件下的攝影練習場景"]');
    const figurePlaceholder = article.locator('[data-preview-body] [data-preview-missing-image]');
    await expect(figureImg.or(figurePlaceholder).first()).toBeVisible();

    // Production GFM + autolink behavior: table renders, headings carry anchors.
    await expect(article.locator('[data-preview-body] table')).toBeVisible();
    const firstH2Link = article.locator('[data-preview-body] h2 a').first();
    await expect(firstH2Link).toHaveAttribute('href', /#/);

    // Noindex + honesty note + preview provenance footer.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('[data-preview-root]')).toContainText('僅顯示已儲存的提交');
    await expect(article).toContainText('main');
  });

  // STUBBED: deterministic readable-render check with zero live
  // dependency. The LIVE desktop test above covers production parity; this
  // one proves the route renders readably on a narrow viewport.
  test('mobile: article renders readably', async ({ page }) => {
    await page.route(/\/contents\/content\/articles\//, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: MOBILE_FIXTURE_MDX
      })
    );
    await page.goto('/preview?slug=preview-mobile-fixture&branch=main');
    const article = page.locator('[data-preview-article="preview-mobile-fixture"]');
    await expect(article).toBeVisible({ timeout: 60_000 });
    await expect(article.locator('h1')).toHaveText('行動版夾具標題');
    await expect(article.locator('[data-preview-body] h2')).toHaveText(MOBILE_FIXTURE_H2);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  // STUBBED: both `.mdx` and `.md` legs 404, so the honest 404 path is
  // exercised with zero live quota dependency. The stub returns bare 404s —
  // the asserted zh-TW sentences come from the APP under test, so this is
  // not a tautology: a regression in the 404 UI text fails this test.
  test('missing slug shows honest zh-TW 404 state', async ({ page }) => {
    await page.route(/\/contents\/content\/articles\//, (route) =>
      route.fulfill({
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: 'Not Found'
      })
    );
    await page.goto('/preview?slug=no-such-article-zzz&branch=main');
    const alert = page.locator('[data-preview-root] [role="alert"]');
    await expect(alert).toContainText('找不到', { timeout: 60_000 });
    await expect(alert).toContainText('no-such-article-zzz');
    await expect(alert).toContainText('僅顯示已儲存的提交');
  });

  // STUBBED STALL: the contents API never responds, so without the
  // `AbortController` guard (`PREVIEW_GITHUB_TIMEOUT_MS`) this test would
  // hang until the Playwright timeout. It proves the stall surfaces the
  // honest zh-TW timeout state instead. ~30s by design (one timeout budget:
  // the MDX lookup aborts on the first stall without retrying `.md`).
  test('stalled GitHub connection surfaces timeout state instead of hanging', async ({ page }) => {
    await page.route(
      /\/contents\/content\/articles\//,
      () => new Promise<never>(() => {})
    );
    await page.goto('/preview?slug=example&branch=main');
    const alert = page.locator('[data-preview-root] [role="alert"]');
    await expect(alert).toContainText('讀取失敗', { timeout: 60_000 });
    await expect(alert).toContainText('逾時');
  });

  test('malformed slug is rejected without a network call', async ({ page }) => {
    await page.goto('/preview?slug=Bad%20Slug!');
    await expect(page.locator('[data-preview-root] [role="alert"]')).toContainText('格式不正確', { timeout: 30_000 });
  });
});

test.describe('preview original fallback (states 2 and 3)', () => {
  const FIXTURE_SLUG = 'preview-original-fixture';
  const FIXTURE_COVER = '/images/generated/articles/example/cover.jpg';
  const FIXTURE_FIGURE =
    '/images/generated/articles/example/6e249790-f77e-4889-b9c8-808725921dc1-contact-bg.jpg';
  const FIXTURE_MDX = [
    '---',
    'title: 原圖預覽夾具',
    'description: 夾具描述文字，用於驗證未處理原圖預覽。',
    "date: '2026-09-02'",
    'category: tutorial',
    "tags: ['夾具']",
    `cover: '${FIXTURE_COVER}'`,
    "coverAlt: '夾具封面替代文字說明'",
    'draft: true',
    "author: '夾具作者'",
    '---',
    '## 夾具章節',
    '',
    `<Figure src="${FIXTURE_FIGURE}" alt="夾具圖片替代文字說明" caption="夾具圖說。" width={800} height={600} />`,
    ''
  ].join('\n');

  async function stubFixtureMdx(page: Page): Promise<void> {
    await page.route(/\/contents\/content\/articles\//, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: FIXTURE_MDX
      })
    );
  }

  async function stubManifestRowRemoved(page: Page): Promise<void> {
    await page.route(/articles\.manifest\.json$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: { 'other/cover.jpg': { widths: [640] } } })
      })
    );
  }
  test('manifest row missing → versioned original img + badge, no placeholder', async ({ page }) => {
    await stubFixtureMdx(page);
    await stubManifestRowRemoved(page);
    // Versioned originals resolve on the same branch (contents API primary).
    await page.route(/\/contents\/assets\/articles\//, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/png',
        // The stub replaces the real API response, so it must restore the
        // permissive CORS header the browser chain depends on.
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: Buffer.from(STUB_PNG_B64, 'base64')
      })
    );
    await page.goto(`/preview?slug=${FIXTURE_SLUG}&branch=main`);
    const article = page.locator(`[data-preview-article="${FIXTURE_SLUG}"]`);
    await expect(article).toBeVisible({ timeout: 60_000 });
    await expect(article.locator('h1')).toHaveText('原圖預覽夾具');

    // Cover + figure both render the unprocessed original as blob: URLs…
    const originalImgs = article.locator('img[src^="blob:"]');
    await expect(originalImgs.first()).toBeVisible({ timeout: 60_000 });
    for (const alt of ['夾具封面替代文字說明', '夾具圖片替代文字說明']) {
      await expect(article.locator(`img[alt="${alt}"][src^="blob:"]`)).toBeVisible();
    }
    // …each with the honest unprocessed-original badge…
    const badges = article.locator('[data-preview-original-badge]');
    await expect(badges).toHaveCount(2);
    await expect(badges.first()).toContainText('尚未產生響應式衍生檔');
    // …and no dashed placeholder anywhere on the page.
    await expect(article.locator('[data-preview-missing-image]')).toHaveCount(0);
    // Single source by definition: original imgs carry no srcset.
    for (const img of await originalImgs.all()) {
      await expect(img).not.toHaveAttribute('srcset', /.+/);
    }
  });

  test('original also missing → honest placeholder stays, still no silent gap', async ({ page }) => {
    await stubFixtureMdx(page);
    await stubManifestRowRemoved(page);
    // Both legs of the original chain fail: contents API 404s, raw aborts.
    await page.route(/\/contents\/assets\/articles\//, (route) =>
      route.fulfill({
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: 'Not Found'
      })
    );
    await page.route(/raw\.githubusercontent\.com/, (route) => route.abort('failed'));
    await page.goto(`/preview?slug=${FIXTURE_SLUG}&branch=main`);
    const article = page.locator(`[data-preview-article="${FIXTURE_SLUG}"]`);
    await expect(article).toBeVisible({ timeout: 60_000 });

    // Cover + figure both keep the honest placeholder…
    const placeholders = article.locator('[data-preview-missing-image]');
    await expect(placeholders).toHaveCount(2, { timeout: 60_000 });
    await expect(placeholders.first()).toContainText('圖片衍生檔尚未產生');
    await expect(article.locator('[data-preview-original-badge]')).toHaveCount(0);
  });
});
