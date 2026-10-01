import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.COMPAT_PORT ?? 3101);
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Loopback-only local harness: chromium + local admin:dev server with
// readiness probe and automatic teardown (port release).
// Fixed port 3101 (compat lane). NEVER share ports with the production
// config (3136) or the workflow orchestrator (3141-3143): the test:admin
// pipeline serializes guards (serverless) -> local (this config) ->
// workflow orchestrator (own servers), so no two servers ever overlap.
// testMatch covers every loopback spec EXCEPT github-guards.spec.ts, which
// is static and runs serverless via test:admin:guards.
export default defineConfig({
  testDir: './tests/keystatic',
  testMatch: ['compat.spec.ts', 'github-failures.spec.ts', 'editor-flow.spec.ts'],
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: '.omo/evidence/task-9-local-report.json' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  // Desktop matrix gate is 1440x1000. Mobile 390x844 is covered inside
  // editor-flow.spec.ts via per-test viewport override (keeps the heavy
  // compat uploads single-run while still proving the mobile pass).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
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
