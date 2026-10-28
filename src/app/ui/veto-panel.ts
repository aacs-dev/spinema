import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Genre } from '../core/tmdb.models';
import { MIN_PEOPLE } from '../game/group-veto';
import { STRINGS } from '../i18n/strings';

type Mode = 'closed' | 'count' | 'picking' | 'done';

/**
 * The group veto on the start screen. Presentational: the veto itself lives in `GroupVeto`.
 * Genres are picked from buttons rather than wheel slices, so it works by touch, keyboard and
 * screen reader alike. Focus follows each step.
 */
@Component({
  selector: 'app-veto-panel',
  templateUrl: './veto-panel.html',
  styleUrl: './veto-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VetoPanel {
  /** Genres still on the wheel. */
  readonly genres = input.required<readonly Genre[]>();
  readonly vetoed = input.required<readonly Genre[]>();
  readonly people = input<number | null>(null);
  readonly turn = input(0);
  readonly maxPeople = input.required<number>();
  /** True while the wheel or reel runs: nothing may change then. */
  readonly locked = input(false);

  readonly start = output<number>();
  readonly pick = output<number>();
  readonly cancel = output<void>();
  readonly clear = output<void>();

  protected readonly t = inject(STRINGS);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly choosingCount = signal(false);
  protected readonly count = signal(MIN_PEOPLE);

  protected readonly mode = computed<Mode>(() => {
    if (this.people() !== null) return 'picking';
    if (this.choosingCount()) return 'count';
    return this.vetoed().length > 0 ? 'done' : 'closed';
  });

  protected readonly counts = computed(() =>
    Array.from({ length: Math.max(0, this.maxPeople() - MIN_PEOPLE + 1) }, (_, i) => MIN_PEOPLE + i),
  );

  /** The genre the previous person took off, while the veto is under way. */
  protected readonly lastRemoved = computed(() => (this.people() !== null ? (this.vetoed().at(-1)?.name ?? null) : null));

  protected readonly vetoedList = computed(() =>
    new Intl.ListFormat(this.t.locale, { style: 'long', type: 'conjunction' }).format(this.vetoed().map((g) => g.name)),
  );

  private readonly openButton = viewChild<ElementRef<HTMLButtonElement>>('openButton');
  private readonly prompt = viewChild<ElementRef<HTMLElement>>('prompt');
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  protected openCount(): void {
    if (this.locked()) return;
    this.count.set(Math.min(this.count(), this.maxPeople()));
    this.choosingCount.set(true);
    this.focusAfterRender();
  }

  protected closeCount(): void {
    this.choosingCount.set(false);
    this.focusAfterRender();
  }

  protected begin(): void {
    this.choosingCount.set(false);
    this.start.emit(this.count());
    this.focusAfterRender();
  }

  protected choose(genreId: number): void {
    this.pick.emit(genreId);
    this.focusAfterRender();
  }

  protected stop(): void {
    this.cancel.emit();
    this.focusAfterRender();
  }

  protected undo(): void {
    this.clear.emit();
    this.focusAfterRender();
  }

  /** The step's main element takes focus once it is on screen; the button pressed may be gone. */
  private focusAfterRender(): void {
    afterNextRender(
      () => {
        const mode = this.mode();
        const target =
          mode === 'closed'
            ? this.openButton()?.nativeElement
            : mode === 'count'
              ? this.host.nativeElement.querySelector<HTMLInputElement>('.count-option input:checked')
              : mode === 'picking'
                ? this.prompt()?.nativeElement
                : this.summary()?.nativeElement;
        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
