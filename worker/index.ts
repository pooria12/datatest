import type { Env, ErrorResponse, HealthResponse } from './types';

function createHealthResponse(): HealthResponse {
  return {
    status: 'ok',
    service: 'datamind-ai',
    phase: '0',
    timestamp: new Date().toISOString(),
  };
}

function createErrorResponse(error: string, message: string, path: string): ErrorResponse {
  return { error, message, path };
}

/** Removes trailing slashes so `/api/health/` behaves like `/api/health`. */
function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function isApiRequest(normalizedPathname: string): boolean {
  return normalizedPathname === '/api' || normalizedPathname.startsWith('/api/');
}

/** JSON response helper. HEAD requests get the same status and headers with no body. */
function jsonResponse(
  request: Request,
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function handleApiRequest(request: Request, pathname: string, normalizedPathname: string): Response {
  if (normalizedPathname === '/api/health') {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonResponse(
        request,
        createErrorResponse('Method Not Allowed', 'Only GET and HEAD methods are allowed', pathname),
        405,
        { Allow: 'GET, HEAD' }
      );
    }
    return jsonResponse(request, createHealthResponse(), 200, { 'Cache-Control': 'no-store' });
  }

  return jsonResponse(
    request,
    createErrorResponse('Not Found', `API endpoint ${pathname} not found`, pathname),
    404
  );
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    const normalizedPathname = normalizePathname(pathname);

    if (isApiRequest(normalizedPathname)) {
      return handleApiRequest(request, pathname, normalizedPathname);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
