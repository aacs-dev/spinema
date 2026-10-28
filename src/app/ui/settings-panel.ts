import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { PlatformGroups, groupPlatforms } from '../core/platforms';
import { DetectedRegion, FALLBACK_REGIONS, regionGroups } from '../core/region';
import { Settings } from '../core/storage.service';
import { TmdbService } from '../core/tmdb.service';
import {
  DECADE_OPTIONS,
  Decade,
  MaxRuntime,
  MinRating,
  Platform,
  RATING_OPTIONS,
  RUNTIME_OPTIONS,
  Region,
} from '../core/tmdb.models';
import { LANGUAGES, LANGUAGE_NAMES, Language } from '../i18n/language';
import { STRINGS } from '../i18n/strings';
import { Icon } from './icon';
import { ModalDialog } from './modal-dialog';

/** One platform checkbox with its logo. */
@Component({
  selector: 'app-platform-choice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="choice platform">
      <input type="checkbox" [checked]="checked()" (change)="toggled.emit($any($event.target).checked)" />
      @if (logoUrl(); as src) {
        <img [src]="src" alt="" width="28" height="28" loading="lazy" />
      } @else {
        <span class="platform-logo platform-logo-missing" aria-hidden="true"></span>
      }
      <span>{{ platform().name }}</span>
    </label>
  `,
})
export class PlatformChoice {
  readonly platform = input.required<Platform>();
  readonly logoUrl = input<string | null>(null);
  readonly checked = input(false);
  readonly toggled = output<boolean>();
}

type PlatformsState = { region: Region; groups: PlatformGroups } | 'loading' | 'error';

@Component({
  selector: 'app-settings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialog, Icon, PlatformChoice],
  template: `
    <dialog class="sheet" [appModal]="open()" (closed)="closed.emit()" #modal="appModal" aria-labelledby="settings-title">
      <div class="sheet-inner">
        <header class="sheet-header">
          <h2 id="settings-title" class="sheet-title">{{ t.settings.title }}</h2>
          <button type="button" class="icon-btn" [attr.aria-label]="t.close" (click)="modal.close()">
            <app-icon name="close" />
          </button>
        </header>

        <fieldset class="field" aria-describedby="language-hint">
          <legend class="field-legend">{{ t.settings.language }}</legend>
          <div class="choices choices-grid">
            @for (language of languages; track language) {
              <label class="choice" [attr.lang]="language">
                <input
                  type="radio"
                  name="language"
                  [checked]="t.lang === language"
                  (change)="change.emit({ language })"
                />
                <span>{{ languageNames[language] }}</span>
              </label>
            }
          </div>
          <p id="language-hint" class="hint">{{ t.settings.languageHint }}</p>
        </fieldset>

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
          <legend class="field-legend">{{ t.settings.years }}</legend>
          <div class="choices choices-grid">
            @for (option of decadeOptions; track $index) {
              <label class="choice">
                <input type="radio" name="decade" [checked]="settings().decade === option" (change)="change.emit({ decade: option })" />
                <span>{{ option === null ? t.years.any : t.years.decade(option) }}</span>
              </label>
            }
          </div>
        </fieldset>

        <fieldset class="field" aria-describedby="rating-hint">
          <legend class="field-legend">{{ t.settings.rating }}</legend>
          <div class="choices choices-grid">
            @for (option of ratingOptions; track $index) {
              <label class="choice">
                <input type="radio" name="rating" [checked]="settings().minRating === option" (change)="change.emit({ minRating: option })" />
                <span>{{ option === null ? t.rating.any : t.rating.option(option) }}</span>
              </label>
            }
          </div>
          <p id="rating-hint" class="hint">{{ t.settings.ratingHint }}</p>
        </fieldset>

        <!--
          A native select: one line on the page, the phone's own list when it opens, and full
          keyboard and screen-reader support. The first option follows the time zone.
        -->
        <div class="field">
          <label class="field-legend" for="region-select">{{ t.settings.region }}</label>
          <select id="region-select" class="select" aria-describedby="region-hint" (change)="pickRegion($event)">
            <option value="" [selected]="regionIsAuto()">
              {{ t.settings.regionAutoOption(t.country(detectedRegion().region)) }}
            </option>
            <optgroup [label]="t.settings.regionSuggested">
              @for (code of regionGroups().suggested; track code) {
                <option [value]="code" [selected]="!regionIsAuto() && region() === code">{{ t.country(code) }}</option>
              }
            </optgroup>
            <optgroup [label]="t.settings.regionAll">
              @for (code of regionGroups().others; track code) {
                <option [value]="code" [selected]="!regionIsAuto() && region() === code">{{ t.country(code) }}</option>
              }
            </optgroup>
          </select>
          <!-- Says how the country was chosen, so a wrong guess is easy to spot and to fix. -->
          <p id="region-hint" class="hint">
            @if (regionIsAuto()) {
              {{ detectedRegion().matched ? t.settings.regionAuto : t.settings.regionFallback }}
            } @else {
              {{ t.settings.regionManual }}
            }
          </p>
        </div>

        <fieldset class="field" aria-describedby="platforms-hint">
          <legend class="field-legend">{{ t.settings.platforms }}</legend>
          <p id="platforms-hint" class="hint platforms-hint">{{ t.settings.platformsHint(region()) }}</p>

          @if (platformGroups(); as groups) {
            <div #platformList class="choices">
              @for (platform of groups.popular; track platform.id) {
                <app-platform-choice
                  [platform]="platform"
                  [logoUrl]="logoUrl(platform)"
                  [checked]="selected().has(platform.id)"
                  (toggled)="togglePlatform(platform.id, $event)"
                />
              }
            </div>
            @if (groups.others.length > 0) {
              <details class="more-platforms" [open]="otherSelected()">
                <summary>{{ t.settings.morePlatforms(groups.others.length) }}</summary>
                <div class="choices">
                  @for (platform of groups.others; track platform.id) {
                    <app-platform-choice
                      [platform]="platform"
                      [logoUrl]="logoUrl(platform)"
                      [checked]="selected().has(platform.id)"
                      (toggled)="togglePlatform(platform.id, $event)"
                    />
                  }
                </div>
              </details>
            }
            @if (selected().size > 0) {
              <button type="button" class="link-btn clear-platforms" (click)="clearPlatforms()">
                {{ t.settings.clearPlatforms }}
              </button>
            }
          } @else if (platforms() === 'error') {
            <p class="hint" role="status">{{ t.settings.platformsError }}</p>
            <button type="button" class="btn btn-secondary" (click)="loadPlatforms()">{{ t.errors.retry }}</button>
          } @else {
            <p class="hint" role="status">{{ t.settings.platformsLoading }}</p>
          }
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
  /** The country in effect, which follows the time zone while `settings().region` is null. */
  readonly region = input.required<Region>();
  readonly regionIsAuto = input(false);
  readonly detectedRegion = input.required<DetectedRegion>();
  readonly change = output<Partial<Settings>>();
  readonly newNight = output<void>();
  readonly about = output<void>();
  readonly closed = output<void>();

  protected readonly t = inject(STRINGS);
  private readonly tmdb = inject(TmdbService);
  private readonly platformList = viewChild<ElementRef<HTMLElement>>('platformList');
  protected readonly languages: readonly Language[] = LANGUAGES;
  protected readonly languageNames = LANGUAGE_NAMES;
  protected readonly runtimeOptions: readonly MaxRuntime[] = RUNTIME_OPTIONS;
  protected readonly decadeOptions: readonly Decade[] = DECADE_OPTIONS;
  protected readonly ratingOptions: readonly MinRating[] = RATING_OPTIONS;
  protected readonly confirmation = signal('');

  /** TMDB's countries once loaded; until then, or if the Worker lacks the route, a local list. */
  private readonly availableRegions = signal<readonly Region[]>(FALLBACK_REGIONS);
  protected readonly regionGroups = computed(() =>
    regionGroups(this.availableRegions(), this.detectedRegion().region, this.region(), this.t.country, this.t.locale),
  );
  protected readonly platforms = signal<PlatformsState>('loading');
  protected readonly platformGroups = computed(() => {
    const state = this.platforms();
    return typeof state === 'object' && state.region === this.region() ? state.groups : null;
  });
  protected readonly selected = computed(() => new Set(this.settings().platforms[this.region()] ?? []));
  /** "Alte platforme" starts open when one of them is ticked, so no choice is hidden. */
  protected readonly otherSelected = computed(
    () => this.platformGroups()?.others.some((p) => this.selected().has(p.id)) ?? false,
  );

  constructor() {
    this.tmdb.regions().then(
      (codes) => this.availableRegions.set(codes),
      () => undefined,
    );
    // The panel is created the first time it opens, so the list loads then, and again per region.
    effect(() => {
      const region = this.region();
      untracked(() => this.loadPlatforms(region));
    });
  }

  protected loadPlatforms(region = this.region()): void {
    this.platforms.set('loading');
    this.tmdb.platforms(region).then(
      (list) => {
        if (this.region() === region) this.platforms.set({ region, groups: groupPlatforms(list, this.t.locale) });
      },
      () => {
        if (this.region() === region) this.platforms.set('error');
      },
    );
  }

  protected logoUrl(platform: Platform): string | null {
    return platform.logoPath ? this.tmdb.imageUrl(platform.logoPath, 'w92') : null;
  }

  protected togglePlatform(id: Platform['id'], checked: boolean): void {
    const current = this.settings().platforms[this.region()] ?? [];
    const next = checked ? [...current.filter((x) => x !== id), id] : current.filter((x) => x !== id);
    this.change.emit({ platforms: { ...this.settings().platforms, [this.region()]: next } });
  }

  protected clearPlatforms(): void {
    this.change.emit({ platforms: { ...this.settings().platforms, [this.region()]: [] } });
    // The button disappears with the last tick; keep focus inside the list.
    this.platformList()?.nativeElement.querySelector('input')?.focus();
  }

  protected pickRegion(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.change.emit({ region: value === '' ? null : value });
  }

  protected toggleSound(event: Event): void {
    this.change.emit({ sound: (event.target as HTMLInputElement).checked });
  }

  protected startNewNight(): void {
    this.newNight.emit();
    this.confirmation.set(this.t.announce.newNight);
  }
}
