import { TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, Settings } from '../core/storage.service';
import { TmdbService } from '../core/tmdb.service';
import { Platform } from '../core/tmdb.models';
import { SettingsPanel } from './settings-panel';

const LIST: Platform[] = [
  { id: 475, name: 'DOCSVILLE', logoPath: null },
  { id: 8, name: 'Netflix', logoPath: '/n.jpg' },
  { id: 1899, name: 'HBO Max', logoPath: '/h.jpg' },
  { id: 35, name: 'Rakuten TV', logoPath: null },
];

async function mount(settings: Settings) {
  const tmdb = {
    platforms: vi.fn(async () => LIST),
    regions: vi.fn(async () => ['RO', 'PL', 'US', 'AT']),
    imageUrl: (path: string) => `https://img.test${path}`,
  };
  TestBed.configureTestingModule({ providers: [{ provide: TmdbService, useValue: tmdb }] });
  const fixture = TestBed.createComponent(SettingsPanel);
  fixture.componentRef.setInput('settings', settings);
  fixture.componentRef.setInput('region', settings.region ?? 'RO');
  fixture.componentRef.setInput('regionIsAuto', settings.region === null);
  fixture.componentRef.setInput('detectedRegion', { region: 'RO', matched: true });
  const changes: Partial<Settings>[] = [];
  fixture.componentInstance.change.subscribe((patch) => changes.push(patch));
  await fixture.whenStable();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const box = (name: string) =>
    [...el.querySelectorAll<HTMLLabelElement>('.platform')].find((l) => l.textContent?.includes(name))!.querySelector('input')!;
  return { fixture, el, tmdb, changes, box };
}

describe('SettingsPanel platforms', () => {
  it('shows the popular platforms first and the rest folded, for the current region', async () => {
    const { el, tmdb } = await mount({ ...DEFAULT_SETTINGS, region: 'PL' });
    expect(tmdb.platforms).toHaveBeenCalledWith('PL');
    const [popular, others] = [...el.querySelectorAll('fieldset .choices')].slice(-2);
    expect([...popular.querySelectorAll('.platform')].map((l) => l.textContent?.trim())).toEqual(['Netflix', 'HBO Max']);
    expect([...others.querySelectorAll('.platform')].map((l) => l.textContent?.trim())).toEqual(['DOCSVILLE', 'Rakuten TV']);
    expect(el.querySelector('details.more-platforms')?.hasAttribute('open')).toBe(false);
  });

  it('ticking and unticking saves the list for the current region only', async () => {
    const { box, changes } = await mount({ ...DEFAULT_SETTINGS, platforms: { RO: [8], PL: [505] } });
    expect(box('Netflix').checked).toBe(true);

    box('HBO Max').click();
    expect(changes.at(-1)).toEqual({ platforms: { RO: [8, 1899], PL: [505] } });

    box('Netflix').click();
    expect(changes.at(-1)).toEqual({ platforms: { RO: [], PL: [505] } });
  });

  it('offers the decades and ratings, and saves the one picked', async () => {
    const { el, changes } = await mount({ ...DEFAULT_SETTINGS, minRating: 7 });
    const radios = (name: string) => [...el.querySelectorAll<HTMLInputElement>(`input[name=${name}]`)];
    const labels = (name: string) => radios(name).map((r) => r.parentElement?.textContent?.trim());
    expect(labels('decade')).toEqual(['Orice an', 'Anii ’60', 'Anii ’70', 'Anii ’80', 'Anii ’90', 'Anii 2000', 'Anii 2010', 'Anii 2020']);
    expect(labels('rating')).toEqual(['Orice notă', 'Cel puțin 6', 'Cel puțin 7', 'Cel puțin 8']);
    expect(radios('rating')[2].checked).toBe(true);

    radios('decade')[4].click();
    expect(changes.at(-1)).toEqual({ decade: 1990 });
    radios('rating')[0].click();
    expect(changes.at(-1)).toEqual({ minRating: null });
  });

  it('picks the country in one compact select: automatic first, then suggestions, then all', async () => {
    const auto = await mount(DEFAULT_SETTINGS);
    const select = auto.el.querySelector<HTMLSelectElement>('#region-select')!;
    expect(select.options[0].textContent?.trim()).toBe('Automat, după fusul orar: România');
    expect(select.value).toBe('');
    const groups = [...select.querySelectorAll('optgroup')].map((g) => [
      g.label,
      [...g.querySelectorAll('option')].map((o) => o.textContent?.trim()),
    ]);
    expect(groups).toEqual([
      ['Recomandate', ['Polonia', 'Republica Moldova', 'România', 'Ungaria']],
      ['Toate țările', ['Austria', 'Statele Unite ale Americii']],
    ]);
    expect(auto.el.querySelector('#region-hint')?.textContent?.trim()).toBe('Aleasă automat, după fusul orar al telefonului.');

    select.value = 'US';
    select.dispatchEvent(new Event('change'));
    expect(auto.changes.at(-1)).toEqual({ region: 'US' });
  });

  it('shows a picked country as picked, and the first option goes back to automatic', async () => {
    const manual = await mount({ ...DEFAULT_SETTINGS, region: 'AT' });
    const select = manual.el.querySelector<HTMLSelectElement>('#region-select')!;
    expect(select.value).toBe('AT');
    expect(manual.el.querySelector('#region-hint')?.textContent?.trim()).toBe('Aleasă de tine.');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(manual.changes.at(-1)).toEqual({ region: null });
  });

  it('opens "Alte platforme" when one of them is ticked', async () => {
    const { el } = await mount({ ...DEFAULT_SETTINGS, platforms: { RO: [35], PL: [] } });
    expect(el.querySelector('details.more-platforms')?.hasAttribute('open')).toBe(true);
  });
});
