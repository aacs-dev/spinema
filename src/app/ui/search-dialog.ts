import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { yearOf } from '../core/text';
import { TmdbService } from '../core/tmdb.service';
import { MovieSummary } from '../core/tmdb.models';
import { STRINGS } from '../i18n/strings';
import { Icon } from './icon';
import { ModalDialog } from './modal-dialog';

export const MIN_QUERY_LENGTH = 2;
/** Waits for a pause in typing, so a title is not searched letter by letter. */
export const SEARCH_DEBOUNCE_MS = 300;

type SearchState = 'idle' | 'loading' | 'done' | 'error';

/**
 * Finding a film by title, outside the game: no wheel, no token. The chosen film opens on a
 * ticket, like one picked from the history. Lazy-loaded with the first open.
 */
@Component({
  selector: 'app-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialog, Icon],
  template: `
    <dialog class="sheet" [appModal]="open()" (closed)="closed.emit()" #modal="appModal" aria-labelledby="search-title">
      <div class="sheet-inner">
        <header class="sheet-header">
          <h2 id="search-title" class="sheet-title">{{ t.search.title }}</h2>
          <button type="button" class="icon-btn" [attr.aria-label]="t.close" (click)="modal.close()">
            <app-icon name="close" />
          </button>
        </header>

        <form role="search" class="search-form" (submit)="$event.preventDefault(); pickFirst()">
          <label class="field-legend" for="search-input">{{ t.search.label }}</label>
          <input
            id="search-input"
            class="search-input"
            type="search"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="search"
            autofocus
            aria-describedby="search-status"
            [value]="query()"
            (input)="onInput($event)"
          />
        </form>

        <p id="search-status" class="hint search-status" role="status">{{ status() }}</p>
        @if (state() === 'error') {
          <button type="button" class="btn btn-secondary" (click)="retry()">{{ t.errors.retry }}</button>
        }

        @if (results().length > 0) {
          <ul class="movie-list">
            @for (movie of results(); track movie.id) {
              <li class="movie-row">
                <button type="button" class="movie-open" (click)="pick.emit(movie.id)">
                  @if (thumb(movie); as src) {
                    <img [src]="src" alt="" width="46" height="69" loading="lazy" />
                  } @else {
                    <span class="thumb-missing"></span>
                  }
                  <span class="movie-text">
                    <span class="movie-title">{{ movie.title }}</span>
                    <span class="movie-meta">{{ year(movie) ?? t.card.unknown }}</span>
                  </span>
                </button>
              </li>
            }
          </ul>
        }
      </div>
    </dialog>
  `,
})
export class SearchDialog {
  readonly open = input(false);
  readonly pick = output<number>();
  readonly closed = output<void>();

  protected readonly t = inject(STRINGS);
  private readonly tmdb = inject(TmdbService);

  protected readonly query = signal('');
  protected readonly results = signal<MovieSummary[]>([]);
  protected readonly state = signal<SearchState>('idle');
  protected readonly status = computed(() => {
    switch (this.state()) {
      case 'idle':
        return this.t.search.hint;
      case 'loading':
        return this.t.search.loading;
      case 'error':
        return this.t.search.error;
      case 'done':
        return this.results().length > 0 ? this.t.search.results(this.results().length) : this.t.search.none(this.query().trim());
    }
  });

  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Each search gets a number; an answer that comes back after a newer search is dropped. */
  private latest = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    clearTimeout(this.timer);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      this.latest++;
      this.results.set([]);
      this.state.set('idle');
      return;
    }
    this.state.set('loading');
    this.timer = setTimeout(() => void this.run(value), SEARCH_DEBOUNCE_MS);
  }

  protected retry(): void {
    if (this.query().trim().length >= MIN_QUERY_LENGTH) void this.run(this.query());
  }

  /** Enter opens the best match, once the results for what was typed are in. */
  protected pickFirst(): void {
    const first = this.results()[0];
    if (this.state() === 'done' && first) this.pick.emit(first.id);
  }

  protected thumb(movie: MovieSummary): string | null {
    return movie.poster_path ? this.tmdb.imageUrl(movie.poster_path, 'w92') : null;
  }

  protected year(movie: MovieSummary): string | null {
    return yearOf(movie.release_date);
  }

  private async run(value: string): Promise<void> {
    const request = ++this.latest;
    this.state.set('loading');
    try {
      const results = await this.tmdb.search(value);
      if (request !== this.latest) return;
      this.results.set(results);
      this.state.set('done');
    } catch {
      if (request !== this.latest) return;
      this.results.set([]);
      this.state.set('error');
    }
  }
}
