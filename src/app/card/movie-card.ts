import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TmdbService } from '../core/tmdb.service';
import { MovieDetails, Provider, Region } from '../core/tmdb.models';
import { NOW } from '../core/tokens';
import type { CardOrigin } from '../game/game.store';
import { STRINGS } from '../i18n/strings';
import { Icon } from '../ui/icon';

const LONG_OVERVIEW = 320;

type ProviderKind = 'flatrate' | 'free' | 'rent' | 'buy';

interface ProviderGroup {
  kind: ProviderKind;
  providers: Provider[];
}

/** Subscription first, then free, rent and buy; each sorted by TMDB's display priority. */
export function groupProviders(movie: MovieDetails, region: Region): ProviderGroup[] {
  const entry = movie.providers[region];
  if (!entry) return [];
  const groups: ProviderGroup[] = [
    { kind: 'flatrate', providers: entry.flatrate ?? [] },
    { kind: 'free', providers: [...(entry.free ?? []), ...(entry.ads ?? [])] },
    { kind: 'rent', providers: entry.rent ?? [] },
    { kind: 'buy', providers: entry.buy ?? [] },
  ];
  return groups
    .map((group) => ({
      kind: group.kind,
      providers: group.providers
        .filter((p, i, all) => all.findIndex((q) => q.provider_id === p.provider_id) === i)
        .sort((a, b) => a.display_priority - b.display_priority),
    }))
    .filter((group) => group.providers.length > 0);
}

@Component({
  selector: 'app-movie-card',
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
})
export class MovieCard {
  readonly movie = input.required<MovieDetails>();
  readonly origin = input.required<CardOrigin>();
  readonly region = input.required<Region>();
  /** Platforms the user ticked in settings for this region; their logos are marked. */
  readonly myPlatforms = input<readonly number[]>([]);
  readonly tokens = input.required<number>();
  readonly saved = input(false);
  readonly alreadySeen = input(false);
  readonly accepted = input(false);
  readonly notice = input('');
  readonly nightStartedAt = input.required<number>();

  readonly accept = output<void>();
  readonly respinMovie = output<void>();
  readonly respinGenre = output<void>();
  readonly toggleSaved = output<void>();
  readonly toggleAlreadySeen = output<void>();
  readonly share = output<void>();
  readonly trailer = output<void>();
  readonly spinYourself = output<void>();
  readonly back = output<void>();

  protected readonly t = inject(STRINGS);
  private readonly tmdb = inject(TmdbService);
  private readonly now = inject(NOW);
  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

  protected readonly respinOpen = signal(false);
  protected readonly overviewOpen = signal(false);

  /** Long overviews start folded so the stub and its actions stay close on a phone. */
  protected readonly longOverview = computed(() => this.movie().overview.length > LONG_OVERVIEW);

  protected readonly posterUrl = computed(() => {
    const path = this.movie().posterPath;
    return path ? this.tmdb.imageUrl(path, 'w342') : null;
  });

  protected readonly showOriginalTitle = computed(() => {
    const m = this.movie();
    return m.originalTitle.trim().toLocaleLowerCase('ro') !== m.title.trim().toLocaleLowerCase('ro');
  });

  protected readonly rating = computed(() => {
    const rating = this.movie().rating;
    return rating === null ? null : this.t.format.rating(rating);
  });

  protected readonly runtime = computed(() => {
    const runtime = this.movie().runtime;
    return runtime === null ? null : this.t.format.runtime(runtime);
  });

  protected readonly providerGroups = computed(() => groupProviders(this.movie(), this.region()));
  protected readonly mine = computed(() => new Set(this.myPlatforms()));
  protected readonly providerLink = computed(() => this.movie().providers[this.region()]?.link ?? null);

  /** A seat derived from the TMDB id, so the same film always gets the same ticket. */
  protected readonly seat = computed(() => {
    const id = this.movie().id;
    return { row: (id % 14) + 1, seat: (Math.floor(id / 14) % 20) + 1 };
  });

  protected readonly dateLabel = computed(() =>
    this.t.format.date(this.origin() === 'spin' ? this.nightStartedAt() : this.now()),
  );

  constructor() {
    // The card replaces the reel; move focus to the title so keyboard and screen reader users land on it.
    afterNextRender(() => this.title().nativeElement.focus());
  }

  protected logoUrl(provider: Provider): string | null {
    return provider.logo_path ? this.tmdb.imageUrl(provider.logo_path, 'w92') : null;
  }
}
