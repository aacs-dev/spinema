import { Injectable, computed, inject, signal } from '@angular/core';
import { DEFAULT_SETTINGS, Settings, StorageService } from './storage.service';
import { Filters } from './tmdb.models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);
  private readonly state = signal<Settings>(this.storage.read('settings') ?? DEFAULT_SETTINGS);

  readonly settings = this.state.asReadonly();
  readonly filters = computed<Filters>(() => ({ maxRuntime: this.state().maxRuntime }));
  readonly region = computed(() => this.state().region);
  readonly sound = computed(() => this.state().sound);

  update(patch: Partial<Settings>): void {
    this.state.update((s) => ({ ...s, ...patch }));
    this.storage.write('settings', this.state());
  }
}
