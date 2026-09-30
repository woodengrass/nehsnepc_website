import { getGithubGateFailure, isLocalMode } from '@/lib/keystatic/storage';

export const dynamic = 'force-dynamic';

type RouteHandler = {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};

let cached: RouteHandler | null = null;

/**
 * Lazy API bootstrap: in GitHub mode every guard (preview kill, secrets 503,
 * repo pin 503, origin-configured 503, origin equality 403) runs BEFORE the
 * Keystatic config/handler is constructed, and GitHub mode never falls back
 * to local writes. Local loopback mode (`NODE_ENV=development` +
 * `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE=1`) skips the guards. Neither failure
 * path invokes the official handler.
 */
async function getHandler(request: Request): Promise<RouteHandler | Response> {
  if (!isLocalMode()) {
    const failure = getGithubGateFailure(request);
    if (failure) return failure;
  }
  if (!cached) {
    const [{ makeRouteHandler }, { default: keystaticConfig }] = await Promise.all([
      import('@keystatic/next/route-handler'),
      import('../../../../keystatic.config')
    ]);
    cached = makeRouteHandler({ config: keystaticConfig });
  }
  return cached;
}

export async function GET(request: Request): Promise<Response> {
  const handler = await getHandler(request);
  if (handler instanceof Response) return handler;
  return handler.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  const handler = await getHandler(request);
  if (handler instanceof Response) return handler;
  return handler.POST(request);
}
