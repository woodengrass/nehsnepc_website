import { buildMissingSecretsResponse, getGithubSecretsStatus, isLocalMode } from '@/lib/keystatic/storage';

type RouteHandler = {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};

let cached: RouteHandler | null = null;

/**
 * Lazy API bootstrap: secrets are checked BEFORE the Keystatic config/handler
 * is constructed, and GitHub mode never falls back to local writes.
 */
async function getHandler(): Promise<RouteHandler | Response> {
  if (!isLocalMode()) {
    const status = getGithubSecretsStatus();
    if (!status.ok) return buildMissingSecretsResponse(status);
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
  const handler = await getHandler();
  if (handler instanceof Response) return handler;
  return handler.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  const handler = await getHandler();
  if (handler instanceof Response) return handler;
  return handler.POST(request);
}
