import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { MovieCard } from './card/movie-card';
import { AppStatus } from './core/app-status.service';
import { InstallPrompt } from './core/install-prompt';
import { LibraryService } from './core/library.service';
import { NightService } from './core/night.service';
import { SettingsService } from './core/settings.service';
import { SoundService } from './core/sound.service';
import { Settings, StorageService } from './core/storage.service';
import { BackNavigation } from './game/back-navigation';
import { GameStore } from './game/game.store';
import { GroupVeto } from './game/group-veto';
import { STRINGS } from './i18n/strings';
import { PosterReel } from './reel/poster-reel';
import { AboutDialog } from './ui/about-dialog';
import { Autofocus } from './ui/autofocus';
import { HistoryDrawer } from './ui/history-drawer';
import { InstallOffer } from './ui/install-offer';
import { Icon } from './ui/icon';
import { SettingsPanel } from './ui/settings-panel';
import { TokenCounter } from './ui/token-counter';
import { SearchDialog } from './ui/search-dialog';
import { TrailerModal } from './ui/trailer-modal';
import { VetoPanel } from './ui/veto-panel';
import { GenreWheel } from './wheel/genre-wheel';

/** After the start screen shows; a spin takes over 8 s, so the ticket is in long before it is needed. */
const TICKET_PRELOAD_MS = 1500;

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
    VetoPanel,
    SearchDialog,
    InstallOffer,
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
  protected readonly veto = inject(GroupVeto);
  protected readonly status = inject(AppStatus);
  protected readonly install = inject(InstallPrompt);
  private readonly storage = inject(StorageService);
  private readonly installDismissed = signal(this.storage.read('installDismissed') ?? false);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly settingsOpen = signal(false);
  protected readonly historyOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly aboutOpen = signal(false);
  protected readonly trailerOpen = signal(false);
  /** After the first visit, returning to the wheel moves focus onto it. */
  protected readonly focusWheel = signal(false);

  protected readonly outOfTokens = computed(() => !this.night.canSpin());

  protected readonly wheelHint = computed(() => {
    if (!this.store.genresReady()) return this.t.wheel.loading;
    if (this.veto.inProgress()) return this.t.veto.wheelWaiting;
    if (this.store.spinning()) return this.t.wheel.spinning;
    if (this.outOfTokens()) return this.t.wheel.noTokens;
    return this.night.hadResult() ? this.t.wheel.costHint : this.t.wheel.hint;
  });

  protected readonly runtimeLine = computed(() => {
    const maxRuntime = this.settings.settings().maxRuntime;
    return maxRuntime === null ? this.t.runtime.any : this.t.runtime.option(maxRuntime);
  });

  /** Decade and minimum rating share one row, listing only what is set: "Anii ’90 · Nota 7+". */
  protected readonly periodLine = computed(() => {
    const { decade, minRating } = this.settings.settings();
    const parts = [
      decade === null ? null : this.t.years.decade(decade),
      minRating === null ? null : this.t.rating.short(minRating),
    ].filter((part) => part !== null);
    return parts.length > 0 ? parts.join(' · ') : this.t.schedule.anyPeriod;
  });

  protected readonly platformLine = computed(() => {
    const count = this.settings.platformIds().length;
    return count > 0 ? this.t.schedule.myPlatforms(count) : this.t.schedule.allPlatforms;
  });

  /** Only where the browser allows it, only after a first ticket, and never again once closed. */
  protected readonly showInstallOffer = computed(() => {
    const mode = this.install.mode();
    const engaged = this.night.hadResult() || this.library.history().length > 0;
    return (mode === 'prompt' || mode === 'ios') && engaged && !this.installDismissed();
  });

  protected readonly litIndex = computed(() =>
    this.store.phase() === 'genreChosen' ? this.store.genreIndex() : null,
  );

  constructor() {
    const document = inject(DOCUMENT);
    document.documentElement.lang = this.t.lang;
    document.title = this.t.meta.title;
    inject(BackNavigation);
    void this.store.init();
    effect(() => {
      if (this.store.view() !== 'wheel') this.focusWheel.set(true);
    });
    // The ticket is deferred out of the first load; fetch it once the start screen is up, so it
    // is ready before the first spin ends. Same chunk as the @defer block, so it loads only once.
    afterNextRender(() => {
      setTimeout(() => void import('./card/movie-card').catch(() => undefined), TICKET_PRELOAD_MS);
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
    // Every text is read once at start-up, so a new language takes a reload. Nothing is lost:
    // settings, tokens and lists are all in localStorage.
    if (patch.language !== undefined && patch.language !== this.t.lang) this.window?.location.reload();
  }

  protected openTonightsMovie(): void {
    const id = this.night.lastSeenId();
    if (id !== null) void this.store.openMovie(id, 'spin');
  }

  protected openFromLibrary(id: number): void {
    this.historyOpen.set(false);
    void this.store.openMovie(id, 'list');
  }

  /** A film found by title opens on a ticket, like one from the history: no wheel, no token. */
  protected openFromSearch(id: number): void {
    this.searchOpen.set(false);
    void this.store.openMovie(id, 'list');
  }

  protected installApp(): void {
    void this.install.install();
  }

  protected dismissInstall(): void {
    this.installDismissed.set(true);
    this.storage.write('installDismissed', true);
  }

  protected openAbout(): void {
    this.settingsOpen.set(false);
    this.aboutOpen.set(true);
  }

  protected openFilters(): void {
    this.settingsOpen.set(true);
  }
}
