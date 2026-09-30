import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.COMPAT_PORT ?? 3101);
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Loopback-only compat harness: chromium + local admin:dev server with
// readiness probe and automatic teardown (port release).
export default defineConfig({
  testDir: './tests/keystatic',
  testMatch: 'compat.spec.ts',
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: '.omo/evidence/task-1-playwright-report.json' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/dev_with_article_images.mjs --admin --port ${PORT}`,
    url: `${BASE_URL}/keystatic`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '1',
      PORT: String(PORT)
    } as Record<string, string>
  }
});
