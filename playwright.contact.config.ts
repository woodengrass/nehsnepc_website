import { defineConfig, devices } from '@playwright/test';

// Run contact lanes sequentially: they share .next (workers only serialize this run).
export default defineConfig({
  testDir: './tests/contact',
  testMatch: ['harness.spec.ts', 'contact.spec.ts'],
  testIgnore: '**/*.test.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3150',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
    { name: 'narrow', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: {
    command: 'node scripts/dev_with_article_images.mjs --port 3150',
    url: 'http://localhost:3150/contact',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    timeout: 180_000,
    env: {
      ADMIN_MODE: '0',
      NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '',
      NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY: '00000000-0000-4000-8000-000000000001',
    },
  },
});
