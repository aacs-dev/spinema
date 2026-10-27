import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { STRINGS } from '../i18n/strings';
import { Icon } from './icon';
import { ModalDialog } from './modal-dialog';

/**
 * Official TMDB logo from https://www.themoviedb.org/about/logos-attribution, used unmodified.
 * To self-host it, save the SVG as public/tmdb-logo.svg and point this constant at 'tmdb-logo.svg'.
 */
export const TMDB_LOGO_URL =
  'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg';

@Component({
  selector: 'app-about-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialog, Icon],
  template: `
    <dialog class="sheet" [appModal]="open()" (closed)="closed.emit()" #modal="appModal" aria-labelledby="about-title">
      <div class="sheet-inner">
        <header class="sheet-header">
          <h2 id="about-title" class="sheet-title">{{ t.about.title }}</h2>
          <button type="button" class="icon-btn" [attr.aria-label]="t.close" (click)="modal.close()">
            <app-icon name="close" />
          </button>
        </header>

        <p class="about-wordmark" aria-hidden="true">{{ t.appName }}</p>
        <p>{{ t.about.body }}</p>
        <p>{{ t.about.nonCommercial }}</p>

        <div class="about-credits">
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" class="tmdb-link">
            <img [src]="logo" [alt]="t.about.tmdbLogoAlt" width="120" height="16" />
          </a>
          <p lang="en">{{ t.about.tmdbNotice }}</p>
          <p class="hint">{{ t.about.tmdbNoticeLocal }}</p>
          <p class="hint">
            <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer">{{ t.about.justWatch }}</a>
          </p>
        </div>
      </div>
    </dialog>
  `,
})
export class AboutDialog {
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly t = inject(STRINGS);
  protected readonly logo = TMDB_LOGO_URL;
}
