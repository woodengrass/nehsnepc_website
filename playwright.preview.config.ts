import { defineConfig, devices } from '@playwright/test';

// Loopback harness on `localhost` (not 127.0.0.1): normal dev mode binds
// localhost, and Next 16 blocks cross-origin dev chunk requests from any
// other host. Fixed port 3145 — never shared with the admin
// compat lane (3101), production checks (3136), or the workflow
// orchestrator (3141-3143). Each run manages and tears down its own server.
const PORT = Number(process.env.PREVIEW_PORT ?? 3145);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/preview',
  testMatch: ['page.spec.ts'],
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: '.omo/evidence/preview-branch/preview-page-report.json' }]],
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } }
  ],
  webServer: {
    command: `node scripts/dev_with_article_images.mjs --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe'
  },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
});
