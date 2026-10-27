import {
  buildUpstreamUrl,
  corsHeaders,
  jsonResponse,
  matchRoute,
  parseAllowedOrigins,
  tmdbErrorMessage,
} from './proxy';

export interface Env {
  /** TMDB API Read Access Token, set with `wrangler secret put TMDB_READ_TOKEN`. */
  TMDB_READ_TOKEN: string;
  /** Comma-separated list of origins allowed to call the proxy. */
  ALLOWED_ORIGINS?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

    // Browsers always send Origin on cross-origin requests. Unknown sites are refused outright.
    if (origin !== null && !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: 'origin_not_allowed', message: 'This origin may not use the proxy.' }, 403);
    }
    const cors = origin !== null ? corsHeaders(origin) : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'method_not_allowed', message: 'Only GET is allowed.' }, 405, {
        ...cors,
        Allow: 'GET',
      });
    }

    const route = matchRoute(url.pathname);
    if (!route) {
      return jsonResponse({ error: 'not_found', message: 'Unknown path.' }, 404, cors);
    }
    if (!env.TMDB_READ_TOKEN) {
      return jsonResponse({ error: 'misconfigured', message: 'TMDB_READ_TOKEN is not set.' }, 500, cors);
    }

    const upstreamUrl = buildUpstreamUrl(url.pathname, url.searchParams);
    // The sanitized upstream URL is the cache key, so `api_key` and parameter order never split entries.
    const cacheKey = new Request(upstreamUrl, { method: 'GET' });
    const cache = caches.default;

    let cached = await cache.match(cacheKey);
    let cacheStatus = 'HIT';

    if (!cached) {
      cacheStatus = 'MISS';
      let upstream: Response;
      try {
        upstream = await fetch(upstreamUrl, {
          headers: { Authorization: `Bearer ${env.TMDB_READ_TOKEN}`, Accept: 'application/json' },
          // TMDB's API never redirects. A redirect means a proxy or captive portal is in the way:
          // report that clearly instead of following it and surfacing the proxy's error page.
          redirect: 'manual',
        });
      } catch {
        return jsonResponse({ error: 'upstream_unreachable', message: 'TMDB could not be reached.' }, 502, cors);
      }

      if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get('Location') ?? '';
        const host = URL.canParse(location) ? new URL(location).host : 'unknown host';
        return jsonResponse(
          { error: 'upstream_redirected', message: `The request to TMDB was redirected to ${host}, probably by a network proxy.` },
          502,
          cors,
        );
      }

      if (!upstream.ok) {
        const message = await tmdbErrorMessage(upstream);
        return jsonResponse({ error: 'tmdb_error', status: upstream.status, message }, upstream.status, cors);
      }

      cached = new Response(await upstream.text(), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': `public, max-age=${route.ttl}`,
        },
      });
      ctx.waitUntil(cache.put(cacheKey, cached.clone()));
    }

    const response = new Response(cached.body, cached);
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    response.headers.set('X-Spinema-Cache', cacheStatus);
    return response;
  },
} satisfies ExportedHandler<Env>;
