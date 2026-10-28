import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MovieDetailsResponse, TmdbVideo } from './tmdb.models';
import { TmdbService, pickTrailerKey } from './tmdb.service';
import { en } from '../i18n/en';
import { hu } from '../i18n/hu';
import { STRINGS } from '../i18n/strings';
import { API_CONFIG } from './tokens';

const BASE = 'https://proxy.test';
const tick = () => new Promise((resolve) => setTimeout(resolve));

function detailsResponse(overrides: Partial<MovieDetailsResponse> = {}): MovieDetailsResponse {
  return {
    id: 550,
    title: 'Clubul luptătorilor',
    original_title: 'Fight Club',
    original_language: 'en',
    overview: 'Un funcționar insomniac...',
    release_date: '1999-10-15',
    runtime: 139,
    vote_average: 8.433,
    poster_path: '/p.jpg',
    genres: [{ id: 18, name: 'Dramă' }],
    videos: { results: [] },
    'watch/providers': { results: {} },
    ...overrides,
  };
}

describe('TmdbService', () => {
  let tmdb: TmdbService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { workerUrl: `${BASE}/`, imageBaseUrl: 'https://img.test/t/p' } },
      ],
    });
    tmdb = TestBed.inject(TmdbService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads genres in Romanian through the proxy and normalizes cedillas to comma-below', async () => {
    const promise = tmdb.genres();
    const req = http.expectOne((r) => r.url === `${BASE}/3/genre/movie/list`);
    expect(req.request.params.get('language')).toBe('ro-RO');
    req.flush({ genres: [{ id: 28, name: 'Acţiune' }, { id: 53, name: 'Ştiinţifico-fantastic' }] });
    expect(await promise).toEqual([
      { id: 28, name: 'Acțiune' },
      { id: 53, name: 'Științifico-fantastic' },
    ]);
  });

  it('never sends an api_key: the proxy adds the token', async () => {
    const promise = tmdb.genres();
    const req = http.expectOne(() => true);
    expect(req.request.params.has('api_key')).toBe(false);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ genres: [] });
    await promise;
  });

  it('builds the discover query from the brief and caches per genre + filters + page', async () => {
    const first = tmdb.discover(35, { maxRuntime: 120, platforms: null, decade: null, minRating: null }, 3);
    const again = tmdb.discover(35, { maxRuntime: 120, platforms: null, decade: null, minRating: null }, 3);
    const req = http.expectOne((r) => r.url === `${BASE}/3/discover/movie`);
    const p = req.request.params;
    expect(p.get('with_genres')).toBe('35');
    expect(p.get('vote_count.gte')).toBe('300');
    expect(p.get('sort_by')).toBe('popularity.desc');
    expect(p.get('include_adult')).toBe('false');
    expect(p.get('language')).toBe('ro-RO');
    expect(p.get('page')).toBe('3');
    expect(p.get('with_runtime.lte')).toBe('120');
    req.flush({ page: 3, results: [], total_pages: 1, total_results: 0 });
    expect(await first).toBe(await again);

    const other = tmdb.discover(35, { maxRuntime: null, platforms: null, decade: null, minRating: null }, 3);
    const req2 = http.expectOne((r) => r.url === `${BASE}/3/discover/movie`);
    expect(req2.request.params.has('with_runtime.lte')).toBe(false);
    req2.flush({ page: 3, results: [], total_pages: 1, total_results: 0 });
    await other;
  });

  it('asks only for movies playable now on the chosen platforms, in any order', async () => {
    const first = tmdb.discover(35, { maxRuntime: null, platforms: { region: 'PL', ids: [1899, 8] }, decade: null, minRating: null }, 1);
    const sameSet = tmdb.discover(35, { maxRuntime: null, platforms: { region: 'PL', ids: [8, 1899] }, decade: null, minRating: null }, 1);
    const req = http.expectOne((r) => r.url === `${BASE}/3/discover/movie`);
    const p = req.request.params;
    expect(p.get('watch_region')).toBe('PL');
    expect(p.get('with_watch_providers')).toBe('8|1899');
    expect(p.get('with_watch_monetization_types')).toBe('flatrate|free|ads');
    req.flush({ page: 1, results: [], total_pages: 1, total_results: 0 });
    expect(await first).toBe(await sameSet);

    // Another region, or no platforms at all, is another query.
    const otherRegion = tmdb.discover(35, { maxRuntime: null, platforms: { region: 'RO', ids: [8, 1899] }, decade: null, minRating: null }, 1);
    http.expectOne((r) => r.params.get('watch_region') === 'RO').flush({ page: 1, results: [], total_pages: 1, total_results: 0 });
    await otherRegion;
    const anyPlatform = tmdb.discover(35, { maxRuntime: null, platforms: null, decade: null, minRating: null }, 1);
    const req3 = http.expectOne(() => true);
    expect(req3.request.params.has('with_watch_providers')).toBe(false);
    expect(req3.request.params.has('watch_region')).toBe(false);
    req3.flush({ page: 1, results: [], total_pages: 1, total_results: 0 });
    await anyPlatform;
  });

  it('limits the search to a decade and a minimum rating, each its own cache entry', async () => {
    const nineties = tmdb.discover(35, { maxRuntime: null, platforms: null, decade: 1990, minRating: 7 }, 1);
    const req = http.expectOne((r) => r.url === `${BASE}/3/discover/movie`);
    const p = req.request.params;
    expect(p.get('primary_release_date.gte')).toBe('1990-01-01');
    expect(p.get('primary_release_date.lte')).toBe('1999-12-31');
    expect(p.get('vote_average.gte')).toBe('7');
    req.flush({ page: 1, results: [], total_pages: 1, total_results: 0 });
    await nineties;

    const twenties = tmdb.discover(35, { maxRuntime: null, platforms: null, decade: 2020, minRating: null }, 1);
    const req2 = http.expectOne(() => true);
    expect(req2.request.params.get('primary_release_date.lte')).toBe('2029-12-31');
    expect(req2.request.params.has('vote_average.gte')).toBe(false);
    req2.flush({ page: 1, results: [], total_pages: 1, total_results: 0 });
    await twenties;
  });

  it('lists the countries TMDB has streaming data for, once, keeping only valid codes', async () => {
    const first = tmdb.regions();
    const again = tmdb.regions();
    const req = http.expectOne((r) => r.url === `${BASE}/3/watch/providers/regions`);
    req.flush({
      results: [
        { iso_3166_1: 'RO', english_name: 'Romania' },
        { iso_3166_1: 'MD', english_name: 'Moldova' },
        { iso_3166_1: 'bad', english_name: '?' },
      ],
    });
    expect(await first).toEqual(['RO', 'MD']);
    expect(await again).toBe(await first);
  });

  it('lists the platforms of a region once and maps them', async () => {
    const first = tmdb.platforms('RO');
    const again = tmdb.platforms('RO');
    const req = http.expectOne((r) => r.url === `${BASE}/3/watch/providers/movie`);
    expect(req.request.params.get('watch_region')).toBe('RO');
    req.flush({ results: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 0 }] });
    expect(await first).toEqual([{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }]);
    expect(await again).toBe(await first);
  });

  it('drops a failed request from the cache so a retry goes to the network', async () => {
    const failing = tmdb.discover(35, { maxRuntime: null, platforms: null, decade: null, minRating: null }, 1);
    http.expectOne(() => true).flush('down', { status: 502, statusText: 'Bad Gateway' });
    await expect(failing).rejects.toBeTruthy();

    const retry = tmdb.discover(35, { maxRuntime: null, platforms: null, decade: null, minRating: null }, 1);
    http.expectOne(() => true).flush({ page: 1, results: [], total_pages: 0, total_results: 0 });
    await expect(retry).resolves.toBeTruthy();
  });

  it('maps details: Romanian data, one-decimal-ready rating, runtime, providers for every country', async () => {
    const promise = tmdb.details(550);
    const req = http.expectOne(`${BASE}/3/movie/550?append_to_response=videos,watch/providers&language=ro-RO&include_video_language=ro,en,null`);
    req.flush(
      detailsResponse({
        'watch/providers': {
          results: {
            RO: { link: 'https://tmdb/ro', flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 }] },
            PL: { buy: [] },
            US: { flatrate: [] },
          },
        },
      }),
    );
    const movie = await promise;
    expect(movie.title).toBe('Clubul luptătorilor');
    expect(movie.originalTitle).toBe('Fight Club');
    expect(movie.year).toBe('1999');
    expect(movie.rating).toBeCloseTo(8.433);
    expect(movie.runtime).toBe(139);
    expect(movie.overviewLanguage).toBe('ro');
    expect(Object.keys(movie.providers).sort()).toEqual(['PL', 'RO', 'US']);
  });

  it('falls back to the English overview when the Romanian one is empty', async () => {
    const promise = tmdb.details(550);
    http.expectOne((r) => r.params.get('language') === 'ro-RO').flush(detailsResponse({ overview: '   ' }));
    await tick();
    const english = http.expectOne((r) => r.url === `${BASE}/3/movie/550` && r.params.get('language') === 'en-US');
    english.flush({ ...detailsResponse(), overview: 'An insomniac office worker...' });
    const movie = await promise;
    expect(movie.overview).toBe('An insomniac office worker...');
    expect(movie.overviewLanguage).toBe('en');
  });

  it('does not ask for English when the Romanian overview exists', async () => {
    const promise = tmdb.details(550);
    http.expectOne(() => true).flush(detailsResponse());
    const movie = await promise;
    expect(movie.overviewLanguage).toBe('ro');
    await tick();
    http.expectNone(() => true);
  });

  it('builds TMDB image URLs', () => {
    expect(tmdb.imageUrl('/abc.jpg', 'w342')).toBe('https://img.test/t/p/w342/abc.jpg');
  });
});

describe('pickTrailerKey', () => {
  const video = (key: string, extra: Partial<TmdbVideo> = {}): TmdbVideo => ({
    key,
    site: 'YouTube',
    type: 'Trailer',
    official: false,
    ...extra,
  });

  it('prefers an official YouTube trailer', () => {
    expect(pickTrailerKey([video('aaaaaaaaaaa'), video('bbbbbbbbbbb', { official: true })])).toBe('bbbbbbbbbbb');
  });

  it('ignores teasers, other sites and malformed keys', () => {
    expect(
      pickTrailerKey([
        video('ccccccccccc', { type: 'Teaser', official: true }),
        video('ddddddddddd', { site: 'Vimeo', official: true }),
        video('bad key'),
      ]),
    ).toBeNull();
  });

  it('returns null when there is no trailer', () => {
    expect(pickTrailerKey([])).toBeNull();
  });
});

describe('TmdbService in other languages', () => {
  function setup(language: 'en' | 'hu') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { workerUrl: `${BASE}/`, imageBaseUrl: 'https://img.test/t/p' } },
        { provide: STRINGS, useValue: language === 'en' ? en : hu },
      ],
    });
    return { tmdb: TestBed.inject(TmdbService), http: TestBed.inject(HttpTestingController) };
  }

  it('asks TMDB in Hungarian, takes Hungarian trailers first and falls back to an English overview', async () => {
    const { tmdb, http } = setup('hu');
    const genres = tmdb.genres();
    const genreRequest = http.expectOne(() => true);
    expect(genreRequest.request.params.get('language')).toBe('hu-HU');
    genreRequest.flush({ genres: [] });
    await genres;

    const promise = tmdb.details(550);
    const req = http.expectOne((r) => r.params.get('language') === 'hu-HU');
    expect(req.request.params.get('include_video_language')).toBe('hu,en,null');
    req.flush(
      detailsResponse({
        overview: '',
        videos: {
          results: [
            { key: 'aaaaaaaaaaa', site: 'YouTube', type: 'Trailer', official: false, iso_639_1: 'en' },
            { key: 'hhhhhhhhhhh', site: 'YouTube', type: 'Trailer', official: false, iso_639_1: 'hu' },
          ],
        },
      }),
    );
    await tick();
    http.expectOne((r) => r.params.get('language') === 'en-US').flush({ ...detailsResponse(), overview: 'An insomniac...' });
    const movie = await promise;
    expect(movie.trailerKey).toBe('hhhhhhhhhhh');
    expect(movie.overviewLanguage).toBe('en');
    http.verify();
  });

  it('in English, an empty overview stays empty: there is nothing to fall back to', async () => {
    const { tmdb, http } = setup('en');
    const promise = tmdb.details(550);
    const req = http.expectOne(() => true);
    expect(req.request.params.get('language')).toBe('en-US');
    expect(req.request.params.get('include_video_language')).toBe('en,null');
    req.flush(detailsResponse({ overview: '' }));
    const movie = await promise;
    expect(movie.overviewLanguage).toBe('en');
    await tick();
    http.expectNone(() => true);
  });
});
