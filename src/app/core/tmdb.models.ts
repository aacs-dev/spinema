// Shapes returned by TMDB (through the Worker) and the app-level models built from them.

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

export type Region = 'RO' | 'PL';
export const REGIONS: readonly Region[] = ['RO', 'PL'];

export type MaxRuntime = 90 | 120 | 150 | null;
export const RUNTIME_OPTIONS: readonly MaxRuntime[] = [null, 90, 120, 150];

export interface Filters {
  maxRuntime: MaxRuntime;
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
  /** `en` when the Romanian overview was empty and the English one is shown instead. */
  overviewLanguage: 'ro' | 'en';
  posterPath: string | null;
  trailerKey: string | null;
  providers: Partial<Record<Region, RegionProviders>>;
}

/** The small slice of a movie kept in history and the watchlist. */
export interface MovieRef {
  id: number;
  title: string;
  year: string | null;
  posterPath: string | null;
}
