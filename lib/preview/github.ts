/**
 * Client-safe fetch of committed article MDX from the public GitHub repo.
 *
 * No `node:*` imports: this module runs in the `/preview` browser chunk.
 * Unauthenticated `api.github.com` contents API against
 * `woodengrass/nehsnepc_website` (public repo, public content — the preview
 * page is public-readable by design, see ADR-0006). Shows saved commits
 * only; unsaved Keystatic keystrokes are never visible here.
 */

export const PREVIEW_REPO = 'woodengrass/nehsnepc_website';

export const PREVIEW_DEFAULT_BRANCH = 'main';

/** Slug shape mirrors the server contract (`SLUG_RE` in lib/content-contract.ts). */
export const PREVIEW_SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** Branch names are free-form on GitHub; block only path-escape shapes. */
export function isSafeBranch(branch: string): boolean {
  if (branch.length === 0 || branch.length > 255) return false;
  if (branch.includes('..') || /[\s?#\\]/.test(branch)) return false;
  return true;
}

export type PreviewFetchErrorKind =
  | 'invalid-slug'
  | 'invalid-branch'
  | 'not-found'
  | 'rate-limited'
  | 'forbidden'
  | 'network';

export class PreviewFetchError extends Error {
  readonly kind: PreviewFetchErrorKind;

  constructor(kind: PreviewFetchErrorKind, message: string) {
    super(message);
    this.name = 'PreviewFetchError';
    this.kind = kind;
  }
}

function contentsUrl(slug: string, ext: string, branch: string): string {
  return (
    `https://api.github.com/repos/${PREVIEW_REPO}/contents/` +
    `content/articles/${encodeURIComponent(slug)}.${ext}?ref=${encodeURIComponent(branch)}`
  );
}

async function tryFetch(url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/vnd.github.raw' }
    });
  } catch {
    throw new PreviewFetchError('network', '網路連線失敗，請檢查連線後再試一次。');
  }
  return response;
}

function rateLimited(response: Response): boolean {
  if (response.status !== 403) return false;
  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining === '0') return true;
  // Unauthenticated abuse secondary limits sometimes surface as 403/429
  // without the header; treat a JSON rate-limit message as authoritative.
  return false;
}

/**
 * Fetch committed MDX source for `slug` on `branch`.
 * Tries `.mdx` then `.md` (production `getArticle` accepts both).
 * Throws `PreviewFetchError` with a Traditional-Chinese message.
 */
export async function fetchCommittedMdx(
  slug: string,
  branch: string
): Promise<{ raw: string; ext: 'mdx' | 'md' }> {
  if (!PREVIEW_SLUG_RE.test(slug)) {
    throw new PreviewFetchError(
      'invalid-slug',
      `slug「${slug}」格式不正確，僅接受小寫英文、數字、連字號與底線。`
    );
  }
  if (!isSafeBranch(branch)) {
    throw new PreviewFetchError('invalid-branch', `分支「${branch}」格式不正確。`);
  }
  let sawRateLimit = false;
  for (const ext of ['mdx', 'md'] as const) {
    const response = await tryFetch(contentsUrl(slug, ext, branch));
    if (response.ok) {
      return { raw: await response.text(), ext };
    }
    if (response.status === 404) continue;
    if (await isRateLimitBody(response)) {
      sawRateLimit = true;
      break;
    }
    if (rateLimited(response)) {
      sawRateLimit = true;
      break;
    }
    if (response.status === 403) {
      throw new PreviewFetchError('forbidden', 'GitHub 拒絕了這次讀取（403），請稍後再試。');
    }
    if (response.status >= 500) {
      throw new PreviewFetchError('network', `GitHub 伺服器錯誤（${response.status}），請稍後再試。`);
    }
    throw new PreviewFetchError('network', `讀取失敗（HTTP ${response.status}），請稍後再試。`);
  }
  if (sawRateLimit) {
    throw new PreviewFetchError(
      'rate-limited',
      '已達 GitHub 未登入讀取配額，請稍候再試（配額每小時重置）。'
    );
  }
  throw new PreviewFetchError(
    'not-found',
    `在分支「${branch}」找不到 slug「${slug}」的已提交文章（僅顯示已儲存的提交）。`
  );
}

async function isRateLimitBody(response: Response): Promise<boolean> {
  try {
    const clone = response.clone();
    const text = await clone.text();
    return /rate limit|abuse/i.test(text);
  } catch {
    return false;
  }
}
