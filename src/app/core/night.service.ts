import { Injectable, computed, inject, signal } from '@angular/core';
import { Night, StorageService } from './storage.service';
import { NOW } from './tokens';

export const TOKENS_PER_NIGHT = 3;
/** Local hour at which a new movie night begins. A session that runs past midnight stays in its evening. */
export const NIGHT_STARTS_AT_HOUR = 6;

/** Start of the movie night that contains `time`: the latest 06:00, local time, at or before it. */
export function nightStartBefore(time: number): number {
  const start = new Date(time);
  start.setHours(NIGHT_STARTS_AT_HOUR, 0, 0, 0);
  if (start.getTime() > time) start.setDate(start.getDate() - 1);
  return start.getTime();
}

/**
 * Re-spin tokens for one movie night. The first spin of a night is free; every spin after a
 * result has been shown costs one token. A night lasts until the next 06:00 or until "Seară nouă".
 */
@Injectable({ providedIn: 'root' })
export class NightService {
  private readonly storage = inject(StorageService);
  private readonly now = inject(NOW);
  private readonly state = signal<Night>(this.load());

  readonly night = this.state.asReadonly();
  readonly tokens = computed(() => this.state().tokens);
  /** 0 before tonight's first result, 1 afterwards. */
  readonly spinCost = computed(() => (this.state().seenIds.length === 0 ? 0 : 1));
  readonly canSpin = computed(() => this.state().tokens >= this.spinCost());
  readonly lastSeenId = computed(() => this.state().seenIds.at(-1) ?? null);
  readonly vetoedGenreIds = computed(() => this.state().vetoedGenreIds);

  /** Starts a new night once 06:00 has passed since the current one began. */
  refresh(): void {
    if (this.isExpired(this.state())) this.reset();
  }

  reset(): void {
    this.save(this.fresh());
  }

  /** Spends `cost` tokens if available. Returns false (and spends nothing) otherwise. */
  trySpend(cost: number): boolean {
    this.refresh();
    const night = this.state();
    if (night.tokens < cost) return false;
    if (cost > 0) this.save({ ...night, tokens: night.tokens - cost });
    return true;
  }

  markSeen(id: number): void {
    const night = this.state();
    if (night.seenIds.includes(id)) return;
    this.save({ ...night, seenIds: [...night.seenIds, id] });
  }

  /** Replaces tonight's group veto. It ends with the night, like the tokens. */
  setVetoes(genreIds: readonly number[]): void {
    this.refresh();
    this.save({ ...this.state(), vetoedGenreIds: [...new Set(genreIds)] });
  }

  private fresh(): Night {
    return { tokens: TOKENS_PER_NIGHT, startedAt: this.now(), seenIds: [], vetoedGenreIds: [] };
  }

  private isExpired(night: Night): boolean {
    const now = this.now();
    // A clock that moved backwards also starts a fresh night.
    return night.startedAt < nightStartBefore(now) || night.startedAt > now;
  }

  private load(): Night {
    const stored = this.storage.read('night');
    if (stored && !this.isExpired(stored)) return { ...stored, tokens: Math.min(stored.tokens, TOKENS_PER_NIGHT) };
    const fresh = this.fresh();
    this.storage.write('night', fresh);
    return fresh;
  }

  private save(night: Night): void {
    this.state.set(night);
    this.storage.write('night', night);
  }
}
