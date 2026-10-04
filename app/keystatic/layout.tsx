import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { permanentRedirect } from 'next/navigation';

import {
  getCanonicalOrigin,
  isCanonicalOriginConfigured,
  isLocalMode,
  isPreviewEnv,
  normalizeOrigin
} from '@/lib/keystatic/storage';

import KeystaticApp from './keystatic-client';

// The Keystatic admin UI is OAuth-gated and must never be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

// Route-scoped admin shell. The shared root layout stays free of Keystatic
// imports so editor code never enters public bundles.
//
// Fail-closed UI guard (GitHub mode only; local loopback mode skips it):
// - Preview deployments render an unavailable notice (API answers 403 there).
// - A safe GET/HEAD arriving on a non-canonical host is redirected (308) to
//   the literal configured origin — the request Host is never reflected.
//   (API gate accepts the apex as an alias of the www canonical via
//   originsEquivalent; the redirect target stays the literal www canonical.)
// Layouts only serve GET/HEAD, so the redirect is inherently safe-method-only.
// Prerender-safe: missing headers/env simply render the app so builds without
// secrets succeed.
export default async function KeystaticLayout() {
  if (!isLocalMode()) {
    if (isPreviewEnv()) {
      return (
        <div data-keystatic-root>
          <main data-keystatic-unavailable>
            <h1>Admin unavailable</h1>
            <p>The Keystatic admin is unavailable on preview deployments.</p>
          </main>
        </div>
      );
    }
    if (isCanonicalOriginConfigured()) {
      const canonical = getCanonicalOrigin();
      // NOTE: `permanentRedirect` throws (NEXT_REDIRECT) and must stay OUTSIDE
      // the try — a bare catch would swallow the redirect. Only the `headers()`
      // read is guarded so prerenders without headers still render the app.
      let requestOrigin = '';
      try {
        const h = await headers();
        const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
        const proto = h.get('x-forwarded-proto') ?? 'https';
        requestOrigin = host ? normalizeOrigin(`${proto}://${host}`) : '';
      } catch {
        // Headers unavailable (e.g. prerender): render the app.
      }
      if (requestOrigin && requestOrigin !== canonical) {
        permanentRedirect(`${canonical}/keystatic`);
      }
    }
  }
  return (
    <div data-keystatic-root>
      <KeystaticApp />
    </div>
  );
}
