import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/** Chromium's install event; not in the standard DOM typings. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * How the app can be put on the home screen here:
 * - `prompt`: Chrome, Edge, Samsung Internet… offer their own install dialog, opened by a button;
 * - `ios`: iPhone and iPad only allow it by hand, from the share menu;
 * - `installed`: already running as an installed app;
 * - `unavailable`: the browser has no install route we can trigger (it may still have one in its menu).
 */
export type InstallMode = 'prompt' | 'ios' | 'installed' | 'unavailable';

let early: BeforeInstallPromptEvent | null = null;

/**
 * Call first thing in main.ts. The browser can fire its install event before Angular has started
 * (and English or Hungarian load their texts first), so it is caught here and handed over later.
 */
export function captureEarlyInstallPrompt(target: Window): void {
  target.addEventListener('beforeinstallprompt', (event) => {
    // Keeps Chrome's own mini-bar away: the app shows its own, better-timed offer.
    event.preventDefault();
    early = event as BeforeInstallPromptEvent;
  });
}

export function isAppleMobile(navigator: Navigator): boolean {
  // iPadOS reports itself as a Mac; touch gives it away.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

@Injectable({ providedIn: 'root' })
export class InstallPrompt {
  private readonly window = inject(DOCUMENT).defaultView;
  private deferred: BeforeInstallPromptEvent | null = early;

  private readonly promptReady = signal(early !== null);
  private readonly standalone = signal(this.isStandalone());
  private readonly ios = this.window ? isAppleMobile(this.window.navigator) : false;

  readonly mode = computed<InstallMode>(() => {
    if (this.standalone()) return 'installed';
    if (this.promptReady()) return 'prompt';
    return this.ios ? 'ios' : 'unavailable';
  });

  constructor() {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      this.promptReady.set(true);
    };
    const onInstalled = () => {
      this.deferred = null;
      this.promptReady.set(false);
      this.standalone.set(true);
    };
    this.window?.addEventListener('beforeinstallprompt', onPrompt);
    this.window?.addEventListener('appinstalled', onInstalled);
    inject(DestroyRef).onDestroy(() => {
      this.window?.removeEventListener('beforeinstallprompt', onPrompt);
      this.window?.removeEventListener('appinstalled', onInstalled);
    });
  }

  /** Opens the browser's install dialog. Resolves true when the user accepts. */
  async install(): Promise<boolean> {
    const event = this.deferred;
    if (!event) return false;
    // The event can be used only once, whatever the answer.
    this.deferred = null;
    this.promptReady.set(false);
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') this.standalone.set(true);
    return outcome === 'accepted';
  }

  private isStandalone(): boolean {
    const w = this.window;
    if (!w) return false;
    const iosStandalone = (w.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return iosStandalone || (typeof w.matchMedia === 'function' && w.matchMedia('(display-mode: standalone)').matches);
  }
}
