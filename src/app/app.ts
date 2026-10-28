import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { MovieCard } from './card/movie-card';
import { LibraryService } from './core/library.service';
import { NightService } from './core/night.service';
import { SettingsService } from './core/settings.service';
import { SoundService } from './core/sound.service';
import { Settings } from './core/storage.service';
import { BackNavigation } from './game/back-navigation';
import { GameStore } from './game/game.store';
import { STRINGS } from './i18n/strings';
import { PosterReel } from './reel/poster-reel';
import { AboutDialog } from './ui/about-dialog';
import { Autofocus } from './ui/autofocus';
import { HistoryDrawer } from './ui/history-drawer';
import { Icon } from './ui/icon';
import { SettingsPanel } from './ui/settings-panel';
import { TokenCounter } from './ui/token-counter';
import { TrailerModal } from './ui/trailer-modal';
import { GenreWheel } from './wheel/genre-wheel';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GenreWheel,
    PosterReel,
    MovieCard,
    TokenCounter,
    Icon,
    Autofocus,
    SettingsPanel,
    HistoryDrawer,
    AboutDialog,
    TrailerModal,
  ],
  host: {
    '(document:visibilitychange)': 'onVisibilityChange()',
    // Safari resumes audio only inside a user gesture, and some sounds come later, after a fetch
    // ("Alt film") or after a trailer interrupted the audio. Every tap or key re-arms it.
    '(document:click)': 'sound.prime()',
    '(document:keydown)': 'sound.prime()',
  },
})
export class App {
  protected readonly store = inject(GameStore);
  protected readonly night = inject(NightService);
  protected readonly library = inject(LibraryService);
  protected readonly settings = inject(SettingsService);
  protected readonly t = inject(STRINGS);
  protected readonly sound = inject(SoundService);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly settingsOpen = signal(false);
  protected readonly historyOpen = signal(false);
  protected readonly aboutOpen = signal(false);
  protected readonly trailerOpen = signal(false);
  /** After the first visit, returning to the wheel moves focus onto it. */
  protected readonly focusWheel = signal(false);

  protected readonly outOfTokens = computed(() => !this.night.canSpin());

  protected readonly wheelHint = computed(() => {
    if (!this.store.genresReady()) return this.t.wheel.loading;
    if (this.store.spinning()) return this.t.wheel.spinning;
    if (this.outOfTokens()) return this.t.wheel.noTokens;
    return this.night.spinCost() > 0 ? this.t.wheel.costHint : this.t.wheel.hint;
  });

  protected readonly runtimeLine = computed(() => {
    const maxRuntime = this.settings.settings().maxRuntime;
    return maxRuntime === null ? this.t.runtime.any : this.t.runtime.option(maxRuntime);
  });

  protected readonly litIndex = computed(() =>
    this.store.phase() === 'genreChosen' ? this.store.genreIndex() : null,
  );

  constructor() {
    inject(BackNavigation);
    void this.store.init();
    effect(() => {
      if (this.store.view() !== 'wheel') this.focusWheel.set(true);
    });
  }

  /** The wordmark returns to the start screen without a reload; modified clicks still open a new tab. */
  protected goHome(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.store.backToWheel();
    this.window?.scrollTo(0, 0);
  }

  protected onVisibilityChange(): void {
    if (document.visibilityState === 'visible') this.night.refresh();
  }

  protected updateSettings(patch: Partial<Settings>): void {
    this.settings.update(patch);
    if (patch.sound) this.sound.prime();
  }

  protected openTonightsMovie(): void {
    const id = this.night.lastSeenId();
    if (id !== null) void this.store.openMovie(id, 'spin');
  }

  protected openFromLibrary(id: number): void {
    this.historyOpen.set(false);
    void this.store.openMovie(id, 'list');
  }

  protected openAbout(): void {
    this.settingsOpen.set(false);
    this.aboutOpen.set(true);
  }

  protected openFilters(): void {
    this.settingsOpen.set(true);
  }
}
