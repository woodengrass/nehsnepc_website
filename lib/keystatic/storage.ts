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

/** Check GitHub-mode secrets without ever returning their values. */
export function getGithubSecretsStatus(env: NodeJS.ProcessEnv = process.env): GithubSecretsStatus {
  const missing: string[] = [];
  if ((env.KEYSTATIC_GITHUB_CLIENT_ID ?? '').length < MIN_CLIENT_ID) missing.push('KEYSTATIC_GITHUB_CLIENT_ID');
  if ((env.KEYSTATIC_GITHUB_CLIENT_SECRET ?? '').length < MIN_CLIENT_SECRET)
    missing.push('KEYSTATIC_GITHUB_CLIENT_SECRET');
  if ((env.KEYSTATIC_SECRET ?? '').length < MIN_SESSION_SECRET) missing.push('KEYSTATIC_SECRET');
  const repoMissing = getGithubRepo(env).length === 0;
  return { ok: missing.length === 0 && !repoMissing, missing, repoMissing };
}

/** Storage config for server-side use (API route, Node scripts, unit tests). */
export function getStorageConfig(env: NodeJS.ProcessEnv = process.env): { kind: 'local' } | { kind: 'github'; repo: `${string}/${string}` } {
  if (isLocalMode(env)) return { kind: 'local' };
  return githubStorage(getGithubRepo(env));
}

/**
 * GitHub storage object with a safe repo fallback (never throws on missing env).
 * Used by `keystatic.config.ts`, which must NOT read non-public env directly
 * (Next.js rejects non-`NEXT_PUBLIC_` `process.env` access in client code).
 */
export function githubStorage(repo: string): { kind: 'github'; repo: `${string}/${string}` } {
  return { kind: 'github', repo: (repo.includes('/') ? repo : 'missing/missing') as `${string}/${string}` };
}

/** Redacted 503 body — contains names only, never secret values. */
export function missingSecretsBody(status: GithubSecretsStatus): Record<string, unknown> {
  return {
    error: 'keystatic-github-not-configured',
    missing: status.missing,
    repoMissing: status.repoMissing,
    hint: 'Set KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET, KEYSTATIC_SECRET and KEYSTATIC_GITHUB_REPO (owner/name). Local mode requires NODE_ENV=development and NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE=1.'
  };
}

/** Build the redacted 503 response used by the API route before handler construction. */
export function buildMissingSecretsResponse(status: GithubSecretsStatus): Response {
  return Response.json(missingSecretsBody(status), { status: 503 });
}
