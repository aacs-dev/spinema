import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { SoundService } from '../core/sound.service';
import { REEL_SPIN_MS, ReelState } from '../game/game.store';
import { STRINGS } from '../i18n/strings';

/** Portion of the run spent reaching the overshoot; the rest settles back onto the winner. */
const OVERSHOOT_AT = 0.86;
const OVERSHOOT_RATIO = 0.09;

@Component({
  selector: 'app-poster-reel',
  templateUrl: './poster-reel.html',
  styleUrl: './poster-reel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosterReel {
  readonly reel = input<ReelState | null>(null);
  readonly genreName = input('');

  protected readonly t = inject(STRINGS);
  private readonly sound = inject(SoundService);
  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');
  private readonly gate = viewChild<ElementRef<HTMLElement>>('gate');

  /** Slot-machine order: the strip moves down, so the first poster to pass is at the bottom. */
  protected readonly frames = computed(() => [...(this.reel()?.items ?? [])].reverse());
  protected readonly rolling = signal(false);

  private animation: Animation | null = null;
  private lastRun: number | null = null;

  constructor() {
    afterRenderEffect(() => {
      const reel = this.reel();
      const strip = this.strip()?.nativeElement;
      const gate = this.gate()?.nativeElement;
      if (!reel || !strip || !gate || reel.run === this.lastRun) return;
      this.lastRun = reel.run;
      untracked(() => this.roll(reel, strip, gate));
    });
    inject(DestroyRef).onDestroy(() => this.animation?.cancel());
  }

  private roll(reel: ReelState, strip: HTMLElement, gate: HTMLElement): void {
    const frame = strip.firstElementChild as HTMLElement | null;
    if (!frame) return;
    const frameHeight = frame.offsetHeight;
    const centerOffset = (gate.clientHeight - frameHeight) / 2;
    const last = reel.items.length - 1;
    const stopFrame = last - reel.stopIndex;

    const from = -last * frameHeight + centerOffset;
    const to = -stopFrame * frameHeight + centerOffset;
    const overshoot = frameHeight * OVERSHOOT_RATIO;

    this.animation?.cancel();
    this.animation = strip.animate(
      [
        // Fast start, long slow-down…
        { transform: `translate3d(0, ${from}px, 0)`, easing: 'cubic-bezier(0.1, 0.55, 0.2, 1)' },
        // …a small overshoot past the winner…
        { transform: `translate3d(0, ${to + overshoot}px, 0)`, offset: OVERSHOOT_AT, easing: 'cubic-bezier(0.35, 0, 0.4, 1)' },
        // …and it settles.
        { transform: `translate3d(0, ${to}px, 0)` },
      ],
      { duration: REEL_SPIN_MS, fill: 'forwards' },
    );
    this.rolling.set(true);
    this.sound.rattle(REEL_SPIN_MS * OVERSHOOT_AT);
    this.animation.finished.then(
      () => {
        this.rolling.set(false);
        this.sound.chime();
      },
      () => this.rolling.set(false),
    );
  }
}
