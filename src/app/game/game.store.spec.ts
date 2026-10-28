import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NightService } from '../core/night.service';
import { PickResult, PickerService } from '../core/picker.service';
import { mulberry32 } from '../core/rng';
import { ShareService } from '../core/share.service';
import { TmdbService } from '../core/tmdb.service';
import { Genre, MovieDetails, MovieSummary } from '../core/tmdb.models';
import { DELAY, IMAGE_PRELOADER, NOW, REDUCED_MOTION, RNG } from '../core/tokens';
import { segmentAtPointer } from '../wheel/wheel-math';
import { GameStore } from './game.store';
import { Phase, TRANSITIONS, canTransition } from './spin-machine';

const GENRES: Genre[] = [
  { id: 28, name: 'Acțiune' },
  { id: 35, name: 'Comedie' },
  { id: 18, name: 'Dramă' },
  { id: 27, name: 'Horror' },
  { id: 10770, name: 'Film TV' },
];

const summary = (id: number): MovieSummary => ({ id, title: `Film ${id}`, original_title: `Film ${id}`, poster_path: `/${id}.jpg` });

const details = (id: number): MovieDetails => ({
  id,
  title: `Film ${id}`,
  originalTitle: `Film ${id}`,
  originalLanguage: 'en',
  year: '2001',
  rating: 7.25,
  runtime: 100,
  genres: ['Comedie'],
  overview: 'Rezumat.',
  overviewLanguage: 'ro',
  posterPath: `/${id}.jpg`,
  trailerKey: null,
  providers: {},
});

function okPick(id: number): PickResult {
  const winner = summary(id);
  const decoys = Array.from({ length: 12 }, (_, i) => summary(9000 + i));
  return { kind: 'ok', pick: { winner, strip: [...decoys, winner, summary(9999)], stopIndex: 12 } };
}

interface Setup {
  pick?: (genreId: number, exclude: ReadonlySet<number>) => Promise<PickResult>;
  details?: (id: number) => Promise<MovieDetails>;
  genres?: () => Promise<Genre[]>;
  sharedId?: number | null;
  reducedMotion?: boolean;
  now?: () => number;
}

function setup(options: Setup = {}) {
  localStorage.clear();
  let nextId = 100;
  const pick = vi.fn(options.pick ?? (async () => okPick(nextId++)));
  const tmdb = {
    genres: vi.fn(options.genres ?? (async () => GENRES)),
    details: vi.fn(options.details ?? (async (id: number) => details(id))),
    imageUrl: (path: string, size: string) => `https://img.test/${size}${path}`,
  };
  const share = {
    readFilmId: () => options.sharedId ?? null,
    clearFilmParam: vi.fn(),
    share: vi.fn(async () => 'copied' as const),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: TmdbService, useValue: tmdb },
      { provide: PickerService, useValue: { pick: (genreId: number, _f: unknown, exclude: ReadonlySet<number>) => pick(genreId, exclude) } },
      { provide: ShareService, useValue: share },
      { provide: RNG, useValue: mulberry32(2026) },
      { provide: NOW, useValue: options.now ?? (() => Date.UTC(2026, 9, 26, 19)) },
      { provide: DELAY, useValue: () => Promise.resolve() },
      { provide: IMAGE_PRELOADER, useValue: async () => undefined },
      { provide: REDUCED_MOTION, useValue: () => options.reducedMotion ?? false },
    ],
  });

  const store = TestBed.inject(GameStore);
  const night = TestBed.inject(NightService);
  const phases: Phase[] = [];
  const go = (store as unknown as { go: (to: Phase) => void }).go.bind(store);
  vi.spyOn(store as unknown as { go: (to: Phase) => void }, 'go').mockImplementation((to: Phase) => {
    go(to);
    phases.push(store.phase());
  });
  return { store, night, tmdb, pick, share, phases };
}

describe('spin machine', () => {
  it('allows the happy path in order', () => {
    const path: Phase[] = ['idle', 'spinningGenre', 'genreChosen', 'loadingMovies', 'spinningReel', 'result'];
    for (let i = 1; i < path.length; i++) expect(canTransition(path[i - 1], path[i])).toBe(true);
  });

  it('rejects shortcuts that would skip a decision', () => {
    expect(canTransition('idle', 'result')).toBe(false);
    expect(canTransition('spinningGenre', 'result')).toBe(false);
    expect(canTransition('spinningReel', 'spinningGenre')).toBe(false);
    expect(canTransition('genreChosen', 'spinningReel')).toBe(false);
  });

  it('can reach error from every phase that loads data', () => {
    for (const phase of ['idle', 'spinningGenre', 'genreChosen', 'loadingMovies', 'spinningReel'] as Phase[]) {
      expect(TRANSITIONS[phase]).toContain('error');
    }
  });
});

describe('GameStore', () => {
  it('runs the full flow: wheel, reel, card', async () => {
    const { store, phases, night } = setup();
    await store.init();
    expect(store.genresReady()).toBe(true);

    await store.spin();
    expect(phases).toEqual(['spinningGenre', 'genreChosen', 'loadingMovies', 'spinningReel', 'result']);
    expect(store.view()).toBe('card');
    expect(store.movie()?.id).toBe(100);
    expect(store.origin()).toBe('spin');
    // The first spin of the night is free; the result is remembered for exclusion.
    expect(night.tokens()).toBe(3);
    expect(night.night().seenIds).toEqual([100]);
  });

  it('decides the genre before the animation and lands the wheel on it', async () => {
    const { store } = setup();
    await store.init();
    for (let i = 0; i < 10; i++) {
      const spin = store.spin();
      expect(store.phase()).toBe('spinningGenre');
      const index = store.genreIndex()!;
      expect(segmentAtPointer(store.rotation(), GENRES.length)).toBe(index);
      await spin;
      store.newNight();
      store.backToWheel();
    }
  });

  it('never lands on a vetoed genre, and the wheel shows only the others', async () => {
    const { store, night } = setup();
    await store.init();
    night.setVetoes([28, 27]);
    expect(store.wheelGenres().map((g) => g.id)).toEqual([35, 18, 10770]);
    for (let i = 0; i < 12; i++) {
      const spin = store.spin();
      const index = store.genreIndex()!;
      expect(segmentAtPointer(store.rotation(), store.wheelGenres().length)).toBe(index);
      expect([28, 27]).not.toContain(store.genre()!.id);
      await spin;
      night.reset();
      night.setVetoes([28, 27]);
      store.backToWheel();
    }
  });

  it('spins the reel for the chosen genre and the card shows the reel winner', async () => {
    const { store, pick } = setup();
    await store.init();
    await store.spin();
    expect(pick).toHaveBeenCalledWith(store.genre()!.id, expect.any(Set));
    const reel = store.reel()!;
    expect(reel.items[reel.stopIndex].id).toBe(store.movie()!.id);
  });

  it('"Alt film" costs a token and skips the wheel', async () => {
    const { store, phases, night } = setup();
    await store.init();
    await store.spin();
    phases.length = 0;
    const genre = store.genre();

    await store.respinMovie();
    expect(phases).toEqual(['loadingMovies', 'spinningReel', 'result']);
    expect(night.tokens()).toBe(2);
    expect(store.genre()).toBe(genre);
    expect(store.movie()?.id).toBe(101);
  });

  it('"Alt gen" costs a token and goes back through the wheel', async () => {
    const { store, phases, night } = setup();
    await store.init();
    await store.spin();
    phases.length = 0;
    const restedAt = store.rotation();
    const spin = store.respinGenre();
    // The wheel reappears mid-spin, so it needs to know where this turn starts.
    expect(store.spinStart()).toBe(restedAt);
    expect(store.rotation()).toBeGreaterThan(restedAt);
    await spin;
    expect(phases[0]).toBe('spinningGenre');
    expect(phases.at(-1)).toBe('result');
    expect(night.tokens()).toBe(2);
  });

  it('after 06:00 the first spin is free again, even if the page stayed open overnight', async () => {
    let now = new Date(2026, 9, 26, 21).getTime();
    const { store, night } = setup({ now: () => now });
    await store.init();
    await store.spin();
    expect(night.spinCost()).toBe(1);

    now = new Date(2026, 9, 27, 6, 5).getTime();
    store.backToWheel();
    await store.spin();
    expect(night.tokens()).toBe(3);
    expect(night.night().seenIds).toEqual([101]);
  });

  it('refuses to re-spin at 0 tokens and keeps the movie', async () => {
    const { store, night } = setup();
    await store.init();
    await store.spin();
    await store.respinMovie();
    await store.respinMovie();
    await store.respinMovie();
    expect(night.tokens()).toBe(0);
    const kept = store.movie();
    await store.respinMovie();
    await store.respinGenre();
    expect(store.movie()).toBe(kept);
    expect(store.phase()).toBe('result');
  });

  it('excludes tonight\'s results from the next pick', async () => {
    const { store, pick } = setup();
    await store.init();
    await store.spin();
    await store.respinMovie();
    expect([...pick.mock.calls[1][1]]).toEqual([100]);
  });

  it('"Am văzut deja" keeps the ticket, costs nothing and leaves the movie out of every later pick', async () => {
    const { store, pick, night } = setup();
    await store.init();
    await store.spin();
    store.toggleAlreadySeen();
    expect(store.phase()).toBe('result');
    expect(store.movie()?.id).toBe(100);
    expect(store.notice()).toBe('Notat ca văzut. Nu mai iese la tragere.');
    expect(night.tokens()).toBe(3);

    // A new night forgets tonight's results, not what was already seen.
    night.reset();
    store.backToWheel();
    await store.spin();
    expect(pick.mock.calls.at(-1)![1].has(100)).toBe(true);

    store.toggleAlreadySeen();
    store.toggleAlreadySeen();
    expect(store.notice()).toBe('Scos din Deja văzute. Poate ieși din nou la tragere.');
  });

  it('a movie chosen with "Îl vedem!" never comes up again, even on later nights', async () => {
    const { store, pick, night } = setup();
    await store.init();
    await store.spin();
    store.accept();
    night.reset();
    store.backToWheel();
    await store.spin();
    expect(pick.mock.calls.at(-1)![1].has(100)).toBe(true);
  });

  it('ends in the empty state when no movie fits, and spinning again from there is free', async () => {
    let calls = 0;
    const { store, phases, night } = setup({ pick: async () => (calls++ === 0 ? { kind: 'empty' } : okPick(5)) });
    await store.init();
    await store.spin();
    expect(phases.at(-1)).toBe('empty');
    expect(store.view()).toBe('empty');

    await store.spin();
    expect(store.phase()).toBe('result');
    expect(night.tokens()).toBe(3);
  });

  it('goes to the error state when movies cannot be loaded, and retries without charging', async () => {
    let fail = true;
    const { store, night } = setup({
      pick: async () => {
        if (fail) throw new Error('offline');
        return okPick(7);
      },
    });
    await store.init();
    await store.spin();
    expect(store.phase()).toBe('error');
    expect(store.errorKind()).toBe('movies');

    fail = false;
    store.retry();
    await vi.waitFor(() => expect(store.phase()).toBe('result'));
    expect(store.movie()?.id).toBe(7);
    expect(night.tokens()).toBe(3);
  });

  it('goes to the error state when the winner\'s details fail', async () => {
    const { store } = setup({ details: async () => Promise.reject(new Error('offline')) });
    await store.init();
    await store.spin();
    expect(store.phase()).toBe('error');
    expect(store.errorKind()).toBe('details');
  });

  it('shows the genre error on start and recovers to idle on retry', async () => {
    let fail = true;
    const { store } = setup({
      genres: async () => {
        if (fail) throw new Error('offline');
        return GENRES;
      },
    });
    await store.init();
    expect(store.phase()).toBe('error');
    expect(store.errorKind()).toBe('genres');

    fail = false;
    store.retry();
    await vi.waitFor(() => expect(store.phase()).toBe('idle'));
    expect(store.genres()).toHaveLength(GENRES.length);
  });

  it('opens a shared ?film= link straight on the card', async () => {
    const { store, phases, tmdb } = setup({ sharedId: 550 });
    await store.init();
    expect(phases).toEqual(['loadingMovies', 'result']);
    expect(tmdb.details).toHaveBeenCalledWith(550);
    expect(store.origin()).toBe('shared');
    expect(store.movie()?.id).toBe(550);
  });

  it('"Învârte și tu" clears the link and the visitor\'s first spin is free', async () => {
    const { store, share, night } = setup({ sharedId: 550 });
    await store.init();
    store.backToWheel();
    expect(store.phase()).toBe('idle');
    expect(share.clearFilmParam).toHaveBeenCalled();
    await store.spin();
    expect(night.tokens()).toBe(3);
  });

  it('reports a shared movie that no longer exists', async () => {
    const { store } = setup({
      sharedId: 1,
      details: async () => Promise.reject(new HttpErrorResponse({ status: 404 })),
    });
    await store.init();
    expect(store.phase()).toBe('error');
    expect(store.errorKind()).toBe('notFound');
  });

  it('skips the spins with reduced motion and goes straight to the card', async () => {
    const { store, phases } = setup({ reducedMotion: true });
    await store.init();
    await store.spin();
    expect(phases).not.toContain('spinningReel');
    expect(phases.at(-1)).toBe('result');
    expect(store.spinDuration()).toBe(0);
  });

  it('"Îl vedem!" logs the movie to history once', async () => {
    const { store } = setup();
    await store.init();
    await store.spin();
    store.accept();
    store.accept();
    const history = JSON.parse(localStorage.getItem('spinema:history')!).data;
    expect(history.map((h: { id: number }) => h.id)).toEqual([100]);
    expect(store.accepted()).toBe(true);
  });

  it('announces the genre and the movie politely', async () => {
    const { store } = setup();
    await store.init();
    await store.spin();
    await vi.waitFor(() => expect(store.announcement()).toBe('Filmul serii: Film 100, 2001.'));
  });

  it('ignores a spin while one is already running', async () => {
    const { store, pick } = setup();
    await store.init();
    const first = store.spin();
    await store.spin();
    await first;
    expect(pick).toHaveBeenCalledTimes(1);
  });
});
