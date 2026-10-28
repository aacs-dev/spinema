import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { STRINGS } from '../i18n/strings';
import { normalizeRo, yearOf } from './text';
import {
  DiscoverPage,
  Filters,
  Genre,
  GenreListResponse,
  MovieDetails,
  MovieDetailsResponse,
  Platform,
  Region,
  TmdbVideo,
  WatchProvidersResponse,
  WatchRegionsResponse,
  isRegionCode,
} from './tmdb.models';
import { API_CONFIG } from './tokens';

const FALLBACK_LANGUAGE = 'en-US';
const MIN_VOTES = 300;
/** With a platform filter, only what can be started right away: subscription or free. Not rent or buy. */
const PLAYABLE_NOW = 'flatrate|free|ads';

export type PosterSize = 'w92' | 'w342';

/** Prefers an official YouTube trailer, then any YouTube trailer, the interface language before others. */
export function pickTrailerKey(videos: readonly TmdbVideo[], language = 'ro'): string | null {
  const trailers = videos.filter(
    (v) => v.site === 'YouTube' && v.type === 'Trailer' && /^[A-Za-z0-9_-]{11}$/.test(v.key),
  );
  if (trailers.length === 0) return null;
  const score = (v: TmdbVideo) => (v.official ? 2 : 0) + (v.iso_639_1 === language ? 1 : 0);
  return [...trailers].sort((a, b) => score(b) - score(a))[0].key;
}

/** Typed access to the Worker proxy with in-memory caches. Cached promises are dropped on failure. */
@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly t = inject(STRINGS);
  private readonly base = this.config.workerUrl.replace(/\/$/, '');

  private genresRequest: Promise<Genre[]> | null = null;
  private readonly discoverCache = new Map<string, Promise<DiscoverPage>>();
  private readonly detailsCache = new Map<number, Promise<MovieDetails>>();
  private readonly platformsCache = new Map<Region, Promise<Platform[]>>();
  private regionsRequest: Promise<Region[]> | null = null;

  imageUrl(path: string, size: PosterSize): string {
    return `${this.config.imageBaseUrl}/${size}${path}`;
  }

  genres(): Promise<Genre[]> {
    this.genresRequest ??= this.get<GenreListResponse>('/3/genre/movie/list', { language: this.t.tmdbLanguage })
      .then((res) => res.genres.map((g) => ({ id: g.id, name: normalizeRo(g.name) })))
      .catch((error: unknown) => {
        this.genresRequest = null;
        throw error;
      });
    return this.genresRequest;
  }

  discover(genreId: number, filters: Filters, page: number): Promise<DiscoverPage> {
    // Sorted, so the same platforms in another order share one cache entry here and in the Worker.
    const platformIds = [...(filters.platforms?.ids ?? [])].sort((a, b) => a - b);
    const platformsKey = filters.platforms && platformIds.length > 0 ? `${filters.platforms.region}:${platformIds.join(',')}` : 'all';
    const key = [genreId, filters.maxRuntime ?? 'any', platformsKey, filters.decade ?? 'any', filters.minRating ?? 'any', page].join('|');
    return this.cached(this.discoverCache, key, () => {
      const params: Record<string, string> = {
        with_genres: String(genreId),
        'vote_count.gte': String(MIN_VOTES),
        sort_by: 'popularity.desc',
        include_adult: 'false',
        language: this.t.tmdbLanguage,
        page: String(page),
      };
      if (filters.maxRuntime !== null) params['with_runtime.lte'] = String(filters.maxRuntime);
      if (filters.decade !== null) {
        params['primary_release_date.gte'] = `${filters.decade}-01-01`;
        params['primary_release_date.lte'] = `${filters.decade + 9}-12-31`;
      }
      // With at least MIN_VOTES votes behind it, the average is a fair rating.
      if (filters.minRating !== null) params['vote_average.gte'] = String(filters.minRating);
      if (filters.platforms && platformIds.length > 0) {
        params['watch_region'] = filters.platforms.region;
        // A pipe is TMDB's "or": a movie on any one of the platforms qualifies.
        params['with_watch_providers'] = platformIds.join('|');
        params['with_watch_monetization_types'] = PLAYABLE_NOW;
      }
      return this.get<DiscoverPage>('/3/discover/movie', params).then((res) => ({
        ...res,
        results: res.results.map((m) => ({ ...m, title: normalizeRo(m.title) })),
      }));
    });
  }

  /** The countries TMDB has streaming data for, for the "Unde te uiți" picker. */
  regions(): Promise<Region[]> {
    this.regionsRequest ??= this.get<WatchRegionsResponse>('/3/watch/providers/regions', { language: this.t.tmdbLanguage })
      .then((res) => res.results.map((r) => r.iso_3166_1).filter(isRegionCode))
      .catch((error: unknown) => {
        this.regionsRequest = null;
        throw error;
      });
    return this.regionsRequest;
  }

  /** Every streaming platform TMDB knows in a region, for the "Platformele mele" setting. */
  platforms(region: Region): Promise<Platform[]> {
    return this.cached(this.platformsCache, region, async () => {
      const res = await this.get<WatchProvidersResponse>('/3/watch/providers/movie', {
        watch_region: region,
        language: this.t.tmdbLanguage,
      });
      return res.results.map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
    });
  }

  details(id: number): Promise<MovieDetails> {
    return this.cached(this.detailsCache, id, async () => {
      const res = await this.get<MovieDetailsResponse>(`/3/movie/${id}`, {
        append_to_response: 'videos,watch/providers',
        language: this.t.tmdbLanguage,
        // Without this, `videos` only lists videos in the interface language, and most trailers are in English.
        include_video_language: [...new Set([this.t.lang, 'en'])].join(',') + ',null',
      });

      let overview = normalizeRo(res.overview?.trim() ?? '');
      let overviewLanguage: MovieDetails['overviewLanguage'] = this.t.lang;
      // Many films have no Romanian or Hungarian overview yet; the English one beats none.
      if (!overview && this.t.lang !== 'en') {
        const english = await this.get<MovieDetailsResponse>(`/3/movie/${id}`, { language: FALLBACK_LANGUAGE });
        overview = english.overview?.trim() ?? '';
        overviewLanguage = 'en';
      }

      const providers: MovieDetails['providers'] = {};
      for (const [code, entry] of Object.entries(res['watch/providers']?.results ?? {})) {
        if (isRegionCode(code)) providers[code] = entry;
      }

      return {
        id: res.id,
        title: normalizeRo(res.title),
        originalTitle: res.original_title,
        originalLanguage: res.original_language ?? null,
        year: yearOf(res.release_date),
        rating: typeof res.vote_average === 'number' && res.vote_average > 0 ? res.vote_average : null,
        runtime: res.runtime && res.runtime > 0 ? res.runtime : null,
        genres: (res.genres ?? []).map((g) => normalizeRo(g.name)),
        overview,
        overviewLanguage,
        posterPath: res.poster_path,
        trailerKey: pickTrailerKey(res.videos?.results ?? [], this.t.lang),
        providers,
      };
    });
  }

  private get<T>(path: string, params: Record<string, string>): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.base}${path}`, { params: new HttpParams({ fromObject: params }) }));
  }

  private cached<K, V>(cache: Map<K, Promise<V>>, key: K, load: () => Promise<V>): Promise<V> {
    let entry = cache.get(key);
    if (!entry) {
      entry = load().catch((error: unknown) => {
        cache.delete(key);
        throw error;
      });
      cache.set(key, entry);
    }
    return entry;
  }
}
