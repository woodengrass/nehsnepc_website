import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  EXPECTED_GITHUB_REPO,
  PRODUCTION_ORIGIN_ENV_VAR,
  buildMissingSecretsResponse,
  buildOriginMismatchResponse,
  buildOriginNotConfiguredResponse,
  buildPreviewDisabledResponse,
  buildRepoMismatchResponse,
  getCanonicalOrigin,
  getGithubGateFailure,
  getGithubRepo,
  getGithubSecretsStatus,
  getRequestOrigin,
  getStorageConfig,
  getStorageKind,
  isCanonicalOriginConfigured,
  isLocalMode,
  isPreviewEnv,
  isSafeMethod,
  missingSecretsBody,
  normalizeOrigin,
  originsEquivalent
} from '../../lib/keystatic/storage';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

const CANONICAL = 'https://nehsnepc.example';
const FULL_ENV = {
  NODE_ENV: 'production',
  KEYSTATIC_GITHUB_CLIENT_ID: 'fake-client-id-123',
  KEYSTATIC_GITHUB_CLIENT_SECRET: 'fake-client-secret-1234567890',
  KEYSTATIC_SECRET: 'fake-session-secret-12345678901234',
  NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG: 'fake-github-app-slug',
  KEYSTATIC_GITHUB_REPO: 'woodengrass/nehsnepc_website',
  KEYSTATIC_PRODUCTION_ORIGIN: CANONICAL
} as unknown as NodeJS.ProcessEnv;

const apiRequest = (url: string, init?: RequestInit) => new Request(url, init);

test.describe('task 6: github-mode guards (static, no live github)', () => {
  test('todo 1 semantics kept: local only on dev+flag, lengths incl 31-char fail', () => {
    expect(isLocalMode({ NODE_ENV: 'development', NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '1' } as NodeJS.ProcessEnv)).toBe(true);
    expect(isLocalMode({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isLocalMode({ NODE_ENV: 'production', NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '1' } as NodeJS.ProcessEnv)).toBe(false);
    expect(getStorageKind({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe('github');

    // Ordinary dev without the flag cannot write locally.
    expect(getStorageKind({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe('github');
    expect(getStorageConfig({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toEqual({
      kind: 'github',
      repo: 'missing/missing',
      branchPrefix: 'preview/'
    });

    // Minimum lengths: client id 8, client secret 20, session secret 32,
    // public GitHub App slug 8 (official bundle requires it non-empty).
    const base = {
      KEYSTATIC_GITHUB_CLIENT_ID: '12345678',
      KEYSTATIC_GITHUB_CLIENT_SECRET: '12345678901234567890',
      KEYSTATIC_SECRET: '12345678901234567890123456789012',
      NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG: '12345678',
      KEYSTATIC_GITHUB_REPO: 'woodengrass/nehsnepc_website'
    } as unknown as NodeJS.ProcessEnv;
    expect(getGithubSecretsStatus(base).ok).toBe(true);
    const short31 = { ...base, KEYSTATIC_SECRET: '1234567890123456789012345678901' } as unknown as NodeJS.ProcessEnv;
    expect('1234567890123456789012345678901'.length).toBe(31);
    expect(getGithubSecretsStatus(short31).ok).toBe(false);
    expect(getGithubSecretsStatus(short31).missing).toContain('KEYSTATIC_SECRET');
    // Missing/short public app slug fails closed (names only, never values).
    const noSlug = { ...base } as unknown as Record<string, string>;
    delete noSlug.NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG;
    const noSlugStatus = getGithubSecretsStatus(noSlug as unknown as NodeJS.ProcessEnv);
    expect(noSlugStatus.ok).toBe(false);
    expect(noSlugStatus.missing).toContain('NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG');
    const shortSlug = { ...base, NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG: 'short' } as unknown as NodeJS.ProcessEnv;
    expect(getGithubSecretsStatus(shortSlug).ok).toBe(false);
    expect(getGithubSecretsStatus(shortSlug).missing).toContain('NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG');
  });

  test('repo pin + canonical origin + preview policy', () => {
    expect(EXPECTED_GITHUB_REPO).toBe('woodengrass/nehsnepc_website');
    expect(getGithubRepo(FULL_ENV)).toBe('woodengrass/nehsnepc_website');

    expect(getCanonicalOrigin(FULL_ENV)).toBe(CANONICAL);
    expect(getCanonicalOrigin({ KEYSTATIC_PRODUCTION_ORIGIN: `${CANONICAL}/` } as unknown as NodeJS.ProcessEnv)).toBe(CANONICAL);
    expect(isCanonicalOriginConfigured(FULL_ENV)).toBe(true);
    expect(isCanonicalOriginConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(isCanonicalOriginConfigured({ KEYSTATIC_PRODUCTION_ORIGIN: 'http://insecure.example' } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(normalizeOrigin('HTTPS://Example.COM:443/a/')).toBe('https://example.com');

    expect(isPreviewEnv({ VERCEL_ENV: 'preview' } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isPreviewEnv({ VERCEL_ENV: 'production' } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isPreviewEnv({} as NodeJS.ProcessEnv)).toBe(false);

    expect(isSafeMethod('GET')).toBe(true);
    expect(isSafeMethod('HEAD')).toBe(true);
    expect(isSafeMethod('POST')).toBe(false);
  });

  test('gate order: preview -> secrets -> repo -> origin-configured -> origin equality', async () => {
    // Preview kills before anything else, even with valid secrets.
    const previewFail = getGithubGateFailure(apiRequest(`${CANONICAL}/api/keystatic/a`), {
      ...FULL_ENV,
      VERCEL_ENV: 'preview'
    });
    expect(previewFail?.status).toBe(403);
    expect(((await previewFail!.json()) as { error: string }).error).toBe('keystatic-preview-disabled');

    // Missing secrets on the canonical origin -> redacted 503, never 403.
    const missingFail = getGithubGateFailure(apiRequest(`${CANONICAL}/api/keystatic/a`), {} as NodeJS.ProcessEnv);
    expect(missingFail?.status).toBe(503);
    const missingBody = (await missingFail!.json()) as Record<string, unknown>;
    expect(missingBody.error).toBe('keystatic-github-not-configured');

    // 31-char session secret fails closed.
    const shortFail = getGithubGateFailure(apiRequest(`${CANONICAL}/api/keystatic/a`), {
      ...FULL_ENV,
      KEYSTATIC_SECRET: 'x'.repeat(31)
    });
    expect(shortFail?.status).toBe(503);

    // Missing public app slug on the canonical origin -> redacted 503 naming the var.
    const { NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG: _dropSlug, ...noSlugEnv } = FULL_ENV as Record<string, string>;
    void _dropSlug;
    const slugFail = getGithubGateFailure(
      apiRequest(`${CANONICAL}/api/keystatic/a`),
      noSlugEnv as unknown as NodeJS.ProcessEnv
    );
    expect(slugFail?.status).toBe(503);
    const slugBody = (await slugFail!.json()) as { error: string; missing: string[] };
    expect(slugBody.error).toBe('keystatic-github-not-configured');
    expect(slugBody.missing).toContain('NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG');

    // Wrong repo -> redacted 503 (expected repo is public, never a secret).
    const repoFail = getGithubGateFailure(apiRequest(`${CANONICAL}/api/keystatic/a`), {
      ...FULL_ENV,
      KEYSTATIC_GITHUB_REPO: 'someone/elsewhere'
    });
    expect(repoFail?.status).toBe(503);
    expect(((await repoFail!.json()) as { error: string }).error).toBe('keystatic-github-repo-mismatch');

    // Valid secrets+repo but no canonical origin -> redacted 503 naming the var.
    const { KEYSTATIC_PRODUCTION_ORIGIN: _drop, ...noOrigin } = FULL_ENV as Record<string, string>;
    void _drop;
    const originCfgFail = getGithubGateFailure(
      apiRequest(`${CANONICAL}/api/keystatic/a`),
      noOrigin as unknown as NodeJS.ProcessEnv
    );
    expect(originCfgFail?.status).toBe(503);
    expect(((await originCfgFail!.json()) as { error: string }).error).toBe('keystatic-origin-not-configured');

    // Wrong host with everything else valid -> redacted 403, no Host reflection.
    const wrongHostFail = getGithubGateFailure(apiRequest('https://evil.example/api/keystatic/a'), FULL_ENV);
    expect(wrongHostFail?.status).toBe(403);
    const wrongBody = JSON.stringify(await wrongHostFail!.json());
    expect(wrongBody).toContain('keystatic-origin-forbidden');
    expect(wrongBody).not.toContain('evil.example');

    // Canonical host passes every guard -> handler may be constructed.
    expect(getGithubGateFailure(apiRequest(`${CANONICAL}/api/keystatic/a`), FULL_ENV)).toBeNull();
    // Browser Origin header is honored too.
    expect(
      getGithubGateFailure(
        apiRequest(`${CANONICAL}/api/keystatic/a`, { method: 'POST', headers: { origin: CANONICAL } }),
        FULL_ENV
      )
    ).toBeNull();
    const badOriginHeader = getGithubGateFailure(
      apiRequest(`${CANONICAL}/api/keystatic/a`, { method: 'POST', headers: { origin: 'https://evil.example' } }),
      FULL_ENV
    );
    expect(badOriginHeader?.status).toBe(403);
  });

  test('apex/www alias: single leading www equivalent both directions, siblings still 403', async () => {
    const wwwEnv = {
      ...FULL_ENV,
      KEYSTATIC_PRODUCTION_ORIGIN: 'https://www.nehsnepc.example'
    } as unknown as NodeJS.ProcessEnv;
    const apexEnv = {
      ...FULL_ENV,
      KEYSTATIC_PRODUCTION_ORIGIN: 'https://nehsnepc.example'
    } as unknown as NodeJS.ProcessEnv;

    // Unit semantics: a single leading www. is ignored on either side.
    expect(originsEquivalent('https://www.nehsnepc.example', 'https://nehsnepc.example')).toBe(true);
    expect(originsEquivalent('https://nehsnepc.example', 'https://www.nehsnepc.example')).toBe(true);
    expect(originsEquivalent('https://www.nehsnepc.example/', 'https://nehsnepc.example')).toBe(true);
    // Only ONE leading www. is stripped: www.www. still differs from www.
    expect(originsEquivalent('https://www.www.nehsnepc.example', 'https://www.nehsnepc.example')).toBe(false);
    // Siblings and suffix tricks never match.
    expect(originsEquivalent('https://evilnehsnepc.example', 'https://nehsnepc.example')).toBe(false);
    expect(originsEquivalent('https://nehsnepc.example.evil.com', 'https://nehsnepc.example')).toBe(false);
    expect(originsEquivalent('https://app.nehsnepc.example', 'https://www.nehsnepc.example')).toBe(false);
    expect(originsEquivalent('https://a.b.nehsnepc.example', 'https://nehsnepc.example')).toBe(false);

    // Gate: apex request passes under a www canonical and vice versa.
    expect(getGithubGateFailure(apiRequest('https://nehsnepc.example/api/keystatic/a'), wwwEnv)).toBeNull();
    expect(getGithubGateFailure(apiRequest('https://www.nehsnepc.example/api/keystatic/a'), apexEnv)).toBeNull();
    // Browser Origin header honors the alias too.
    expect(
      getGithubGateFailure(
        apiRequest('https://nehsnepc.example/api/keystatic/a', {
          method: 'POST',
          headers: { origin: 'https://www.nehsnepc.example' }
        }),
        apexEnv
      )
    ).toBeNull();

    // Gate: wrong host, lookalike, suffix-trick, and deep subdomains still 403
    // under BOTH canonical shapes, with no Host reflection.
    for (const bad of [
      'https://evil.example',
      'https://evilnehsnepc.example',
      'https://nehsnepc.example.evil.com',
      'https://app.nehsnepc.example',
      'https://a.b.nehsnepc.example'
    ]) {
      for (const env of [wwwEnv, apexEnv]) {
        const fail = getGithubGateFailure(apiRequest(`${bad}/api/keystatic/a`), env);
        expect(fail?.status).toBe(403);
        const body = JSON.stringify(await fail!.json());
        expect(body).toContain('keystatic-origin-forbidden');
        expect(body).not.toContain('evil');
        expect(body).not.toContain('app.nehsnepc');
      }
    }
  });

  test('all failure bodies are redacted (names only, never values)', async () => {
    const secrets = {
      KEYSTATIC_GITHUB_CLIENT_ID: 'ghp-fake-secret-value-123',
      KEYSTATIC_GITHUB_CLIENT_SECRET: 'super-client-secret-value-1234567890',
      KEYSTATIC_SECRET: 'super-secret-session-value-1234567890',
      NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG: 'fake-app-slug-value-12345678'
    };
    const bodies: string[] = [];
    bodies.push(JSON.stringify(missingSecretsBody(getGithubSecretsStatus({} as NodeJS.ProcessEnv))));
    bodies.push(JSON.stringify(await buildMissingSecretsResponse(getGithubSecretsStatus({} as NodeJS.ProcessEnv)).json()));
    bodies.push(JSON.stringify(await buildOriginMismatchResponse().json()));
    bodies.push(JSON.stringify(await buildPreviewDisabledResponse().json()));
    bodies.push(JSON.stringify(await buildRepoMismatchResponse().json()));
    bodies.push(JSON.stringify(await buildOriginNotConfiguredResponse().json()));
    for (const body of bodies) {
      for (const value of Object.values(secrets)) expect(body).not.toContain(value);
    }
    expect(PRODUCTION_ORIGIN_ENV_VAR).toBe('KEYSTATIC_PRODUCTION_ORIGIN');
    expect(getRequestOrigin(apiRequest('https://evil.example/x'))).toBe('https://evil.example');
  });

  test('route hardens bootstrap: gate before handler, no local fallback', () => {
    const src = read('app/api/keystatic/[...params]/route.ts');
    expect(src).toContain('getGithubGateFailure');
    expect(src.indexOf('getGithubGateFailure')).toBeLessThan(src.indexOf('makeRouteHandler'));
    expect(src).not.toContain("kind: 'local'");
    expect(src).toContain('force-dynamic');
  });

  test('ui guard: literal-origin 308 for safe GET, preview unavailable, noindex', () => {
    const src = read('app/keystatic/layout.tsx');
    expect(src).toContain('permanentRedirect(`${canonical}/keystatic`)');
    expect(src).toContain('isPreviewEnv');
    expect(src).toContain('data-keystatic-unavailable');
    expect(src).toContain('index: false');
    // The redirect target is the literal canonical origin — the request Host
    // never flows into it (only `canonical`, derived from server-only env).
    const redirectLines = src.split('\n').filter((line) => line.includes('permanentRedirect(`${'));
    expect(redirectLines.length).toBe(1);
    expect(redirectLines[0]).not.toContain('host');
    expect(redirectLines[0]).not.toContain('Header');
  });

  test('.env.example documents vars with placeholders only', () => {
    const src = read('.env.example');
    for (const name of [
      'KEYSTATIC_GITHUB_CLIENT_ID',
      'KEYSTATIC_GITHUB_CLIENT_SECRET',
      'KEYSTATIC_SECRET',
      'NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG',
      'KEYSTATIC_GITHUB_REPO',
      'KEYSTATIC_PRODUCTION_ORIGIN',
      'NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE'
    ]) {
      expect(src).toContain(name);
    }
    expect(src).toContain('32');
    expect(src).toContain('KEYSTATIC_GITHUB_REPO=woodengrass/nehsnepc_website');
    expect(src).not.toMatch(/ghp_/);
    expect(src).not.toMatch(/github_pat_/);
  });

  test('.gitignore covers real env files but keeps the example', () => {
    const src = read('.gitignore');
    expect(src).toContain('.env*');
    expect(src).toContain('!.env.example');
  });

  test('config storage uses the pinned repo (browser-safe, no server-env read)', async ({}, testInfo) => {
    testInfo.setTimeout(180_000);
    // Static: the browser bundle cannot read server-only env (Next.js only
    // inlines NEXT_PUBLIC_*), so the config must resolve the GitHub repo
    // from the pinned public constant — never from getGithubRepo().
    const src = read('keystatic.config.ts');
    expect(src).toContain('EXPECTED_GITHUB_REPO');
    expect(src).toContain('githubStorage(EXPECTED_GITHUB_REPO)');
    expect(src).not.toContain('getGithubRepo');
    // Local branch intact: still a direct NEXT_PUBLIC_* read (statically
    // inlinable), still `{ kind: 'local' }`.
    expect(src).toContain("kind: 'local'");
    expect(src).toContain('NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE');
    // storage.ts stays browser-safe: no node:* imports on the config path
    // (Response/URL/Request are edge-safe).
    expect(read('lib/keystatic/storage.ts')).not.toContain('node:');

    // Runtime: evaluate the ACTUAL exported config in fresh processes (the
    // module reads env once at import, so each shape needs its own process).
    const probeDir = 'C:/Users/maste/AppData/Local/Temp/opencode/keystatic-pin-probe';
    mkdirSync(probeDir, { recursive: true });
    const probe = path.join(probeDir, 'probe.mts');
    writeFileSync(
      probe,
      `import { pathToFileURL } from 'node:url';\nconst mod = await import(pathToFileURL(${JSON.stringify(path.join(ROOT, 'keystatic.config.ts'))}).href);\nprocess.stdout.write(JSON.stringify((mod.default as unknown as { storage: unknown }).storage));\n`
    );
    try {
      const run = (env: NodeJS.ProcessEnv): unknown =>
        JSON.parse(
          execFileSync(`npx tsx ${JSON.stringify(probe)}`, {
            cwd: ROOT,
            env,
            shell: true,
            timeout: 120_000,
            encoding: 'utf8'
          }) as unknown as string
        );
      // Production-like browser bundle: server-only repo vars ABSENT.
      const prodEnv = { ...process.env, NODE_ENV: 'production' } as Record<string, string | undefined>;
      delete prodEnv.KEYSTATIC_GITHUB_REPO;
      delete prodEnv.KEYSTATIC_GITHUB_REPO_OWNER;
      delete prodEnv.KEYSTATIC_GITHUB_REPO_NAME;
      delete prodEnv.NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE;
      expect(run(prodEnv as NodeJS.ProcessEnv)).toEqual({
        kind: 'github',
        repo: 'woodengrass/nehsnepc_website',
        branchPrefix: 'preview/'
      });
      // Local flags: loopback storage, unchanged.
      expect(run({ ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '1' })).toEqual({
        kind: 'local'
      });
    } finally {
      rmSync(probe, { force: true });
    }
  });

  test('dev launcher stays loopback-only for admin (read-only check)', () => {
    // Todo 4 owns the launcher and may replace it; assert on whichever
    // launcher file is present without editing it.
    const candidates = ['scripts/dev_with_article_images.mjs', 'scripts/dev_admin.mjs'].filter((rel) =>
      existsSync(path.join(ROOT, rel))
    );
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    for (const rel of candidates) {
      const src = read(rel);
      expect(src).toContain('127.0.0.1');
      expect(src).toContain('--hostname');
      expect(src).toContain('NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE');
    }
  });
});
