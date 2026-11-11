// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../worker/index';
import type { Env, ErrorResponse, HealthResponse } from '../worker/types';

function makeCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    props: {},
  } as unknown as ExecutionContext;
}

describe('Worker API', () => {
  let assetsFetch: ReturnType<typeof vi.fn>;
  let env: Env;
  let ctx: ExecutionContext;

  const call = (path: string, init?: RequestInit) =>
    worker.fetch(new Request(`http://localhost${path}`, init), env, ctx);

  beforeEach(() => {
    assetsFetch = vi.fn().mockResolvedValue(new Response('asset'));
    env = { ASSETS: { fetch: assetsFetch } as unknown as Fetcher, ENVIRONMENT: 'test' };
    ctx = makeCtx();
  });

  describe('GET /api/health', () => {
    it('returns HTTP 200', async () => {
      const response = await call('/api/health');
      expect(response.status).toBe(200);
    });

    it('returns correct content type', async () => {
      const response = await call('/api/health');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('disables caching', async () => {
      const response = await call('/api/health');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns the expected payload', async () => {
      const response = await call('/api/health');
      const data = (await response.json()) as HealthResponse;
      expect(data.service).toBe('datamind-ai');
      expect(data.phase).toBe('0');
      expect(data.status).toBe('ok');
    });

    it('returns valid ISO timestamp', async () => {
      const response = await call('/api/health');
      const data = (await response.json()) as HealthResponse;
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });

    it('accepts a trailing slash', async () => {
      const response = await call('/api/health/');
      expect(response.status).toBe(200);
    });
  });

  describe('HEAD /api/health', () => {
    it('returns 200 with headers and an empty body', async () => {
      const response = await call('/api/health', { method: 'HEAD' });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(await response.text()).toBe('');
    });
  });

  describe('Unknown API endpoints', () => {
    it('returns 404 JSON for unknown API path', async () => {
      const response = await call('/api/unknown');
      expect(response.status).toBe(404);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('Not Found');
      expect(data.path).toBe('/api/unknown');
    });

    it('returns 404 JSON for bare /api instead of the SPA', async () => {
      const response = await call('/api');
      expect(response.status).toBe(404);
      expect(assetsFetch).not.toHaveBeenCalled();
    });
  });

  describe('Non-GET methods on /api/health', () => {
    it('returns 405 with Allow header and a full error body for POST', async () => {
      const response = await call('/api/health', { method: 'POST' });
      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('GET, HEAD');
      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('Method Not Allowed');
      expect(data.path).toBe('/api/health');
    });
  });

  describe('Static assets', () => {
    it('delegates non-API paths to the assets binding', async () => {
      const response = await call('/upload');
      expect(assetsFetch).toHaveBeenCalledTimes(1);
      expect(await response.text()).toBe('asset');
    });
  });
});
