import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TOKENS_PER_NIGHT } from '../core/night.service';
import { STRINGS } from '../i18n/strings';

/** Tonight's re-spin tokens, drawn as brass jetons with a hole; spent ones are outlines. */
@Component({
  selector: 'app-token-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="tokens" role="img" [attr.aria-label]="t.header.tokens(left(), total)">
      @for (slot of slots; track slot) {
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="8.25" [class.spent]="slot >= left()" />
          <circle cx="10" cy="10" r="2.5" class="hole" />
        </svg>
      }
    </span>
  `,
  styles: `
    .tokens {
      display: inline-flex;
      gap: 0.25rem;
      align-items: center;
      min-height: 44px;
      padding-inline: 0.25rem;
    }
    circle {
      fill: var(--alama-decor);
      stroke: var(--alama);
      stroke-width: 1.5;
    }
    circle.spent {
      fill: none;
      stroke: var(--muted);
      stroke-dasharray: 2.4 2;
    }
    .hole {
      fill: var(--sala);
      stroke: none;
    }
  `,
})
export class TokenCounter {
  readonly left = input.required<number>();
  protected readonly total = TOKENS_PER_NIGHT;
  protected readonly slots = Array.from({ length: TOKENS_PER_NIGHT }, (_, i) => i);
  protected readonly t = inject(STRINGS);
}
