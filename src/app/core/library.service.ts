import { Injectable, computed, inject, signal } from '@angular/core';
import { HistoryEntry, StorageService } from './storage.service';
import { MovieRef } from './tmdb.models';
import { NOW } from './tokens';

export const HISTORY_LIMIT = 50;
/** Enough for years of movie nights, and still a few dozen kB in localStorage. */
export const ALREADY_SEEN_LIMIT = 500;

/**
 * History ("Îl vedem!"), the watchlist ("Salvează pentru altă dată") and the already-seen list
 * ("Am văzut deja"), persisted in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly storage = inject(StorageService);
  private readonly now = inject(NOW);

  private readonly historyState = signal<HistoryEntry[]>(this.storage.read('history') ?? []);
  private readonly watchlistState = signal<MovieRef[]>(this.storage.read('watchlist') ?? []);
  private readonly alreadySeenState = signal<HistoryEntry[]>(this.storage.read('alreadySeen') ?? []);

  readonly history = this.historyState.asReadonly();
  readonly watchlist = this.watchlistState.asReadonly();
  readonly alreadySeen = this.alreadySeenState.asReadonly();
  readonly savedIds = computed(() => new Set(this.watchlistState().map((m) => m.id)));
  readonly alreadySeenIds = computed(() => new Set(this.alreadySeenState().map((m) => m.id)));

  /** Never picked again: movies marked "Am văzut deja", and movies chosen with "Îl vedem!" on any night. */
  readonly excludedIds = computed(() => new Set([...this.alreadySeenIds(), ...this.historyState().map((m) => m.id)]));

  logWatched(movie: MovieRef): void {
    const entry: HistoryEntry = { ...pickRef(movie), at: this.now() };
    this.historyState.update((list) => [entry, ...list.filter((m) => m.id !== movie.id)].slice(0, HISTORY_LIMIT));
    this.storage.write('history', this.historyState());
  }

  /** "Am văzut deja", or undoing it. Returns whether the movie is now marked. */
  toggleAlreadySeen(movie: MovieRef): boolean {
    const seen = this.alreadySeenIds().has(movie.id);
    this.alreadySeenState.update((list) =>
      seen ? list.filter((m) => m.id !== movie.id) : [{ ...pickRef(movie), at: this.now() }, ...list].slice(0, ALREADY_SEEN_LIMIT),
    );
    this.storage.write('alreadySeen', this.alreadySeenState());
    return !seen;
  }

  removeAlreadySeen(id: number): void {
    this.alreadySeenState.update((list) => list.filter((m) => m.id !== id));
    this.storage.write('alreadySeen', this.alreadySeenState());
  }

  isSaved(id: number): boolean {
    return this.savedIds().has(id);
  }

  toggleSaved(movie: MovieRef): boolean {
    const saved = this.isSaved(movie.id);
    this.watchlistState.update((list) =>
      saved ? list.filter((m) => m.id !== movie.id) : [pickRef(movie), ...list],
    );
    this.storage.write('watchlist', this.watchlistState());
    return !saved;
  }

  removeSaved(id: number): void {
    this.watchlistState.update((list) => list.filter((m) => m.id !== id));
    this.storage.write('watchlist', this.watchlistState());
  }
}

function pickRef(movie: MovieRef): MovieRef {
  return { id: movie.id, title: movie.title, year: movie.year, posterPath: movie.posterPath };
}
