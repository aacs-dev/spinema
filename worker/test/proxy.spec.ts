import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';
import { buildUpstreamUrl, matchRoute, parseAllowedOrigins, sanitizeSearch } from '../src/proxy';

describe('matchRoute', () => {
  it('allows only the five TMDB paths', () => {
    expect(matchRoute('/3/genre/movie/list')?.ttl).toBe(24 * 3600);
    expect(matchRoute('/3/discover/movie')?.ttl).toBe(3600);
    expect(matchRoute('/3/movie/550')?.ttl).toBe(6 * 3600);
    expect(matchRoute('/3/watch/providers/movie')?.kind).toBe('providers');
    expect(matchRoute('/3/watch/providers/regions')).toEqual({ kind: 'regions', ttl: 24 * 3600 });
  });

  it('rejects everything else', () => {
    for (const path of ['/', '/3/movie/550/credits', '/3/movie/abc', '/3/search/movie', '/3/account', '/3/genre/tv/list', '/3/watch/providers/tv', '/3/watch/providers/regions/x']) {
      expect(matchRoute(path)).toBeNull();
    }
  });
});

describe('sanitizeSearch', () => {
  it('strips api_key in any case and sorts parameters', () => {
    const out = sanitizeSearch(new URLSearchParams('page=2&api_key=x&API_KEY=y&language=ro-RO'));
    expect(out.toString()).toBe('language=ro-RO&page=2');
  });

  it('builds the upstream URL on api.themoviedb.org', () => {
    expect(buildUpstreamUrl('/3/movie/1', new URLSearchParams('api_key=1&language=ro-RO'))).toBe(
      'https://api.themoviedb.org/3/movie/1?language=ro-RO',
    );
  });
});

describe('parseAllowedOrigins', () => {
  it('splits and trims the configured list', () => {
    expect(parseAllowedOrigins(' https://a.github.io/ , http://localhost:4200')).toEqual([
      'https://a.github.io',
      'http://localhost:4200',
    ]);
  });
});

describe('worker fetch', () => {
  const env: Env = { TMDB_READ_TOKEN: 'secret-token', ALLOWED_ORIGINS: 'http://localhost:4200' };
  const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
  const store = new Map<string, Response>();
  const fetchMock = vi.fn();

  beforeEach(() => {
    store.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('caches', {
      default: {
        match: async (req: Request) => store.get(req.url)?.clone(),
        put: async (req: Request, res: Response) => void store.set(req.url, res),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const call = (path: string, init: RequestInit = {}) =>
    worker.fetch(
      new Request(`https://proxy.example${path}`, { headers: { Origin: 'http://localhost:4200' }, ...init }),
      env,
      ctx,
    );

  it('forwards allowed GETs with the bearer token and without api_key', async () => {
    fetchMock.mockResolvedValue(new Response('{"genres":[]}', { status: 200 }));
    const res = await call('/3/genre/movie/list?language=ro-RO&api_key=leak');

    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4200');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.themoviedb.org/3/genre/movie/list?language=ro-RO');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
  });

  it('serves the second identical request from cache', async () => {
    fetchMock.mockResolvedValue(new Response('{"genres":[]}', { status: 200 }));
    await call('/3/genre/movie/list?language=ro-RO');
    const second = await call('/3/genre/movie/list?language=ro-RO');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.headers.get('X-Spinema-Cache')).toBe('HIT');
  });

  it('returns 404 for paths outside the allowlist', async () => {
    const res = await call('/3/search/movie?query=x');
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses non-GET methods', async () => {
    const res = await call('/3/genre/movie/list', { method: 'POST' });
    expect(res.status).toBe(405);
  });

  it('refuses unknown origins', async () => {
    const res = await worker.fetch(
      new Request('https://proxy.example/3/genre/movie/list', { headers: { Origin: 'https://evil.example' } }),
      env,
      ctx,
    );
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('does not follow redirects and reports them as a proxy problem', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 307, headers: { Location: 'https://gateway.zscloud.net/_sm_ccik?x=1' } }),
    );
    const res = await call('/3/discover/movie?with_genres=35&page=7');
    expect(fetchMock.mock.calls[0][1].redirect).toBe('manual');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: 'upstream_redirected',
      message: 'The request to TMDB was redirected to gateway.zscloud.net, probably by a network proxy.',
    });
  });

  it('passes TMDB errors through with their status and a short message', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"status_code":34,"status_message":"The resource you requested could not be found."}', {
        status: 404,
      }),
    );
    const res = await call('/3/movie/999999999');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: 'tmdb_error',
      status: 404,
      message: 'The resource you requested could not be found.',
    });
  });
});
