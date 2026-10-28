import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * What the installed app needs to tell the user: that the network is gone (the history and the
 * tickets already opened still work, from the service worker's cache), and that a new version has
 * been downloaded and starts with a reload.
 */
@Injectable({ providedIn: 'root' })
export class AppStatus {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly updates = inject(SwUpdate);

  readonly online = signal(this.window?.navigator.onLine ?? true);
  readonly updateReady = signal(false);

  constructor() {
    const setOnline = () => this.online.set(true);
    const setOffline = () => this.online.set(false);
    this.window?.addEventListener('online', setOnline);
    this.window?.addEventListener('offline', setOffline);

    // Disabled in development and in browsers without service workers; then it never fires.
    const ready = this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.updateReady.set(true));

    inject(DestroyRef).onDestroy(() => {
      this.window?.removeEventListener('online', setOnline);
      this.window?.removeEventListener('offline', setOffline);
      ready.unsubscribe();
    });
  }

  /** Switches to the downloaded version, then reloads into it. */
  async applyUpdate(): Promise<void> {
    if (this.updates.isEnabled) await this.updates.activateUpdate().catch(() => false);
    this.window?.location.reload();
  }
}
