import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { normalizeRo, yearOf } from './text';
import {
  DiscoverPage,
  Filters,
  Genre,
  GenreListResponse,
  MovieDetails,
  MovieDetailsResponse,
  REGIONS,
  RegionProviders,
  TmdbVideo,
} from './tmdb.models';
import { API_CONFIG } from './tokens';

const LANGUAGE = 'ro-RO';
const FALLBACK_LANGUAGE = 'en-US';
const MIN_VOTES = 300;

export type PosterSize = 'w92' | 'w342';

/** Prefers an official YouTube trailer, then any YouTube trailer, Romanian before other languages. */
export function pickTrailerKey(videos: readonly TmdbVideo[]): string | null {
  const trailers = videos.filter(
    (v) => v.site === 'YouTube' && v.type === 'Trailer' && /^[A-Za-z0-9_-]{11}$/.test(v.key),
  );
  if (trailers.length === 0) return null;
  const score = (v: TmdbVideo) => (v.official ? 2 : 0) + (v.iso_639_1 === 'ro' ? 1 : 0);
  return [...trailers].sort((a, b) => score(b) - score(a))[0].key;
}

/** Typed access to the Worker proxy with in-memory caches. Cached promises are dropped on failure. */
@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly base = this.config.workerUrl.replace(/\/$/, '');

  private genresRequest: Promise<Genre[]> | null = null;
  private readonly discoverCache = new Map<string, Promise<DiscoverPage>>();
  private readonly detailsCache = new Map<number, Promise<MovieDetails>>();

  imageUrl(path: string, size: PosterSize): string {
    return `${this.config.imageBaseUrl}/${size}${path}`;
  }

  genres(): Promise<Genre[]> {
    this.genresRequest ??= this.get<GenreListResponse>('/3/genre/movie/list', { language: LANGUAGE })
      .then((res) => res.genres.map((g) => ({ id: g.id, name: normalizeRo(g.name) })))
      .catch((error: unknown) => {
        this.genresRequest = null;
        throw error;
      });
    return this.genresRequest;
  }

  discover(genreId: number, filters: Filters, page: number): Promise<DiscoverPage> {
    const key = `${genreId}|${filters.maxRuntime ?? 'any'}|${page}`;
    return this.cached(this.discoverCache, key, () => {
      const params: Record<string, string> = {
        with_genres: String(genreId),
        'vote_count.gte': String(MIN_VOTES),
        sort_by: 'popularity.desc',
        include_adult: 'false',
        language: LANGUAGE,
        page: String(page),
      };
      if (filters.maxRuntime !== null) params['with_runtime.lte'] = String(filters.maxRuntime);
      return this.get<DiscoverPage>('/3/discover/movie', params).then((res) => ({
        ...res,
        results: res.results.map((m) => ({ ...m, title: normalizeRo(m.title) })),
      }));
    });
  }

  details(id: number): Promise<MovieDetails> {
    return this.cached(this.detailsCache, id, async () => {
      const res = await this.get<MovieDetailsResponse>(`/3/movie/${id}`, {
        append_to_response: 'videos,watch/providers',
        language: LANGUAGE,
        // Without this, `videos` only lists Romanian videos, and most trailers are in English.
        include_video_language: 'ro,en,null',
      });

      let overview = normalizeRo(res.overview?.trim() ?? '');
      let overviewLanguage: MovieDetails['overviewLanguage'] = 'ro';
      if (!overview) {
        const english = await this.get<MovieDetailsResponse>(`/3/movie/${id}`, { language: FALLBACK_LANGUAGE });
        overview = english.overview?.trim() ?? '';
        overviewLanguage = 'en';
      }

      const allProviders = res['watch/providers']?.results ?? {};
      const providers: MovieDetails['providers'] = {};
      for (const region of REGIONS) {
        const entry: RegionProviders | undefined = allProviders[region];
        if (entry) providers[region] = entry;
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
        trailerKey: pickTrailerKey(res.videos?.results ?? []),
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
