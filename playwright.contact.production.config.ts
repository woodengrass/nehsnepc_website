import { defineConfig, devices } from '@playwright/test';

// Requires an explicit task-10 build with the desired public key, then next start.
// CONTACT_UNCONFIGURED selects tests only; it cannot change a build-inlined key.
// Stop all other .next consumers before building/running this lane.
export default defineConfig({
  testDir: './tests/contact',
  testMatch: process.env.CONTACT_UNCONFIGURED === '1'
    ? ['unavailable.spec.ts'] : ['harness.spec.ts', 'contact.spec.ts'],
  testIgnore: '**/*.test.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3151',
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
    command: 'pnpm exec next start -p 3151',
    url: 'http://localhost:3151/contact',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    timeout: 120_000,
  },
});
