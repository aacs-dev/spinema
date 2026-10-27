import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MovieDetailsResponse, TmdbVideo } from './tmdb.models';
import { TmdbService, pickTrailerKey } from './tmdb.service';
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
    const first = tmdb.discover(35, { maxRuntime: 120 }, 3);
    const again = tmdb.discover(35, { maxRuntime: 120 }, 3);
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

    const other = tmdb.discover(35, { maxRuntime: null }, 3);
    const req2 = http.expectOne((r) => r.url === `${BASE}/3/discover/movie`);
    expect(req2.request.params.has('with_runtime.lte')).toBe(false);
    req2.flush({ page: 3, results: [], total_pages: 1, total_results: 0 });
    await other;
  });

  it('drops a failed request from the cache so a retry goes to the network', async () => {
    const failing = tmdb.discover(35, { maxRuntime: null }, 1);
    http.expectOne(() => true).flush('down', { status: 502, statusText: 'Bad Gateway' });
    await expect(failing).rejects.toBeTruthy();

    const retry = tmdb.discover(35, { maxRuntime: null }, 1);
    http.expectOne(() => true).flush({ page: 1, results: [], total_pages: 0, total_results: 0 });
    await expect(retry).resolves.toBeTruthy();
  });

  it('maps details: Romanian data, one-decimal-ready rating, runtime, RO and PL providers', async () => {
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
    expect(Object.keys(movie.providers).sort()).toEqual(['PL', 'RO']);
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
