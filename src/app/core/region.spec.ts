import { FALLBACK_REGIONS, SUGGESTED_REGIONS, TIME_ZONE_REGIONS, detectRegion, regionGroups } from './region';
import { isRegionCode } from './tmdb.models';

describe('detectRegion', () => {
  it('reads the country from the time zone', () => {
    expect(detectRegion('Europe/Bucharest')).toEqual({ region: 'RO', matched: true });
    expect(detectRegion('Europe/Chisinau')).toEqual({ region: 'MD', matched: true });
    expect(detectRegion('Europe/Budapest')).toEqual({ region: 'HU', matched: true });
    expect(detectRegion('Europe/Rome')).toEqual({ region: 'IT', matched: true });
    expect(detectRegion('America/Los_Angeles')).toEqual({ region: 'US', matched: true });
  });

  it('falls back to Romania, and says so, for a time zone that names no country', () => {
    for (const zone of ['UTC', 'Etc/GMT+3', 'Antarctica/Troll', '']) {
      expect(detectRegion(zone)).toEqual({ region: 'RO', matched: false });
    }
  });

  it('maps only to well-formed country codes, all of them in the fallback list once', () => {
    for (const code of Object.values(TIME_ZONE_REGIONS)) expect(isRegionCode(code)).toBe(true);
    expect(FALLBACK_REGIONS).toEqual(expect.arrayContaining(['RO', 'MD', 'HU', 'PL', 'IT', 'ES', 'DE', 'GB', 'US']));
    expect(new Set(FALLBACK_REGIONS).size).toBe(FALLBACK_REGIONS.length);
  });
});

describe('regionGroups', () => {
  const names: Record<string, string> = {
    RO: 'România',
    MD: 'Moldova',
    HU: 'Ungaria',
    PL: 'Polonia',
    US: 'Statele Unite',
    IT: 'Italia',
    AT: 'Austria',
  };
  const name = (code: string) => names[code] ?? code;

  it('puts the suggestions first, with the detected country among them, each group by name', () => {
    const groups = regionGroups(['US', 'RO', 'IT', 'AT', 'PL'], 'IT', 'RO', name, 'ro');
    expect(groups.suggested.map(name)).toEqual(['Italia', 'Moldova', 'Polonia', 'România', 'Ungaria']);
    expect(groups.others).toEqual(['AT', 'US']);
    expect(SUGGESTED_REGIONS.every((code) => groups.suggested.includes(code))).toBe(true);
  });

  it('always lists the current country, even when the list leaves it out', () => {
    expect(regionGroups(['US'], 'RO', 'IS', name, 'ro').others).toEqual(['IS', 'US']);
  });
});
