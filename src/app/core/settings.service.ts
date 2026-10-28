import { Injectable, computed, inject, signal } from '@angular/core';
import { detectRegion } from './region';
import { DEFAULT_SETTINGS, Settings, StorageService } from './storage.service';
import { Filters } from './tmdb.models';
import { TIME_ZONE } from './tokens';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);
  private readonly state = signal<Settings>(this.storage.read('settings') ?? DEFAULT_SETTINGS);

  /** The country the device's time zone points to, read once at start-up. */
  readonly detectedRegion = detectRegion(inject(TIME_ZONE));

  readonly settings = this.state.asReadonly();
  /** The streaming country in effect: the one picked in settings, else the detected one. */
  readonly region = computed(() => this.state().region ?? this.detectedRegion.region);
  readonly regionIsAuto = computed(() => this.state().region === null);
  readonly sound = computed(() => this.state().sound);
  /** The platforms picked for the current region. */
  readonly platformIds = computed(() => this.state().platforms[this.region()] ?? []);
  readonly filters = computed<Filters>(() => {
    const ids = this.platformIds();
    const { maxRuntime, decade, minRating } = this.state();
    return { maxRuntime, decade, minRating, platforms: ids.length > 0 ? { region: this.region(), ids } : null };
  });

  update(patch: Partial<Settings>): void {
    this.state.update((s) => ({ ...s, ...patch }));
    this.storage.write('settings', this.state());
  }
}
