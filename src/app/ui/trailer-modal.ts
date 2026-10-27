import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { STRINGS } from '../i18n/strings';
import { Icon } from './icon';
import { ModalDialog } from './modal-dialog';

const YOUTUBE_KEY = /^[A-Za-z0-9_-]{11}$/;

/** Builds the privacy-enhanced embed URL, or null for anything that is not a YouTube video id. */
export function trailerEmbedUrl(key: string): string | null {
  return YOUTUBE_KEY.test(key) ? `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0&playsinline=1` : null;
}

/** Lazy-loaded. The iframe only exists while the modal is open, so closing it stops playback. */
@Component({
  selector: 'app-trailer-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialog, Icon],
  template: `
    <dialog class="trailer" [appModal]="open()" (closed)="closed.emit()" #modal="appModal" [attr.aria-label]="t.trailer.title(title())">
      <div class="trailer-inner">
        <button type="button" class="icon-btn trailer-close" [attr.aria-label]="t.close" (click)="modal.close()">
          <app-icon name="close" />
        </button>
        @if (open() && src(); as url) {
          <iframe
            [src]="url"
            [title]="t.trailer.title(title())"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        }
      </div>
    </dialog>
  `,
})
export class TrailerModal {
  readonly open = input(false);
  readonly videoKey = input.required<string>();
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly t = inject(STRINGS);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly src = computed<SafeResourceUrl | null>(() => {
    const url = trailerEmbedUrl(this.videoKey());
    // Safe: the key is validated above and the host is fixed.
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
}
