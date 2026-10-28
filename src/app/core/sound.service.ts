import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';

/** Short synthesized clicks via Web Audio. Silent unless the user enables sound in settings. */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly settings = inject(SettingsService);
  private context: AudioContext | null = null;

  /** Call from a tap or key handler: browsers only start or resume audio in response to a user gesture. */
  prime(): void {
    this.audio();
  }

  /** Schedules wheel ticks at the given offsets (ms) from now. */
  ticks(offsetsMs: readonly number[]): void {
    const ctx = this.audio();
    if (!ctx) return;
    const start = ctx.currentTime + 0.02;
    for (const offset of offsetsMs) this.blip(ctx, start + offset / 1000, 1900, 0.025, 0.05);
  }

  /** Two-note chime when the wheel or the reel settles. */
  chime(): void {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    this.blip(ctx, t, 784, 0.35, 0.09);
    this.blip(ctx, t + 0.12, 1175, 0.45, 0.08);
  }

  /** Projector-like rattle that slows down with the reel. */
  rattle(durationMs: number): void {
    const ctx = this.audio();
    if (!ctx) return;
    const start = ctx.currentTime + 0.02;
    let t = 0;
    let gap = 0.035;
    while (t < durationMs / 1000) {
      this.blip(ctx, start + t, 320, 0.02, 0.035);
      t += gap;
      gap *= 1.07;
    }
  }

  private audio(): AudioContext | null {
    if (!this.settings.sound() || typeof AudioContext === 'undefined') return null;
    this.context ??= new AudioContext();
    // Not only 'suspended': Safari reports 'interrupted' after a call, a trailer or a locked screen.
    // Outside a user gesture the resume is refused; the next tap primes it again.
    if (this.context.state !== 'running') this.context.resume().catch(() => undefined);
    return this.context;
  }

  private blip(ctx: AudioContext, at: number, freq: number, length: number, volume: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length + 0.01);
  }
}
