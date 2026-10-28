import { Injectable, computed, inject, signal } from '@angular/core';
import { NightService } from '../core/night.service';
import { Genre } from '../core/tmdb.models';
import { GameStore } from './game.store';

export const MIN_PEOPLE = 2;
export const MAX_PEOPLE = 6;
/** The wheel always keeps at least this many genres, however many people veto. */
export const MIN_GENRES_LEFT = 3;

/**
 * "Veto de grup": before the spin, each person takes one genre off the wheel. The vetoed genres
 * are part of the night, so they also hold for "Alt gen" and end at 06:00 or with "Seară nouă".
 * Changes are only accepted on the start screen at rest, never while the wheel or reel runs.
 */
@Injectable({ providedIn: 'root' })
export class GroupVeto {
  private readonly store = inject(GameStore);
  private readonly night = inject(NightService);

  /** How many people take part in the veto under way; null when none is running. */
  readonly people = signal<number | null>(null);
  /** Whose turn it is, from 0. */
  readonly turn = signal(0);
  readonly inProgress = computed(() => this.people() !== null);

  /** Tonight's vetoed genres, in the order they were taken off. */
  readonly vetoed = computed(() => {
    const byId = new Map(this.store.genres().map((g) => [g.id, g]));
    return this.night.vetoedGenreIds().map((id) => byId.get(id)).filter((g): g is Genre => g !== undefined);
  });

  readonly maxPeople = computed(() => Math.min(MAX_PEOPLE, this.store.genres().length - MIN_GENRES_LEFT));
  readonly available = computed(() => this.store.genresReady() && this.maxPeople() >= MIN_PEOPLE);

  /** Starts a fresh veto: an earlier one tonight is replaced, not added to. */
  start(people: number): void {
    if (!this.atRest() || !this.available() || people < MIN_PEOPLE || people > this.maxPeople()) return;
    this.night.setVetoes([]);
    this.turn.set(0);
    this.people.set(people);
  }

  pick(genreId: number): void {
    const people = this.people();
    if (people === null || !this.atRest()) return;
    if (!this.store.wheelGenres().some((g) => g.id === genreId)) return;
    this.night.setVetoes([...this.night.vetoedGenreIds(), genreId]);
    if (this.turn() + 1 >= people) this.people.set(null);
    else this.turn.update((t) => t + 1);
  }

  /** Stops a veto under way and puts its genres back on the wheel. */
  cancel(): void {
    if (!this.atRest()) return;
    this.night.setVetoes([]);
    this.people.set(null);
  }

  /** "Anulează vetoul": every genre back on the wheel. */
  clear(): void {
    if (!this.atRest() || this.inProgress()) return;
    this.night.setVetoes([]);
  }

  private atRest(): boolean {
    return this.store.phase() === 'idle';
  }
}
