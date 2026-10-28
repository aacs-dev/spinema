import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { SoundService } from '../core/sound.service';
import { Genre } from '../core/tmdb.models';
import { STRINGS } from '../i18n/strings';
import { tickTimes } from './wheel-math';

const ROTOR_RADIUS = 168;
const LABEL_END = 152;
const RIVET_RADIUS = 159;
const BULB_COUNT = 32;
const PLACEHOLDER_SEGMENTS = 12;

type SegmentColor = 'catifea' | 'alama' | 'lambriu';
const COLORS: readonly SegmentColor[] = ['catifea', 'alama', 'lambriu'];

interface Segment {
  key: number;
  name: string;
  path: string;
  color: SegmentColor;
  labelTransform: string;
  fontSize: number;
}

/** Point on a circle, angle in degrees clockwise from 12 o'clock. */
function point(angle: number, r: number): string {
  const rad = (angle * Math.PI) / 180;
  return `${(r * Math.sin(rad)).toFixed(2)} ${(-r * Math.cos(rad)).toFixed(2)}`;
}

/** Cycles three colors; the last segment never matches its neighbours, whatever the count. */
export function segmentColor(index: number, count: number): SegmentColor {
  const base = index % COLORS.length;
  if (index === count - 1 && count > 1 && base === 0) {
    const previous = (index - 1) % COLORS.length;
    return COLORS.find((_, i) => i !== 0 && i !== previous) ?? COLORS[1];
  }
  return COLORS[base];
}

@Component({
  selector: 'app-genre-wheel',
  templateUrl: './genre-wheel.html',
  styleUrl: './genre-wheel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenreWheel implements OnInit {
  readonly genres = input.required<readonly Genre[]>();
  readonly rotation = input.required<number>();
  /** Where the spin under way started. A wheel that appears mid-spin turns from here. */
  readonly spinStart = input<number | null>(null);
  readonly durationMs = input.required<number>();
  readonly spinning = input(false);
  /** Segment to light up once the wheel has landed. */
  readonly litIndex = input<number | null>(null);
  readonly disabled = input(false);
  readonly describedBy = input<string | null>(null);
  /** Focus the wheel when it comes back after a card, so keyboard users are not dropped on <body>. */
  readonly focusOnInit = input(false);
  readonly spin = output<void>();

  protected readonly t = inject(STRINGS);
  private readonly sound = inject(SoundService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  private readonly rotor = viewChild.required<ElementRef<HTMLElement>>('rotor');
  /** Angle the rotor last came to rest at, for the tick sounds; null until the first render. */
  private restingAt: number | null = null;

  /**
   * Set while a wheel that appeared mid-spin paints its first frame at `spinStart`. Without that
   * frame the rotor would be created already at the target and the CSS transition would not run.
   */
  protected readonly enteringAt = signal<number | null>(null);

  protected readonly bulbs = Array.from({ length: BULB_COUNT }, (_, i) => {
    const angle = (i / BULB_COUNT) * 2 * Math.PI;
    return { x: (200 + 185 * Math.sin(angle)).toFixed(2), y: (200 - 185 * Math.cos(angle)).toFixed(2), phase: i % 3 };
  });
  /** Bulbs split into the three groups that light up in turn. */
  protected readonly bulbGroups = [0, 1, 2].map((phase) => this.bulbs.filter((b) => b.phase === phase));

  protected readonly segments = computed<Segment[]>(() => {
    const genres = this.genres();
    const items = genres.length > 0 ? genres : Array.from({ length: PLACEHOLDER_SEGMENTS }, (_, i) => ({ id: -i, name: '' }));
    const n = items.length;
    const seg = 360 / n;
    const baseSize = n > 16 ? 17 : n > 10 ? 19 : 22;
    return items.map((genre, i) => {
      const start = i * seg;
      const end = start + seg;
      const center = start + seg / 2;
      const chars = Math.max(genre.name.length, 1);
      return {
        key: genre.id,
        name: genre.name,
        path:
          n === 1
            ? `M 0 ${-ROTOR_RADIUS} A ${ROTOR_RADIUS} ${ROTOR_RADIUS} 0 1 1 0 ${ROTOR_RADIUS} A ${ROTOR_RADIUS} ${ROTOR_RADIUS} 0 1 1 0 ${-ROTOR_RADIUS} Z`
            : `M 0 0 L ${point(start, ROTOR_RADIUS)} A ${ROTOR_RADIUS} ${ROTOR_RADIUS} 0 ${seg > 180 ? 1 : 0} 1 ${point(end, ROTOR_RADIUS)} Z`,
        color: segmentColor(i, n),
        labelTransform: `rotate(${(center - 90).toFixed(3)})`,
        // Long names shrink so they stay inside their slice.
        fontSize: chars > 11 ? Math.max(11, (baseSize * 11) / chars) : baseSize,
      };
    });
  });

  /** Brass rivets on the rim, one per segment border. */
  protected readonly rivets = computed(() => {
    const n = this.segments().length;
    return Array.from({ length: n }, (_, i) => {
      const angle = ((i * 360) / n) * (Math.PI / 180);
      return { x: (RIVET_RADIUS * Math.sin(angle)).toFixed(2), y: (-RIVET_RADIUS * Math.cos(angle)).toFixed(2) };
    });
  });

  protected readonly litPath = computed(() => {
    const index = this.litIndex();
    return index === null ? null : (this.segments()[index]?.path ?? null);
  });

  protected readonly labelEnd = LABEL_END;

  constructor() {
    afterNextRender(() => {
      if (this.focusOnInit()) this.button().nativeElement.focus();
      if (this.enteringAt() !== null) {
        // Reading the style makes the browser commit the start angle before it moves to the target.
        void getComputedStyle(this.rotor().nativeElement).transform;
        this.enteringAt.set(null);
      }
    });

    // Optional tick sound: one click per segment border passing the pointer.
    effect(() => {
      const target = this.rotation();
      const duration = this.durationMs();
      untracked(() => {
        // A wheel that appears at rest stays silent; one that appears mid-spin ticks from where it started.
        const from = this.restingAt ?? (this.spinning() ? (this.spinStart() ?? target) : target);
        if (target !== from && duration > 0) {
          this.sound.ticks(tickTimes(from, target, this.segments().length, duration));
        }
        this.restingAt = target;
      });
    });

    effect(() => {
      if (this.litIndex() === null) return;
      untracked(() => {
        this.sound.chime();
        void this.celebrate();
      });
    });
  }

  ngOnInit(): void {
    const start = this.spinStart();
    if (this.spinning() && this.durationMs() > 0 && start !== null && start !== this.rotation()) {
      this.enteringAt.set(start);
    }
  }

  protected activate(): void {
    if (this.disabled() || this.spinning()) return;
    this.spin.emit();
  }

  /** Short confetti burst from the pointer. Loaded on demand so it stays out of the initial bundle. */
  private async celebrate(): Promise<void> {
    const { default: confetti } = await import('canvas-confetti');
    const rect = this.host.nativeElement.getBoundingClientRect();
    await confetti({
      particleCount: 70,
      spread: 75,
      startVelocity: 32,
      ticks: 150,
      scalar: 0.9,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height * 0.06) / window.innerHeight,
      },
      colors: ['#FFE3A1', '#D8B05A', '#8A1B2A', '#D3E5CB', '#F1EBE0'],
      disableForReducedMotion: true,
    });
  }
}
