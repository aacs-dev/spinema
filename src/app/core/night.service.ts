import { Injectable, computed, inject, signal } from '@angular/core';
import { Night, StorageService } from './storage.service';
import { NOW } from './tokens';

export const TOKENS_PER_NIGHT = 3;
export const NIGHT_LENGTH_MS = 6 * 60 * 60 * 1000;

/**
 * Re-spin tokens for one movie night. The first spin of a night is free; every spin after a
 * result has been shown costs one token. A night lasts 6 hours or until "Seară nouă".
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

  /** Starts a new night if the current one is older than 6 hours. */
  refresh(): void {
    if (this.isExpired(this.state())) this.reset();
  }

  reset(): void {
    this.save({ tokens: TOKENS_PER_NIGHT, startedAt: this.now(), seenIds: [] });
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

  private isExpired(night: Night): boolean {
    const age = this.now() - night.startedAt;
    // A clock that moved backwards also starts a fresh night.
    return age >= NIGHT_LENGTH_MS || age < 0;
  }

  private load(): Night {
    const stored = this.storage.read('night');
    if (stored && !this.isExpired(stored)) return { ...stored, tokens: Math.min(stored.tokens, TOKENS_PER_NIGHT) };
    const fresh: Night = { tokens: TOKENS_PER_NIGHT, startedAt: this.now(), seenIds: [] };
    this.storage.write('night', fresh);
    return fresh;
  }

  private save(night: Night): void {
    this.state.set(night);
    this.storage.write('night', night);
  }
}
