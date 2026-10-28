import { TestBed } from '@angular/core/testing';
import { normalizeRo } from '../core/text';
import { StorageService } from '../core/storage.service';
import { en } from './en';
import { hu } from './hu';
import { LANGUAGES, resolveLanguage } from './language';
import { ro } from './ro';
import { Dictionary, STRINGS, loadDictionary, startupLanguage } from './strings';

/** Collects every string in a dictionary, calling parametrized entries with sample values. */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    // Region-taking entries want 'RO'; formatters want numbers.
    let sample: unknown;
    try {
      sample = fn('RO', 2, 3);
    } catch {
      sample = fn(2, 3);
    }
    return allStrings(sample);
  }
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe.each([
  ['Romanian', ro],
  ['English', en],
  ['Hungarian', hu],
] as [string, Dictionary][])('%s dictionary', (_name, dictionary) => {
  const strings = allStrings(dictionary);

  it('has content, and no empty entry except the English local TMDB notice', () => {
    expect(strings.length).toBeGreaterThan(150);
    const empty = strings.filter((s) => s.trim() === '');
    expect(empty).toEqual(dictionary === en ? [''] : []);
  });

  it('keeps TMDB’s required notice word for word, in English', () => {
    expect(dictionary.about.tmdbNotice).toBe('This product uses the TMDB API but is not endorsed or certified by TMDB.');
  });

  it('never appends arrows to actions', () => {
    expect(strings.filter((s) => s.includes('→'))).toEqual([]);
  });
});

describe('orthography', () => {
  it('Romanian uses comma-below ș/ț everywhere, never the cedilla forms ş/ţ', () => {
    expect(allStrings(ro).filter((s) => /[şţŞŢ]/.test(s))).toEqual([]);
  });

  it('Hungarian uses ő/ű, never the look-alikes õ/ô/û/ũ', () => {
    expect(allStrings(hu).filter((s) => /[õôûũÕÔÛŨ]/.test(s))).toEqual([]);
  });

  it('keeps the exact Romanian copy the brief asks for', () => {
    expect(ro.wheel.spin).toBe('Învârte');
    expect(ro.card.accept).toBe('Îl vedem!');
    expect(ro.card.respin).toBe('Altă tură');
    expect(ro.card.save).toBe('Salvează pentru altă dată');
    expect(ro.card.share).toBe('Trimite');
    expect(ro.settings.newNight).toBe('Seară nouă');
    expect(ro.card.noTokens).toBe('Fără jetoane. Rămâne filmul ăsta.');
    expect(ro.card.spinYourself).toBe('Învârte și tu');
    expect(ro.card.overviewEnglish).toBe('Rezumat în engleză');
    expect(ro.errors.movies).toBe('Nu am putut încărca filmele. Verifică conexiunea și încearcă din nou.');
  });
});

describe('grammar helpers', () => {
  it('counts platforms the Romanian way, with "de" from 20 up', () => {
    expect(ro.schedule.myPlatforms(1)).toBe('Pe platforma ta');
    expect(ro.schedule.myPlatforms(3)).toBe('Pe 3 platforme ale tale');
    expect(ro.schedule.myPlatforms(19)).toBe('Pe 19 platforme ale tale');
    expect(ro.schedule.myPlatforms(20)).toBe('Pe 20 de platforme ale tale');
    expect(ro.schedule.myPlatforms(101)).toBe('Pe 101 platforme ale tale');
  });

  it('names decades and ratings the way people say them', () => {
    expect(ro.years.decade(1960)).toBe('Anii ’60');
    expect(ro.years.decade(1990)).toBe('Anii ’90');
    expect(ro.years.decade(2000)).toBe('Anii 2000');
    expect(ro.rating.option(7)).toBe('Cel puțin 7');
    expect(ro.rating.short(7)).toBe('Nota 7+');
    expect(en.years.decade(1990)).toBe('The ’90s');
    expect(en.years.decade(2010)).toBe('The 2010s');
    expect([1960, 1970, 1980, 1990, 2000, 2010, 2020].map((d) => hu.years.decade(d))).toEqual([
      '60-as évek',
      '70-es évek',
      '80-as évek',
      '90-es évek',
      '2000-es évek',
      '2010-es évek',
      '2020-as évek',
    ]);
  });

  it('names any country, and phrases "where to watch" around it in each language', () => {
    expect(ro.card.whereToWatch('RO')).toBe('Unde îl vezi în România');
    expect(ro.card.whereToWatch('MD')).toBe('Unde îl vezi în Republica Moldova');
    expect(en.card.whereToWatch('IT')).toBe('Where to watch in Italy');
    expect(en.card.whereToWatch('GB')).toBe('Where to watch in the United Kingdom');
    expect(en.card.whereToWatch('NL')).toBe('Where to watch in the Netherlands');
    expect(hu.card.whereToWatch('HU')).toBe('Hol nézheted – Magyarország');
    expect(ro.country('XX')).toBe('XX');
  });

  it('picks the Hungarian article by the first sound: a Horror, az Akció', () => {
    expect(hu.veto.removed('Horror')).toBe('A Horror lekerült a kerékről.');
    expect(hu.veto.removed('Akció')).toBe('Az Akció lekerült a kerékről.');
    expect(hu.veto.removed('Űrkaland')).toBe('Az Űrkaland lekerült a kerékről.');
  });

  it('formats ratings, running times and dates per language', () => {
    expect([ro, en, hu].map((d) => d.format.rating(7.25))).toEqual(['7,3', '7.3', '7,3']);
    expect([ro, en, hu].map((d) => d.format.runtime(132))).toEqual(['2 h 12 min', '2h 12m', '2 ó 12 p']);
    expect([ro, en, hu].map((d) => d.format.runtime(45))).toEqual(['45 min', '45m', '45 p']);
    const day = new Date(2026, 9, 28, 20).getTime();
    expect([ro, en, hu].map((d) => d.format.date(day))).toEqual(['28.10.2026', '28/10/2026', '2026. 10. 28.']);
  });
});

describe('interface language', () => {
  it('follows the choice in settings, then the browser, then defaults to Romanian', () => {
    expect(resolveLanguage('en', ['hu-HU'])).toBe('en');
    expect(resolveLanguage(null, ['pl-PL', 'hu-HU', 'en-US'])).toBe('hu');
    expect(resolveLanguage(null, ['en-GB'])).toBe('en');
    expect(resolveLanguage(null, ['pl-PL', 'de'])).toBe('ro');
    expect(resolveLanguage(null, [])).toBe('ro');
  });

  it('starts in the language saved in settings, whatever the browser says', () => {
    localStorage.clear();
    expect(startupLanguage(['en-US'])).toBe('en');
    TestBed.inject(StorageService).write('settings', {
      language: 'hu',
      maxRuntime: null,
      decade: null,
      minRating: null,
      region: 'RO',
      sound: false,
      platforms: { RO: [], PL: [] },
    });
    expect(startupLanguage(['en-US'])).toBe('hu');
    localStorage.clear();
  });

  it('loads a dictionary for every language, each labelled with its own code', async () => {
    for (const language of LANGUAGES) expect((await loadDictionary(language)).lang).toBe(language);
    expect(await loadDictionary('hu')).toBe(hu);
  });

  it('defaults to Romanian when nothing is provided', () => {
    expect(TestBed.inject(STRINGS)).toBe(ro);
  });
});

describe('normalizeRo', () => {
  it('turns cedilla letters into comma-below letters', () => {
    expect(normalizeRo('Ştefan şi Ţara ţesută')).toBe('Ștefan și Țara țesută');
  });
});
