import { TestBed } from '@angular/core/testing';
import { ALREADY_SEEN_LIMIT, LibraryService } from './library.service';
import { MovieRef } from './tmdb.models';
import { NOW } from './tokens';

const movie = (id: number): MovieRef => ({ id, title: `Film ${id}`, year: '2001', posterPath: `/${id}.jpg` });

describe('LibraryService', () => {
  let now: number;
  const create = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: NOW, useValue: () => now }] });
    return TestBed.inject(LibraryService);
  };

  beforeEach(() => {
    localStorage.clear();
    now = 1_000;
  });

  it('"Am văzut deja" marks a movie, newest first, and a second press undoes it', () => {
    const library = create();
    expect(library.toggleAlreadySeen(movie(1))).toBe(true);
    now = 2_000;
    library.toggleAlreadySeen(movie(2));
    expect(library.alreadySeen().map((m) => [m.id, m.at])).toEqual([
      [2, 2_000],
      [1, 1_000],
    ]);
    expect(library.toggleAlreadySeen(movie(1))).toBe(false);
    expect([...library.alreadySeenIds()]).toEqual([2]);
  });

  it('keeps the list across reloads and can remove an entry', () => {
    create().toggleAlreadySeen(movie(7));
    const library = create();
    expect(library.alreadySeenIds().has(7)).toBe(true);
    library.removeAlreadySeen(7);
    expect(create().alreadySeen()).toEqual([]);
  });

  it(`keeps at most ${ALREADY_SEEN_LIMIT} movies, dropping the oldest`, () => {
    const library = create();
    for (let id = 1; id <= ALREADY_SEEN_LIMIT + 3; id++) library.toggleAlreadySeen(movie(id));
    expect(library.alreadySeen()).toHaveLength(ALREADY_SEEN_LIMIT);
    expect(library.alreadySeenIds().has(1)).toBe(false);
    expect(library.alreadySeenIds().has(ALREADY_SEEN_LIMIT + 3)).toBe(true);
  });

  it('never picks again what was marked seen or chosen with "Îl vedem!" on any night', () => {
    const library = create();
    library.logWatched(movie(10));
    now += 30 * 24 * 3600 * 1000;
    library.toggleAlreadySeen(movie(20));
    library.toggleSaved(movie(30));
    expect([...library.excludedIds()].sort()).toEqual([10, 20]);
  });
});
