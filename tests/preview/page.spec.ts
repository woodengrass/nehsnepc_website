/**
 * Live `/preview` browser gate (ADR-0006).
 *
 * Fetches the real committed `example` article from the public GitHub repo
 * (branch `main`) and asserts the client renderer produces the production
 * structure: title, heading order, Callout/Figure/Model3D presence, cover,
 * noindex, and the saved-commits-only honesty note. Error states (missing
 * slug, malformed slug) are asserted in Traditional Chinese.
 */
import { expect, test } from '@playwright/test';

const EXPECTED_H2 = ['這篇文章適合誰？', '先理解一個核心觀念', '拍攝步驟', '設定參考', '延伸練習', '結語'];

test.describe('preview renders committed article like production', () => {
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

  test('mobile: article renders readably', async ({ page }) => {
    await page.goto('/preview?slug=example&branch=main');
    const article = page.locator('[data-preview-article="example"]');
    await expect(article).toBeVisible({ timeout: 60_000 });
    await expect(article.locator('h1')).toHaveText('格式範例文章');
    await expect(article.locator('[data-preview-body] h2')).toHaveText(EXPECTED_H2);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('missing slug shows honest zh-TW 404 state', async ({ page }) => {
    await page.goto('/preview?slug=no-such-article-zzz&branch=main');
    await expect(page.locator('[data-preview-root] [role="alert"]')).toContainText('找不到', { timeout: 60_000 });
    await expect(page.locator('[data-preview-root] [role="alert"]')).toContainText('僅顯示已儲存的提交');
  });

  test('malformed slug is rejected without a network call', async ({ page }) => {
    await page.goto('/preview?slug=Bad%20Slug!');
    await expect(page.locator('[data-preview-root] [role="alert"]')).toContainText('格式不正確', { timeout: 30_000 });
  });
});
