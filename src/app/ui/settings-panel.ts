import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Settings } from '../core/storage.service';
import { MaxRuntime, REGIONS, RUNTIME_OPTIONS, Region } from '../core/tmdb.models';
import { STRINGS } from '../i18n/strings';
import { Icon } from './icon';
import { ModalDialog } from './modal-dialog';

@Component({
  selector: 'app-settings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialog, Icon],
  template: `
    <dialog class="sheet" [appModal]="open()" (closed)="closed.emit()" #modal="appModal" aria-labelledby="settings-title">
      <div class="sheet-inner">
        <header class="sheet-header">
          <h2 id="settings-title" class="sheet-title">{{ t.settings.title }}</h2>
          <button type="button" class="icon-btn" [attr.aria-label]="t.close" (click)="modal.close()">
            <app-icon name="close" />
          </button>
        </header>

        <fieldset class="field">
          <legend class="field-legend">{{ t.settings.runtime }}</legend>
          <div class="choices">
            @for (option of runtimeOptions; track $index) {
              <label class="choice">
                <input
                  type="radio"
                  name="runtime"
                  [checked]="settings().maxRuntime === option"
                  (change)="change.emit({ maxRuntime: option })"
                />
                <span>{{ option === null ? t.runtime.any : t.runtime.option(option) }}</span>
              </label>
            }
          </div>
        </fieldset>

        <fieldset class="field">
          <legend class="field-legend">{{ t.settings.region }}</legend>
          <div class="choices">
            @for (region of regions; track region) {
              <label class="choice">
                <input
                  type="radio"
                  name="region"
                  [checked]="settings().region === region"
                  (change)="change.emit({ region })"
                />
                <span>{{ t.regionNames[region] }}</span>
              </label>
            }
          </div>
        </fieldset>

        <div class="field">
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              [checked]="settings().sound"
              aria-describedby="sound-hint"
              (change)="toggleSound($event)"
            />
            <span class="switch-label">{{ t.settings.sound }}</span>
          </label>
          <p id="sound-hint" class="hint">{{ t.settings.soundHint }}</p>
        </div>

        <div class="field">
          <button type="button" class="btn btn-secondary" aria-describedby="night-hint" (click)="startNewNight()">
            {{ t.settings.newNight }}
          </button>
          <p id="night-hint" class="hint">{{ t.settings.newNightHint }}</p>
          <p class="hint confirm" role="status">{{ confirmation() }}</p>
        </div>

        <button type="button" class="link-btn" (click)="about.emit()">{{ t.settings.about }}</button>
      </div>
    </dialog>
  `,
})
export class SettingsPanel {
  readonly open = input(false);
  readonly settings = input.required<Settings>();
  readonly change = output<Partial<Settings>>();
  readonly newNight = output<void>();
  readonly about = output<void>();
  readonly closed = output<void>();

  protected readonly t = inject(STRINGS);
  protected readonly runtimeOptions: readonly MaxRuntime[] = RUNTIME_OPTIONS;
  protected readonly regions: readonly Region[] = REGIONS;
  protected readonly confirmation = signal('');

  protected toggleSound(event: Event): void {
    this.change.emit({ sound: (event.target as HTMLInputElement).checked });
  }

  protected startNewNight(): void {
    this.newNight.emit();
    this.confirmation.set(this.t.announce.newNight);
  }
}
