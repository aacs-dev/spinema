import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { InstallMode } from '../core/install-prompt';
import { STRINGS } from '../i18n/strings';
import { Icon } from './icon';

/**
 * "Put Spinema on your home screen", worded for what the browser allows: a button where it has an
 * install dialog, the share-menu steps on iPhone and iPad, a plain status otherwise. Used as the
 * strip under the header (dismissible) and as a section in settings.
 */
@Component({
  selector: 'app-install-offer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @switch (mode()) {
      @case ('prompt') {
        <span class="install-text">{{ t.install.pitch }}</span>
        <span class="install-actions">
          <button type="button" class="btn btn-primary btn-compact" (click)="install.emit()">{{ t.install.action }}</button>
          @if (dismissible()) {
            <button type="button" class="link-btn" (click)="dismiss.emit()">{{ t.install.dismiss }}</button>
          }
        </span>
      }
      @case ('ios') {
        <span class="install-text">
          {{ t.install.iosBefore }}
          <app-icon name="share" class="inline-icon" />
          <strong>{{ t.install.iosShare }}</strong>{{ t.install.iosAfter }}
        </span>
        @if (dismissible()) {
          <span class="install-actions">
            <button type="button" class="link-btn" (click)="dismiss.emit()">{{ t.install.gotIt }}</button>
          </span>
        }
      }
      @case ('installed') {
        <span class="install-text">{{ t.install.installed }}</span>
      }
      @default {
        <span class="install-text">{{ t.install.unavailable }}</span>
      }
    }
  `,
})
export class InstallOffer {
  readonly mode = input.required<InstallMode>();
  /** The strip under the header can be closed; the settings section cannot. */
  readonly dismissible = input(false);
  readonly install = output<void>();
  readonly dismiss = output<void>();

  protected readonly t = inject(STRINGS);
}
