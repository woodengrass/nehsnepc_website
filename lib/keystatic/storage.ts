/**
 * Keystatic storage-mode switch.
 *
 * Local mode ONLY when BOTH:
 *   - `NODE_ENV === 'development'`
 *   - `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE === '1'`
 * Otherwise GitHub mode. There is no local fallback when secrets are missing:
 * GitHub mode with missing/short secrets must answer with a redacted 503
 * before the Keystatic handler is constructed.
 */

export type StorageKind = 'local' | 'github';

export function isLocalMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'development' && env.NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE === '1';
}

export function getStorageKind(env: NodeJS.ProcessEnv = process.env): StorageKind {
  return isLocalMode(env) ? 'local' : 'github';
}

export function getGithubRepo(env: NodeJS.ProcessEnv = process.env): string {
  const direct = (env.KEYSTATIC_GITHUB_REPO ?? '').trim();
  if (direct.length > 0) return direct;
  const owner = (env.KEYSTATIC_GITHUB_REPO_OWNER ?? '').trim();
  const name = (env.KEYSTATIC_GITHUB_REPO_NAME ?? '').trim();
  if (owner.length > 0 && name.length > 0) return `${owner}/${name}`;
  return '';
}

export type GithubSecretsStatus = {
  ok: boolean;
  /** Names of missing/short secrets — never values. */
  missing: string[];
  repoMissing: boolean;
};

const MIN_CLIENT_ID = 8;
const MIN_CLIENT_SECRET = 20;
const MIN_SESSION_SECRET = 32;
/**
 * Public GitHub App slug (`NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`), required
 * by the official `@keystatic/next@5.0.5` route handler + UI bundle
 * (`slugEnvName`). Keystatic itself requires it non-empty (it builds the
 * `github.com/apps/<slug>/installations/new` link); the gate enforces
 * min 8 chars, consistent with the client-id rule. Public by design
 * (it appears in URLs) — errors name it, never its value.
 */
const MIN_APP_SLUG = 8;
export const APP_SLUG_ENV_VAR = 'NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG';

/**
 * GitHub storage is pinned to this repository. Ordinary dev/production/preview
 * never fall back to local writes; a different repo value is a misconfiguration
 * and must fail closed (redacted 503) before the handler is constructed.
 */
export const EXPECTED_GITHUB_REPO = 'woodengrass/nehsnepc_website';

/** Server-only env var holding the exact registered HTTPS origin (no trailing slash). */
export const PRODUCTION_ORIGIN_ENV_VAR = 'KEYSTATIC_PRODUCTION_ORIGIN';

/** Check GitHub-mode secrets without ever returning their values. */
export function getGithubSecretsStatus(env: NodeJS.ProcessEnv = process.env): GithubSecretsStatus {
  const missing: string[] = [];
  if ((env.KEYSTATIC_GITHUB_CLIENT_ID ?? '').length < MIN_CLIENT_ID) missing.push('KEYSTATIC_GITHUB_CLIENT_ID');
  if ((env.KEYSTATIC_GITHUB_CLIENT_SECRET ?? '').length < MIN_CLIENT_SECRET)
    missing.push('KEYSTATIC_GITHUB_CLIENT_SECRET');
  if ((env.KEYSTATIC_SECRET ?? '').length < MIN_SESSION_SECRET) missing.push('KEYSTATIC_SECRET');
  if ((env.NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG ?? '').trim().length < MIN_APP_SLUG)
    missing.push(APP_SLUG_ENV_VAR);
  const repoMissing = getGithubRepo(env).length === 0;
  return { ok: missing.length === 0 && !repoMissing, missing, repoMissing };
}

/** Branch prefix for Keystatic-created preview branches (`preview/<github-username>` by convention). */
export const PREVIEW_BRANCH_PREFIX = 'preview/' as const;

/** Storage config for server-side use (API route, Node scripts, unit tests). */
export function getStorageConfig(env: NodeJS.ProcessEnv = process.env): { kind: 'local' } | { kind: 'github'; repo: `${string}/${string}`; branchPrefix: typeof PREVIEW_BRANCH_PREFIX } {
  if (isLocalMode(env)) return { kind: 'local' };
  return githubStorage(getGithubRepo(env));
}

/**
 * GitHub storage object with a safe repo fallback (never throws on missing env).
 * Used by `keystatic.config.ts`, which must NOT read non-public env directly
 * (Next.js rejects non-`NEXT_PUBLIC_` `process.env` access in client code).
 *
 * `branchPrefix` scopes Keystatic's native CreateBranchDialog to `preview/`
 * branches; local storage takes no prefix and is unaffected.
 */
export function githubStorage(repo: string): { kind: 'github'; repo: `${string}/${string}`; branchPrefix: typeof PREVIEW_BRANCH_PREFIX } {
  return {
    kind: 'github',
    repo: (repo.includes('/') ? repo : 'missing/missing') as `${string}/${string}`,
    branchPrefix: PREVIEW_BRANCH_PREFIX
  };
}

/** Redacted 503 body — contains names only, never secret values. */
export function missingSecretsBody(status: GithubSecretsStatus): Record<string, unknown> {
  return {
    error: 'keystatic-github-not-configured',
    missing: status.missing,
    repoMissing: status.repoMissing,
    hint: 'Set KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET, KEYSTATIC_SECRET, NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG and KEYSTATIC_GITHUB_REPO (owner/name). Local mode requires NODE_ENV=development and NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE=1.'
  };
}

/** Build the redacted 503 response used by the API route before handler construction. */
export function buildMissingSecretsResponse(status: GithubSecretsStatus): Response {
  return Response.json(missingSecretsBody(status), { status: 503 });
}

/**
 * Normalize an origin to `scheme://host[:port]` via the URL parser (which also
 * lowercases the host and drops default ports/trailing slashes). Non-URL input
 * falls back to a trimmed, slash-stripped string so comparisons stay total.
 */
export function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

/** Exact registered HTTPS origin for production, normalized ('' when unset). Server-only. */
export function getCanonicalOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return normalizeOrigin(env.KEYSTATIC_PRODUCTION_ORIGIN ?? '');
}

/** The canonical origin only counts when it is an exact `https://` origin. */
export function isCanonicalOriginConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const canonical = getCanonicalOrigin(env);
  return canonical.startsWith('https://') && canonical.length > 'https://'.length;
}

/**
 * Preview deployments must never serve the admin UI or API: Vercel sets
 * `VERCEL_ENV=preview` there. Anything else (production/development/undefined)
 * is not a preview.
 */
export function isPreviewEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === 'preview';
}

/** Only GET/HEAD are safe to redirect; anything else must get a JSON failure. */
export function isSafeMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

/**
 * Derive the normalized request origin for the equality check. Prefer the
 * `Origin` header when present (browser POSTs carry it), then `Referer`,
 * then the request URL origin (covers direct fetches/Host-spoofed probes).
 * Never throws; returns '' when nothing parseable is available.
 */
export function getRequestOrigin(request: Request): string {
  const originHeader = request.headers.get('origin');
  if (originHeader && originHeader.trim().length > 0) return normalizeOrigin(originHeader);
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return normalizeOrigin(new URL(referer).origin);
    } catch {
      // Fall through to the request URL.
    }
  }
  try {
    return normalizeOrigin(new URL(request.url).origin);
  } catch {
    return '';
  }
}

/**
 * Full pre-handler gate for non-local mode, evaluated in fail-closed order:
 * preview kill -> secrets (503) -> repo pin (503) -> origin configured (503)
 * -> origin equality (403). Returns a redacted `Response` to send, or `null`
 * when the official handler may be constructed. Never reflects secret values
 * or the request Host in any body.
 */
export function getGithubGateFailure(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): Response | null {
  if (isPreviewEnv(env)) return buildPreviewDisabledResponse();
  const status = getGithubSecretsStatus(env);
  if (!status.ok) return buildMissingSecretsResponse(status);
  if (getGithubRepo(env) !== EXPECTED_GITHUB_REPO) return buildRepoMismatchResponse();
  if (!isCanonicalOriginConfigured(env)) return buildOriginNotConfiguredResponse();
  const canonical = getCanonicalOrigin(env);
  if (getRequestOrigin(request) !== canonical) return buildOriginMismatchResponse();
  return null;
}

/** Redacted 403 body for origin mismatches — canonical literal only, never the request Host. */
export function buildOriginMismatchResponse(): Response {
  return Response.json(
    {
      error: 'keystatic-origin-forbidden',
      hint: `Request origin does not match ${PRODUCTION_ORIGIN_ENV_VAR}. Use the canonical production origin.`
    },
    { status: 403 }
  );
}

/** Redacted 403 body for preview deployments — the admin surface is disabled there. */
export function buildPreviewDisabledResponse(): Response {
  return Response.json(
    {
      error: 'keystatic-preview-disabled',
      hint: 'The Keystatic admin is unavailable on preview deployments.'
    },
    { status: 403 }
  );
}

/** Redacted 503 body when the repo is not the pinned `owner/name`. The expected repo is public, not a secret. */
export function buildRepoMismatchResponse(): Response {
  return Response.json(
    {
      error: 'keystatic-github-repo-mismatch',
      expectedRepo: EXPECTED_GITHUB_REPO,
      hint: 'Set KEYSTATIC_GITHUB_REPO to the pinned repository (owner/name).'
    },
    { status: 503 }
  );
}

/** Redacted 503 body when the canonical production origin is missing — names only, never values. */
export function buildOriginNotConfiguredResponse(): Response {
  return Response.json(
    {
      error: 'keystatic-origin-not-configured',
      missing: [PRODUCTION_ORIGIN_ENV_VAR],
      hint: `Set ${PRODUCTION_ORIGIN_ENV_VAR} to the exact registered HTTPS origin (no trailing slash).`
    },
    { status: 503 }
  );
}
