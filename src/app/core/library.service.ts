import { Injectable, computed, inject, signal } from '@angular/core';
import { HistoryEntry, StorageService } from './storage.service';
import { MovieRef } from './tmdb.models';
import { NOW } from './tokens';

export const HISTORY_LIMIT = 50;

/** History ("Îl vedem!") and the watchlist ("Salvează pentru altă dată"), persisted in localStorage. */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly storage = inject(StorageService);
  private readonly now = inject(NOW);

  private readonly historyState = signal<HistoryEntry[]>(this.storage.read('history') ?? []);
  private readonly watchlistState = signal<MovieRef[]>(this.storage.read('watchlist') ?? []);

  readonly history = this.historyState.asReadonly();
  readonly watchlist = this.watchlistState.asReadonly();
  readonly savedIds = computed(() => new Set(this.watchlistState().map((m) => m.id)));

  logWatched(movie: MovieRef): void {
    const entry: HistoryEntry = { ...pickRef(movie), at: this.now() };
    this.historyState.update((list) => [entry, ...list.filter((m) => m.id !== movie.id)].slice(0, HISTORY_LIMIT));
    this.storage.write('history', this.historyState());
  }

  /** IDs logged since the given moment, e.g. during the current night. */
  watchedSince(since: number): number[] {
    return this.historyState()
      .filter((m) => m.at >= since)
      .map((m) => m.id);
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
