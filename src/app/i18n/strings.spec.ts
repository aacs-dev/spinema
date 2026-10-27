import { normalizeRo } from '../core/text';
import { ro } from './strings';

/** Collects every string in the dictionary, calling parametrized entries with sample values. */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') {
    const sample = (value as (...args: unknown[]) => unknown)('RO', 2, 3);
    return allStrings(sample);
  }
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe('Romanian dictionary', () => {
  const strings = allStrings(ro);

  it('has content', () => {
    expect(strings.length).toBeGreaterThan(80);
  });

  it('uses comma-below ș/ț everywhere, never the cedilla forms ş/ţ', () => {
    const offenders = strings.filter((s) => /[şţŞŢ]/.test(s));
    expect(offenders).toEqual([]);
  });

  it('keeps the exact copy the brief asks for', () => {
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
    expect(ro.about.tmdbNotice).toBe('This product uses the TMDB API but is not endorsed or certified by TMDB.');
  });

  it('never appends arrows to actions', () => {
    expect(strings.filter((s) => s.includes('→'))).toEqual([]);
  });
});

describe('normalizeRo', () => {
  it('turns cedilla letters into comma-below letters', () => {
    expect(normalizeRo('Ştefan şi Ţara ţesută')).toBe('Ștefan și Țara țesută');
  });
});
