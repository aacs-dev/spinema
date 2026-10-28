import { TestBed } from '@angular/core/testing';
import { MAX_PAGE, PickerService, REEL_MAX, REEL_MIN } from './picker.service';
import { mulberry32 } from './rng';
import { DiscoverPage, Filters, MovieSummary } from './tmdb.models';
import { TmdbService } from './tmdb.service';
import { RNG } from './tokens';

const ANY: Filters = { maxRuntime: null, platforms: null, decade: null, minRating: null };

function movie(id: number, poster = true): MovieSummary {
  return { id, title: `Film ${id}`, original_title: `Film ${id}`, poster_path: poster ? `/p${id}.jpg` : null };
}

/** 20 movies per page, ids page*100 + slot. */
function page(n: number, totalPages: number, make: (id: number) => MovieSummary = (id) => movie(id)): DiscoverPage {
  return {
    page: n,
    results: Array.from({ length: 20 }, (_, slot) => make(n * 100 + slot)),
    total_pages: totalPages,
    total_results: totalPages * 20,
  };
}

function setup(pages: (n: number) => DiscoverPage, seed = 1) {
  const requested: number[] = [];
  const tmdb = {
    discover: vi.fn(async (_genre: number, _filters: Filters, n: number) => {
      requested.push(n);
      return pages(n);
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: TmdbService, useValue: tmdb },
      { provide: RNG, useValue: mulberry32(seed) },
    ],
  });
  return { picker: TestBed.inject(PickerService), requested, tmdb };
}

describe('PickerService', () => {
  it('picks a winner with a poster and builds a 12–16 poster reel stopping on it', async () => {
    for (let seed = 1; seed <= 25; seed++) {
      TestBed.resetTestingModule();
      const { picker } = setup((n) => page(n, 8), seed);
      const result = await picker.pick(35, ANY, new Set());
      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      const { winner, strip, stopIndex } = result.pick;
      expect(winner.poster_path).toBeTruthy();
      expect(strip[stopIndex]).toBe(winner);
      // The winner is second to last: one poster after it peeks in during the overshoot.
      expect(stopIndex).toBe(strip.length - 2);
      const others = strip.length - 1;
      expect(others).toBeGreaterThanOrEqual(REEL_MIN);
      expect(others).toBeLessThanOrEqual(REEL_MAX);
      expect(strip.filter((m) => m.id === winner.id)).toHaveLength(1);
      // Reel posters all come from the winner's page.
      const pageOf = (id: number) => Math.floor(id / 100);
      expect(new Set(strip.map((m) => pageOf(m.id)))).toEqual(new Set([pageOf(winner.id)]));
    }
  });

  it('never picks a movie seen tonight', async () => {
    const all = Array.from({ length: 20 }, (_, i) => 100 + i);
    const exclude = new Set(all.filter((id) => id !== 113));
    const { picker } = setup((n) => page(n, 1));
    const result = await picker.pick(35, ANY, exclude);
    expect(result.kind === 'ok' && result.pick.winner.id).toBe(113);
  });

  it('drops movies without a poster', async () => {
    const { picker } = setup((n) => page(n, 1, (id) => movie(id, id === 107)));
    const result = await picker.pick(35, ANY, new Set());
    expect(result.kind === 'ok' && result.pick.winner.id).toBe(107);
    if (result.kind === 'ok') expect(result.pick.strip.every((m) => m.poster_path)).toBe(true);
  });

  it('fetches page 1 once, then at most one more page per attempt, never beyond page 20', async () => {
    const { picker, requested } = setup((n) => page(n, 500));
    await picker.pick(35, ANY, new Set());
    expect(requested[0]).toBe(1);
    expect(requested.filter((n) => n === 1)).toHaveLength(1);
    expect(requested.every((n) => n >= 1 && n <= MAX_PAGE)).toBe(true);
    expect(requested.length).toBeLessThanOrEqual(2);
  });

  it('tries another page when the pool is empty, three attempts at most, then reports empty', async () => {
    // Every movie on every page is excluded.
    const exclude = new Set<number>();
    for (let p = 1; p <= 20; p++) for (let s = 0; s < 20; s++) exclude.add(p * 100 + s);
    const { picker, requested } = setup((n) => page(n, 20), 5);
    const result = await picker.pick(35, ANY, exclude);
    expect(result.kind).toBe('empty');
    // Page 1 is always fetched first; three attempts add two or three more pages (page 1 is reused, not refetched).
    expect(requested[0]).toBe(1);
    expect(requested.length).toBeGreaterThanOrEqual(3);
    expect(requested.length).toBeLessThanOrEqual(4);
    expect(new Set(requested).size).toBe(requested.length);
  });

  it('succeeds on a later attempt when only another page has a usable movie', async () => {
    // Only page 2 has posters; the others are all poster-less.
    const pages = (n: number) => page(n, 2, (id) => movie(id, n === 2));
    for (let seed = 1; seed <= 10; seed++) {
      TestBed.resetTestingModule();
      const { picker } = setup(pages, seed);
      const result = await picker.pick(35, ANY, new Set());
      expect(result.kind === 'ok' && Math.floor(result.pick.winner.id / 100)).toBe(2);
    }
  });

  it('reports empty straight away when the genre has no results', async () => {
    const { picker, requested } = setup(() => ({ page: 1, results: [], total_pages: 0, total_results: 0 }));
    expect((await picker.pick(10770, { maxRuntime: 90, platforms: null, decade: null, minRating: null }, new Set())).kind).toBe('empty');
    expect(requested).toEqual([1]);
  });

  it('passes genre and filters through to TMDB', async () => {
    const { picker, tmdb } = setup((n) => page(n, 1));
    await picker.pick(27, { maxRuntime: 120, platforms: null, decade: null, minRating: null }, new Set());
    expect(tmdb.discover).toHaveBeenCalledWith(27, { maxRuntime: 120, platforms: null, decade: null, minRating: null }, 1);
  });
});
