import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal, viewChildren } from '@angular/core';
import { HistoryEntry } from '../core/storage.service';
import { TmdbService } from '../core/tmdb.service';
import { MovieRef } from '../core/tmdb.models';
import { STRINGS } from '../i18n/strings';
import { Icon } from './icon';
import { ModalDialog } from './modal-dialog';

type Tab = 'history' | 'watchlist' | 'alreadySeen';

/** Lazy-loaded: the drawer's code is only fetched when the browser is idle or the drawer opens. */
@Component({
  selector: 'app-history-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialog, Icon],
  template: `
    <dialog class="sheet drawer" [appModal]="open()" (closed)="closed.emit()" #modal="appModal" aria-labelledby="library-title">
      <div class="sheet-inner">
        <header class="sheet-header">
          <h2 id="library-title" class="sheet-title">{{ t.library.title }}</h2>
          <button type="button" class="icon-btn" [attr.aria-label]="t.close" (click)="modal.close()">
            <app-icon name="close" />
          </button>
        </header>

        <div class="tabs" role="tablist" [attr.aria-label]="t.library.title" (keydown)="onTabKey($event)">
          @for (item of tabs; track item.id) {
            <button
              #tabButton
              type="button"
              role="tab"
              class="tab"
              [id]="'tab-' + item.id"
              [attr.aria-selected]="tab() === item.id"
              [attr.aria-controls]="'panel-' + item.id"
              [attr.tabindex]="tab() === item.id ? 0 : -1"
              (click)="tab.set(item.id)"
            >
              {{ item.label }} <span class="tab-count">{{ count(item.id) }}</span>
            </button>
          }
        </div>

        @if (tab() === 'alreadySeen') {
          <div id="panel-alreadySeen" role="tabpanel" aria-labelledby="tab-alreadySeen" tabindex="0" class="panel">
            @if (alreadySeen().length === 0) {
              <p class="empty-note">{{ t.library.alreadySeenEmpty }}</p>
            } @else {
              <ul class="movie-list">
                @for (entry of alreadySeen(); track entry.id) {
                  <li class="movie-row">
                    <button type="button" class="movie-open" (click)="openMovie.emit(entry.id)">
                      @if (thumb(entry); as src) {
                        <img [src]="src" alt="" width="46" height="69" loading="lazy" />
                      } @else {
                        <span class="thumb-missing"></span>
                      }
                      <span class="movie-text">
                        <span class="movie-title">{{ entry.title }}</span>
                        <span class="movie-meta">{{ entry.year }}{{ entry.year ? ' · ' : '' }}{{ t.library.markedOn(date(entry.at)) }}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary remove-btn"
                      [attr.aria-label]="t.library.removeAlreadySeen(entry.title)"
                      (click)="removeAlreadySeen.emit(entry.id)"
                    >
                      {{ t.library.removeShort }}
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        } @else if (tab() === 'history') {
          <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" tabindex="0" class="panel">
            @if (history().length === 0) {
              <p class="empty-note">{{ t.library.historyEmpty }}</p>
            } @else {
              <ul class="movie-list">
                @for (entry of history(); track entry.id) {
                  <li class="movie-row">
                    <button type="button" class="movie-open" (click)="openMovie.emit(entry.id)">
                      @if (thumb(entry); as src) {
                        <img [src]="src" alt="" width="46" height="69" loading="lazy" />
                      } @else {
                        <span class="thumb-missing"></span>
                      }
                      <span class="movie-text">
                        <span class="movie-title">{{ entry.title }}</span>
                        <span class="movie-meta">{{ entry.year }}{{ entry.year ? ' · ' : '' }}{{ t.library.chosenOn(date(entry.at)) }}</span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        } @else {
          <div id="panel-watchlist" role="tabpanel" aria-labelledby="tab-watchlist" tabindex="0" class="panel">
            @if (watchlist().length === 0) {
              <p class="empty-note">{{ t.library.watchlistEmpty }}</p>
            } @else {
              <ul class="movie-list">
                @for (movie of watchlist(); track movie.id) {
                  <li class="movie-row">
                    <button type="button" class="movie-open" (click)="openMovie.emit(movie.id)">
                      @if (thumb(movie); as src) {
                        <img [src]="src" alt="" width="46" height="69" loading="lazy" />
                      } @else {
                        <span class="thumb-missing"></span>
                      }
                      <span class="movie-text">
                        <span class="movie-title">{{ movie.title }}</span>
                        @if (movie.year) {
                          <span class="movie-meta">{{ movie.year }}</span>
                        }
                      </span>
                    </button>
                    <button type="button" class="btn btn-secondary remove-btn" [attr.aria-label]="t.library.remove(movie.title)" (click)="remove.emit(movie.id)">
                      {{ t.library.removeShort }}
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        }
      </div>
    </dialog>
  `,
})
export class HistoryDrawer {
  readonly open = input(false);
  readonly history = input.required<readonly HistoryEntry[]>();
  readonly watchlist = input.required<readonly MovieRef[]>();
  readonly alreadySeen = input<readonly HistoryEntry[]>([]);
  readonly openMovie = output<number>();
  readonly remove = output<number>();
  readonly removeAlreadySeen = output<number>();
  readonly closed = output<void>();

  protected readonly t = inject(STRINGS);
  private readonly tmdb = inject(TmdbService);
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected readonly tab = signal<Tab>('history');
  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'history', label: this.t.library.history },
    { id: 'watchlist', label: this.t.library.watchlist },
    { id: 'alreadySeen', label: this.t.library.alreadySeen },
  ];

  protected count(tab: Tab): number {
    if (tab === 'history') return this.history().length;
    return tab === 'watchlist' ? this.watchlist().length : this.alreadySeen().length;
  }

  protected thumb(movie: MovieRef): string | null {
    return movie.posterPath ? this.tmdb.imageUrl(movie.posterPath, 'w92') : null;
  }

  protected date(ms: number): string {
    return this.t.format.date(ms);
  }

  /** Arrow keys move between tabs and wrap around, Home and End jump to the ends: the ARIA tabs pattern. */
  protected onTabKey(event: KeyboardEvent): void {
    const last = this.tabs.length - 1;
    const current = this.tabs.findIndex((item) => item.id === this.tab());
    const moves: Record<string, number> = {
      ArrowLeft: current === 0 ? last : current - 1,
      ArrowRight: current === last ? 0 : current + 1,
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.tab.set(this.tabs[next].id);
    this.tabButtons()[next]?.nativeElement.focus();
  }
}
