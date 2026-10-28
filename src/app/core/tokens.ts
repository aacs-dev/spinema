import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** Returns a float in [0, 1). Injectable so tests can seed it. */
export type Rng = () => number;
export const RNG = new InjectionToken<Rng>('RNG', { providedIn: 'root', factory: () => Math.random });

/** Current time in ms. Injectable so tests can move the clock. */
export type Clock = () => number;
export const NOW = new InjectionToken<Clock>('NOW', { providedIn: 'root', factory: () => () => Date.now() });

/** Waits for the given number of ms. Tests replace it with an instant resolver. */
export type Delay = (ms: number) => Promise<void>;
export const DELAY = new InjectionToken<Delay>('DELAY', {
  providedIn: 'root',
  factory: () => (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
});

/** The device's IANA time zone, e.g. "Europe/Bucharest". Picks the streaming country until the user does. */
export const TIME_ZONE = new InjectionToken<string>('TIME_ZONE', {
  providedIn: 'root',
  factory: () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
});

/** Whether the user asked the OS for reduced motion. Read at the moment of each spin. */
export const REDUCED_MOTION = new InjectionToken<() => boolean>('REDUCED_MOTION', {
  providedIn: 'root',
  factory: () => () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
});

export interface ApiConfig {
  workerUrl: string;
  imageBaseUrl: string;
}
export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  providedIn: 'root',
  factory: () => environment,
});

/** Preloads and decodes images. Swapped out in tests where jsdom cannot decode. */
export type ImagePreloader = (urls: readonly string[]) => Promise<void>;
export const IMAGE_PRELOADER = new InjectionToken<ImagePreloader>('IMAGE_PRELOADER', {
  providedIn: 'root',
  factory: () => preloadImages,
});

const PRELOAD_TIMEOUT_MS = 4000;

export async function preloadImages(urls: readonly string[]): Promise<void> {
  const unique = [...new Set(urls)];
  const all = Promise.all(
    unique.map((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      // A broken poster should not block the reel; it simply shows the frame background.
      return img.decode().catch(() => undefined);
    }),
  );
  await Promise.race([all, new Promise((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS))]);
}
