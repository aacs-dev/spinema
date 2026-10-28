import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { LibraryService } from '../core/library.service';
import { NightService } from '../core/night.service';
import { PickResult, PickerService } from '../core/picker.service';
import { randomInt } from '../core/rng';
import { SettingsService } from '../core/settings.service';
import { ShareService } from '../core/share.service';
import { TmdbService } from '../core/tmdb.service';
import { Genre, MovieDetails } from '../core/tmdb.models';
import { DELAY, IMAGE_PRELOADER, REDUCED_MOTION, RNG } from '../core/tokens';
import { STRINGS } from '../i18n/strings';
import { WHEEL_SPIN_MS, planSpin } from '../wheel/wheel-math';
import { InvalidTransitionError, Phase, canTransition } from './spin-machine';

export const GENRE_PAUSE_MS = 800;
export const REEL_SPIN_MS = 3000;
/** A beat on the settled winner before the ticket replaces the reel. */
export const REEL_HOLD_MS = 450;
const NOTICE_MS = 4000;

export type ErrorKind = 'genres' | 'movies' | 'details' | 'notFound';
/** Where the card on screen came from: a spin, a shared link, or the history/watchlist drawer. */
export type CardOrigin = 'spin' | 'shared' | 'list';
export type View = 'wheel' | 'reel' | 'loading' | 'card' | 'error' | 'empty';

export interface ReelItem {
  id: number;
  title: string;
  posterUrl: string;
}

export interface ReelState {
  items: ReelItem[];
  stopIndex: number;
  /** Changes on every roll so the reel restarts its animation. */
  run: number;
}

type DetailsOutcome = { ok: true; movie: MovieDetails } | { ok: false };

/** A pick with its reel posters already decoded and the winner's details on the way. */
type PickOutcome =
  | { ok: true; result: { kind: 'empty' } }
  | { ok: true; result: Extract<PickResult, { kind: 'ok' }>; items: ReelItem[]; details: Promise<DetailsOutcome> }
  | { ok: false };

/**
 * The single signal-based store. All phase changes go through `go()`, which enforces
 * `TRANSITIONS`; components render from these signals only.
 */
@Injectable({ providedIn: 'root' })
export class GameStore {
  private readonly tmdb = inject(TmdbService);
  private readonly picker = inject(PickerService);
  private readonly night = inject(NightService);
  private readonly library = inject(LibraryService);
  private readonly settings = inject(SettingsService);
  private readonly share = inject(ShareService);
  private readonly rng = inject(RNG);
  private readonly delay = inject(DELAY);
  private readonly prefersReducedMotion = inject(REDUCED_MOTION);
  private readonly preload = inject(IMAGE_PRELOADER);
  private readonly t = inject(STRINGS);

  private readonly phaseState = signal<Phase>('idle');
  readonly phase = this.phaseState.asReadonly();

  readonly genres = signal<Genre[]>([]);
  readonly genresReady = signal(false);
  readonly genreIndex = signal<number | null>(null);
  readonly genre = computed(() => {
    const index = this.genreIndex();
    return index === null ? null : (this.genres()[index] ?? null);
  });

  /** Absolute wheel rotation in degrees and the transition length to reach it. */
  readonly rotation = signal(0);
  readonly spinDuration = signal(WHEEL_SPIN_MS);
  /** Where the latest spin started. A wheel that appears mid-spin ("Alt gen" on a ticket) turns from here. */
  readonly spinStart = signal(0);

  readonly reel = signal<ReelState | null>(null);
  readonly movie = signal<MovieDetails | null>(null);
  readonly origin = signal<CardOrigin>('spin');
  readonly accepted = signal(false);
  readonly errorKind = signal<ErrorKind | null>(null);
  /** Text for the polite live region. */
  readonly announcement = signal('');
  /** Short visible confirmation (share link copied, saved…). */
  readonly notice = signal('');
  /** Reduced motion as read at the start of the current flow. */
  readonly motionReduced = signal(false);

  readonly view = computed<View>(() => {
    switch (this.phaseState()) {
      case 'idle':
      case 'spinningGenre':
      case 'genreChosen':
        return 'wheel';
      case 'loadingMovies':
        return this.origin() === 'spin' && !this.motionReduced() ? 'reel' : 'loading';
      case 'spinningReel':
        return 'reel';
      case 'result':
        return 'card';
      case 'error':
        return 'error';
      case 'empty':
        return 'empty';
    }
  });

  readonly spinning = computed(() => this.phaseState() === 'spinningGenre');

  /** Every async flow captures this; a newer flow makes older awaits bail out. */
  private flow = 0;
  private retryAction: (() => unknown) | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;

  async init(): Promise<void> {
    this.night.refresh();
    const sharedId = this.share.readFilmId();
    const genres = this.loadGenres();
    if (sharedId !== null) await this.openMovie(sharedId, 'shared');
    await genres;
  }

  // ── Transitions ────────────────────────────────────────────────────────────

  /** Act 1. From the start screen, from "Alt gen" on a card, or from the empty/error states. */
  async spin(): Promise<void> {
    const from = this.phaseState();
    if (from !== 'idle' && from !== 'result' && from !== 'empty' && from !== 'error') return;
    if (!this.genresReady() && !(await this.loadGenres())) return;
    const genres = this.genres();
    if (genres.length === 0) return;

    // Re-trying after an empty pool or an error does not cost another token.
    const cost = from === 'empty' || from === 'error' ? 0 : this.night.spinCost();
    if (!this.night.trySpend(cost)) return;
    if (cost > 0) this.announce(this.t.announce.tokenSpent(this.night.tokens()));

    const flow = ++this.flow;
    const reduced = this.startFlow();
    // The winner is decided before the wheel moves; the animation only shows it.
    const index = randomInt(this.rng, 0, genres.length - 1);
    const plan = planSpin(this.rotation(), index, genres.length, this.rng);
    this.genreIndex.set(index);
    this.spinDuration.set(reduced ? 0 : WHEEL_SPIN_MS);
    this.spinStart.set(this.rotation());
    this.rotation.set(plan.target);
    this.go('spinningGenre');

    const genre = genres[index];
    // Fetching starts while the wheel turns, so the reel is usually ready the moment it stops.
    const picking = this.startPick(genre.id);

    await this.delay(reduced ? 0 : WHEEL_SPIN_MS);
    if (flow !== this.flow) return;
    this.go('genreChosen');
    this.announce(this.t.announce.genre(genre.name));

    await this.delay(reduced ? 0 : GENRE_PAUSE_MS);
    if (flow !== this.flow) return;
    await this.roll(flow, genre.id, picking);
  }

  /** "Altă tură → Alt film, același gen": skips the wheel, costs one token. */
  async respinMovie(): Promise<void> {
    const genre = this.genre();
    if (this.phaseState() !== 'result' || this.origin() !== 'spin' || !genre) return;
    if (!this.night.trySpend(1)) return;
    this.announce(this.t.announce.tokenSpent(this.night.tokens()));
    const flow = ++this.flow;
    this.startFlow();
    await this.roll(flow, genre.id);
  }

  /** "Altă tură → Alt gen": back to the wheel, costs one token. */
  respinGenre(): Promise<void> {
    if (this.phaseState() !== 'result' || this.origin() !== 'spin') return Promise.resolve();
    return this.spin();
  }

  /** Opens a card directly: shared link, history, watchlist, or tonight's movie. */
  async openMovie(id: number, origin: CardOrigin): Promise<void> {
    const from = this.phaseState();
    if (from !== 'idle' && from !== 'result' && from !== 'empty' && from !== 'error') return;
    if (from === 'result' && this.movie()?.id === id) return;
    const flow = ++this.flow;
    this.origin.set(origin);
    this.reel.set(null);
    this.go('loadingMovies');
    try {
      const movie = await this.tmdb.details(id);
      if (flow !== this.flow) return;
      this.showResult(movie, origin);
    } catch (error) {
      if (flow !== this.flow) return;
      const notFound = error instanceof HttpErrorResponse && error.status === 404;
      this.fail(notFound ? 'notFound' : 'details', () => this.openMovie(id, origin));
    }
  }

  /** "Învârte și tu" on a shared card and "Înapoi la roată". */
  backToWheel(): void {
    const from = this.phaseState();
    if (from !== 'result' && from !== 'empty' && from !== 'error') return;
    this.flow++;
    this.share.clearFilmParam();
    this.movie.set(null);
    this.reel.set(null);
    this.genreIndex.set(null);
    this.go('idle');
    if (!this.genresReady()) void this.loadGenres();
  }

  retry(): void {
    if (this.phaseState() !== 'error') return;
    const action = this.retryAction;
    this.retryAction = null;
    if (action) void action();
  }

  // ── Card actions ───────────────────────────────────────────────────────────

  accept(): void {
    const movie = this.movie();
    if (this.phaseState() !== 'result' || !movie || this.accepted()) return;
    this.library.logWatched(movie);
    this.accepted.set(true);
    this.announce(this.t.announce.accepted);
  }

  toggleSaved(): void {
    const movie = this.movie();
    if (!movie) return;
    const saved = this.library.toggleSaved(movie);
    this.showNotice(saved ? this.t.announce.saved : this.t.announce.unsaved);
  }

  async shareMovie(): Promise<void> {
    const movie = this.movie();
    if (!movie) return;
    const outcome = await this.share.share(movie.id, movie.title, this.t.announce.movie(movie.title, movie.year));
    if (outcome === 'copied') this.showNotice(this.t.announce.linkCopied);
    if (outcome === 'failed') this.showNotice(this.t.announce.shareFailed);
  }

  newNight(): void {
    this.night.reset();
    this.announce(this.t.announce.newNight);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Act 2: wait for the pick (posters already decoded), roll the reel, then reveal the card (Act 3). */
  private async roll(flow: number, genreId: number, picking?: Promise<PickOutcome>): Promise<void> {
    this.go('loadingMovies');
    const outcome = await (picking ?? this.startPick(genreId));
    if (flow !== this.flow) return;
    if (!outcome.ok) return this.fail('movies', () => this.retryRoll(genreId));
    // Only a non-empty pick carries reel items.
    if (!('items' in outcome)) return this.go('empty');

    const { pick } = outcome.result;
    const { items, details } = outcome;

    if (!this.motionReduced()) {
      this.reel.set({ items, stopIndex: pick.stopIndex, run: flow });
      this.go('spinningReel');
      await this.delay(REEL_SPIN_MS + REEL_HOLD_MS);
      if (flow !== this.flow) return;
    }

    const loaded = await details;
    if (flow !== this.flow) return;
    if (!loaded.ok) return this.fail('details', () => this.retryDetails(pick.winner.id));
    this.showResult(loaded.movie, 'spin');
  }

  private retryRoll(genreId: number): Promise<void> {
    const flow = ++this.flow;
    this.startFlow();
    return this.roll(flow, genreId);
  }

  private async retryDetails(id: number): Promise<void> {
    const flow = ++this.flow;
    this.go('loadingMovies');
    try {
      const movie = await this.tmdb.details(id);
      if (flow === this.flow) this.showResult(movie, 'spin');
    } catch {
      if (flow === this.flow) this.fail('details', () => this.retryDetails(id));
    }
  }

  private async loadGenres(): Promise<boolean> {
    try {
      const genres = await this.tmdb.genres();
      this.genres.set(genres);
      this.genresReady.set(genres.length > 0);
      return genres.length > 0;
    } catch {
      // Only the start screen depends on genres; a shared card keeps showing.
      const phase = this.phaseState();
      if (phase === 'idle' || phase === 'empty' || phase === 'error') {
        this.fail('genres', async () => {
          if (await this.loadGenres()) this.go('idle');
        });
      }
      return false;
    }
  }

  private startPick(genreId: number): Promise<PickOutcome> {
    const night = this.night.night();
    const exclude = new Set([...night.seenIds, ...this.library.watchedSince(night.startedAt)]);
    return this.picker.pick(genreId, this.settings.filters(), exclude).then(
      async (result): Promise<PickOutcome> => {
        if (result.kind === 'empty') return { ok: true, result };
        // Both start as soon as the winner is known, usually while the wheel is still turning.
        const details = this.tmdb.details(result.pick.winner.id).then(
          (movie): DetailsOutcome => ({ ok: true, movie }),
          (): DetailsOutcome => ({ ok: false }),
        );
        const items = result.pick.strip.map((m) => ({
          id: m.id,
          title: m.title,
          posterUrl: this.tmdb.imageUrl(m.poster_path ?? '', 'w342'),
        }));
        // Every poster is decoded before the reel moves, so no frame is ever blank.
        if (!this.motionReduced()) await this.preload(items.map((item) => item.posterUrl));
        return { ok: true, result, items, details };
      },
      (): PickOutcome => ({ ok: false }),
    );
  }

  private startFlow(): boolean {
    const reduced = this.prefersReducedMotion();
    this.motionReduced.set(reduced);
    this.origin.set('spin');
    this.movie.set(null);
    this.reel.set(null);
    this.accepted.set(false);
    this.errorKind.set(null);
    this.share.clearFilmParam();
    return reduced;
  }

  private showResult(movie: MovieDetails, origin: CardOrigin): void {
    this.movie.set(movie);
    this.origin.set(origin);
    this.accepted.set(false);
    if (origin === 'spin') this.night.markSeen(movie.id);
    this.go('result');
    this.announce(this.t.announce.movie(movie.title, movie.year));
  }

  private fail(kind: ErrorKind, retry: () => unknown): void {
    this.errorKind.set(kind);
    this.retryAction = retry;
    this.go('error');
  }

  private go(to: Phase): void {
    const from = this.phaseState();
    if (from === to) return;
    if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
    this.phaseState.set(to);
  }

  private announce(message: string): void {
    // Clearing first makes screen readers repeat a message identical to the previous one.
    this.announcement.set('');
    setTimeout(() => this.announcement.set(message), 30);
  }

  private showNotice(message: string): void {
    clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => this.notice.set(''), NOTICE_MS);
  }
}
