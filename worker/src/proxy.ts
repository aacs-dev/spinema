// Pure helpers for the TMDB proxy. Kept free of Worker globals so they can be unit-tested in Node.

export const TMDB_BASE = 'https://api.themoviedb.org';

const HOUR = 60 * 60;

export const DEFAULT_ALLOWED_ORIGINS = ['https://aacs-dev.github.io', 'http://localhost:4200'];

export type RouteKind = 'genres' | 'discover' | 'movie' | 'providers' | 'regions';

export interface Route {
  kind: RouteKind;
  /** Cache lifetime in seconds. */
  ttl: number;
}

/** Only these TMDB paths are proxied. Everything else is a 404. */
export function matchRoute(pathname: string): Route | null {
  if (pathname === '/3/genre/movie/list') return { kind: 'genres', ttl: 24 * HOUR };
  if (pathname === '/3/discover/movie') return { kind: 'discover', ttl: HOUR };
  if (/^\/3\/movie\/\d{1,10}$/.test(pathname)) return { kind: 'movie', ttl: 6 * HOUR };
  if (pathname === '/3/watch/providers/movie') return { kind: 'providers', ttl: 24 * HOUR };
  // The countries TMDB has streaming data for, for the "Unde te uiți" picker.
  if (pathname === '/3/watch/providers/regions') return { kind: 'regions', ttl: 24 * HOUR };
  return null;
}

/**
 * Drops `api_key` (in any letter case) and sorts the remaining parameters so that
 * equivalent requests share one cache entry.
 */
export function sanitizeSearch(params: URLSearchParams): URLSearchParams {
  const entries = [...params.entries()]
    .filter(([key]) => key.toLowerCase() !== 'api_key')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return new URLSearchParams(entries);
}

export function buildUpstreamUrl(pathname: string, params: URLSearchParams): string {
  const url = new URL(pathname, TMDB_BASE);
  url.search = sanitizeSearch(params).toString();
  return url.toString();
}

export function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) return DEFAULT_ALLOWED_ORIGINS;
  const list = value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_ALLOWED_ORIGINS;
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

/** Reads TMDB's `status_message` when present, otherwise falls back to the HTTP status text. */
export async function tmdbErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { status_message?: unknown };
    if (typeof data.status_message === 'string' && data.status_message) {
      return data.status_message.slice(0, 200);
    }
  } catch {
    // Body was not JSON.
  }
  return response.statusText || `TMDB responded with ${response.status}`;
}
