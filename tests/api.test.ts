import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, checkHealth } from '../src/lib/api';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not send Content-Type on GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await api.get('/health');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).has('Content-Type')).toBe(false);
  });

  it('sends a JSON Content-Type when a body exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await api.post('/things', { a: 1 });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('throws ApiError with the server message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'nope' }, 404)));
    await expect(api.get('/missing')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'nope',
      status: 404,
    });
    await expect(api.get('/missing')).rejects.toBeInstanceOf(ApiError);
  });

  it('checkHealth returns data on success and an error message on failure', async () => {
    const payload = { status: 'ok', service: 'datamind-ai', phase: '0', timestamp: new Date().toISOString() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(payload)));
    expect((await checkHealth()).data).toEqual(payload);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ message: 'down' }, 500)));
    expect((await checkHealth()).error).toBe('down');
  });
});
