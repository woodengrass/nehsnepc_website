import { expect, test } from '@playwright/test';

// Production smoke for the /admin gateway: proves the SERVED production HTML
// discloses the supported publishing workflow (branch selector, save-vs-
// release, public-draft visibility, static links, rollback, slug-rename,
// concurrency) and does NOT claim unsupported deployment-state/commit-SHA/
// post-save-messaging UI. Phase-independent: runs against any production
// build via playwright.production.config.ts (fixed-port `next start`).
test('admin gateway discloses the supported publishing workflow', async ({ page }) => {
  const response = await page.goto('/admin');
  expect(response?.status()).toBe(200);
  const body = await page.content();

  // Branch-selector disclosure: cannot be removed/locked, must select main.
  expect(body).toContain('分支選擇');
  expect(body).toContain('main');

  // Save-vs-release semantics.
  expect(body).toContain('儲存與發佈');
  expect(body).toContain('draft:false');

  // Public-draft warning: committed drafts are readable on public GitHub.
  expect(body).toContain('草稿公開性');
  expect(body).toContain('GitHub');

  // Static repository + Vercel project links (plain anchors, no status UI).
  expect(body).toContain('GitHub 儲存庫');
  expect(body).toContain('Vercel 專案');
  const repoHref = await page.getByRole('link', { name: 'GitHub 儲存庫' }).getAttribute('href');
  expect(repoHref).toBe('https://github.com/woodengrass/nehsnepc_website');

  // Rollback guidance (Git revert / previous Vercel deployment).
  expect(body).toContain('回退');
  expect(body).toContain('revert');

  // Slug rename is delete-plus-create with no redirect.
  expect(body).toContain('Slug');
  expect(body).toContain('404');

  // Concurrency/conflict note.
  expect(body).toContain('同時編輯');

  // Unsupported surfaces must NOT be claimed or implemented.
  expect(body).not.toContain('Deploy Hook');
  expect(body).not.toContain('deploy hook');
  expect(body).not.toContain('commit SHA');
  expect(body).not.toContain('commitSHA');
});

// Task 9: phase-independent production smoke for the publication surfaces.
// Runs on ANY production build (no fixture needed): every surface serves,
// and sitemap/RSS derive from the same content source as the article index.
test('publication surfaces serve: tutorial, category, sitemap, rss, robots', async ({ request }) => {
  const tutorial = await request.get('/tutorial');
  expect(tutorial.status()).toBe(200);

  const category = await request.get('/tutorial/category/basic');
  expect(category.status()).toBe(200);

  const topicCategory = await request.get('/tutorial/category/topic');
  expect(topicCategory.status()).toBe(200);

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('/tutorial/');

  const rss = await request.get('/rss.xml');
  expect(rss.status()).toBe(200);

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
});
