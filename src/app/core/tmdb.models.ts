// Shapes returned by TMDB (through the Worker) and the app-level models built from them.
import type { Language } from '../i18n/language';

export interface Genre {
  id: number;
  name: string;
}

export interface GenreListResponse {
  genres: Genre[];
}

export interface MovieSummary {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
}

export interface DiscoverPage {
  page: number;
  results: MovieSummary[];
  total_pages: number;
  total_results: number;
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1?: string;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface RegionProviders {
  link?: string;
  flatrate?: Provider[];
  free?: Provider[];
  ads?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
}

export interface MovieDetailsResponse {
  id: number;
  title: string;
  original_title: string;
  original_language?: string;
  overview: string | null;
  release_date?: string;
  runtime?: number | null;
  vote_average?: number;
  poster_path: string | null;
  genres?: Genre[];
  videos?: { results: TmdbVideo[] };
  'watch/providers'?: { results: Record<string, RegionProviders> };
}

/** ISO 3166-1 alpha-2 country code, the way TMDB keys its streaming data: "RO", "PL", "US". */
export type Region = string;
export const isRegionCode = (value: unknown): value is Region => typeof value === 'string' && /^[A-Z]{2}$/.test(value);

/** `/3/watch/providers/regions`: the countries TMDB has streaming data for. */
export interface WatchRegionsResponse {
  results: { iso_3166_1: string; english_name: string }[];
}

export type MaxRuntime = 90 | 120 | 150 | null;
export const RUNTIME_OPTIONS: readonly MaxRuntime[] = [null, 90, 120, 150];

/** First year of a decade; null means any year. With 300+ votes, little older than the '60s remains. */
export type Decade = 1960 | 1970 | 1980 | 1990 | 2000 | 2010 | 2020 | null;
export const DECADE_OPTIONS: readonly Decade[] = [null, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

/** Lowest TMDB average accepted; null means any rating. */
export type MinRating = 6 | 7 | 8 | null;
export const RATING_OPTIONS: readonly MinRating[] = [null, 6, 7, 8];

/** The streaming platforms the user has, in one region. */
export interface PlatformFilter {
  region: Region;
  ids: readonly number[];
}

export interface Filters {
  maxRuntime: MaxRuntime;
  /** Only movies included in a subscription, or free, on one of these platforms. Null: any platform. */
  platforms: PlatformFilter | null;
  decade: Decade;
  minRating: MinRating;
}

/** `/3/watch/providers/movie`: every platform TMDB knows in a region. */
export interface WatchProvidersResponse {
  results: Provider[];
}

/** A platform the user can pick in settings. */
export interface Platform {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface MovieDetails {
  id: number;
  title: string;
  originalTitle: string;
  originalLanguage: string | null;
  year: string | null;
  rating: number | null;
  runtime: number | null;
  genres: string[];
  overview: string;
  /** The interface language, or `en` when its overview was empty and the English one is shown instead. */
  overviewLanguage: Language;
  posterPath: string | null;
  trailerKey: string | null;
  /** Every country TMDB lists for the movie, so the ticket can show any of them. */
  providers: Record<Region, RegionProviders>;
}

/** The small slice of a movie kept in history and the watchlist. */
export interface MovieRef {
  id: number;
  title: string;
  year: string | null;
  posterPath: string | null;
}
