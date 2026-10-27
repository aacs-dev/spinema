import { Injectable, inject } from '@angular/core';
import { randomInt, shuffle } from './rng';
import { TmdbService } from './tmdb.service';
import { Filters, MovieSummary } from './tmdb.models';
import { RNG } from './tokens';

export const MAX_PAGE = 20;
export const MAX_ATTEMPTS = 3;
export const REEL_MIN = 12;
export const REEL_MAX = 16;

export interface ReelPick {
  winner: MovieSummary;
  /** Posters in the order they pass the window. The reel stops on `strip[stopIndex]`. */
  strip: MovieSummary[];
  stopIndex: number;
}

export type PickResult = { kind: 'ok'; pick: ReelPick } | { kind: 'empty' };

/** Random movie selection for a genre, following the brief's page-sampling algorithm. */
@Injectable({ providedIn: 'root' })
export class PickerService {
  private readonly tmdb = inject(TmdbService);
  private readonly rng = inject(RNG);

  async pick(genreId: number, filters: Filters, exclude: ReadonlySet<number>): Promise<PickResult> {
    // 1. Page 1 tells us how many pages exist.
    const first = await this.tmdb.discover(genreId, filters, 1);
    // 2. Stay among the first 20 pages so picks remain well-known films.
    const maxPage = Math.min(first.total_pages, MAX_PAGE);
    if (maxPage < 1 || first.results.length === 0) return { kind: 'empty' };

    const tried = new Set<number>();
    // 5. An empty pool moves on to another page, at most three attempts in total.
    for (let attempt = 0; attempt < MAX_ATTEMPTS && tried.size < maxPage; attempt++) {
      const page = this.untriedPage(maxPage, tried);
      tried.add(page);
      const data = page === 1 ? first : await this.tmdb.discover(genreId, filters, page);

      // 3. Drop movies without a poster and movies already seen tonight.
      const withPoster = data.results.filter((m) => !!m.poster_path);
      const pool = withPoster.filter((m) => !exclude.has(m.id));
      if (pool.length === 0) continue;

      // 4. Winner at random; the reel is built from other posters of the same page.
      const winner = pool[randomInt(this.rng, 0, pool.length - 1)];
      return { kind: 'ok', pick: this.buildStrip(winner, withPoster) };
    }
    return { kind: 'empty' };
  }

  private untriedPage(maxPage: number, tried: ReadonlySet<number>): number {
    const options: number[] = [];
    for (let p = 1; p <= maxPage; p++) if (!tried.has(p)) options.push(p);
    return options[randomInt(this.rng, 0, options.length - 1)];
  }

  /**
   * 12–16 other posters, with the winner second to last: the one poster after it is what
   * peeks through the window during the overshoot before the reel settles.
   */
  private buildStrip(winner: MovieSummary, candidates: readonly MovieSummary[]): ReelPick {
    const others = shuffle(
      this.rng,
      candidates.filter((m) => m.id !== winner.id),
    );
    const count = randomInt(this.rng, REEL_MIN, REEL_MAX);
    const decoys: MovieSummary[] = [];
    // A page normally has ~20 posters; on short pages the decoys repeat rather than leave gaps.
    for (let i = 0; i < count; i++) decoys.push(others.length > 0 ? others[i % others.length] : winner);

    const after = decoys.pop() as MovieSummary;
    return { winner, strip: [...decoys, winner, after], stopIndex: decoys.length };
  }
}
