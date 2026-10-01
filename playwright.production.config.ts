import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PROD_PORT ?? 3136);
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Production smoke harness: serves an ALREADY-BUILT app with `next start` on
// a fixed loopback port, with a readiness probe and automatic teardown
// (port release). NEVER run alongside the local admin:dev server — the
// orchestrator (scripts/test_admin_workflow.ts) serializes every phase
// (local -> stop -> draft build/start -> stop -> publish build/start ->
// stop -> cleanup), so the two webServers never overlap.
export default defineConfig({
  testDir: './tests/production',
  testMatch: 'admin-gateway.spec.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: '.omo/evidence/task-8-production-report.json' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx next start -p ${PORT} --hostname 127.0.0.1`,
    url: `${BASE_URL}/admin`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
