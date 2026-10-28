import { TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, SCHEMA_VERSION, StorageService } from './storage.service';

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    localStorage.clear();
    storage = TestBed.inject(StorageService);
  });

  it('round-trips values with a schema version', () => {
    const settings = {
      language: 'hu',
      maxRuntime: 120,
      decade: 1990,
      minRating: 7,
      region: 'PL',
      sound: true,
      platforms: { RO: [8], PL: [8, 505] },
    } as const;
    storage.write('settings', settings);
    expect(JSON.parse(localStorage.getItem('spinema:settings')!).v).toBe(SCHEMA_VERSION);
    expect(storage.read('settings')).toEqual(settings);
  });

  it('reads settings saved by an older version: no platform, any decade, any rating, its country kept', () => {
    localStorage.setItem('spinema:settings', JSON.stringify({ v: SCHEMA_VERSION, data: { maxRuntime: 90, region: 'RO', sound: false } }));
    expect(storage.read('settings')).toEqual({ ...DEFAULT_SETTINGS, maxRuntime: 90, region: 'RO' });
  });

  it('a new install follows the time zone: no country saved', () => {
    expect(DEFAULT_SETTINGS.region).toBeNull();
    localStorage.setItem('spinema:settings', JSON.stringify({ v: SCHEMA_VERSION, data: { ...DEFAULT_SETTINGS, region: 'Romania' } }));
    expect(storage.read('settings')?.region).toBeNull();
  });

  it('accepts only the offered decades and ratings', () => {
    localStorage.setItem('spinema:settings', JSON.stringify({ v: SCHEMA_VERSION, data: { ...DEFAULT_SETTINGS, decade: 1995, minRating: 9 } }));
    expect(storage.read('settings')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps only valid, unique platform ids, for any valid country code', () => {
    localStorage.setItem(
      'spinema:settings',
      JSON.stringify({
        v: SCHEMA_VERSION,
        data: { ...DEFAULT_SETTINGS, platforms: { RO: [8, 8, '119', -1, 1.5, 337], PL: 'all', US: [8], usa: [8] } },
      }),
    );
    expect(storage.read('settings')?.platforms).toEqual({ RO: [8, 337], US: [8] });
  });

  it('returns null for missing, corrupted or foreign-version data', () => {
    expect(storage.read('night')).toBeNull();
    localStorage.setItem('spinema:night', '{not json');
    expect(storage.read('night')).toBeNull();
    localStorage.setItem('spinema:night', JSON.stringify({ v: 999, data: { tokens: 3, startedAt: 1, seenIds: [] } }));
    expect(storage.read('night')).toBeNull();
    localStorage.setItem('spinema:night', JSON.stringify({ tokens: 3 }));
    expect(storage.read('night')).toBeNull();
  });

  it('replaces invalid settings fields with defaults', () => {
    localStorage.setItem('spinema:settings', JSON.stringify({ v: SCHEMA_VERSION, data: { maxRuntime: 45, region: 'Romania', sound: 'yes' } }));
    expect(storage.read('settings')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the valid history and already-seen entries and drops the broken ones', () => {
    const good = { id: 550, title: 'Fight Club', year: '1999', posterPath: '/p.jpg', at: 1 };
    const data = JSON.stringify({ v: SCHEMA_VERSION, data: [good, { id: 'x' }, null, { ...good, id: 551, at: 'later' }] });
    localStorage.setItem('spinema:history', data);
    localStorage.setItem('spinema:alreadySeen', data);
    expect(storage.read('history')).toEqual([good]);
    expect(storage.read('alreadySeen')).toEqual([good]);
  });

  it('sanitizes the night: no negative tokens, only numeric ids', () => {
    localStorage.setItem(
      'spinema:night',
      JSON.stringify({ v: SCHEMA_VERSION, data: { tokens: -2, startedAt: 5, seenIds: [1, 'two', 3] } }),
    );
    expect(storage.read('night')).toEqual({ tokens: 0, startedAt: 5, seenIds: [1, 3], vetoedGenreIds: [] });
  });

  it('keeps tonight\'s vetoed genres: valid ids, once each, in order', () => {
    localStorage.setItem(
      'spinema:night',
      JSON.stringify({ v: SCHEMA_VERSION, data: { tokens: 3, startedAt: 5, seenIds: [], vetoedGenreIds: [27, 'x', 37, 27] } }),
    );
    expect(storage.read('night')?.vetoedGenreIds).toEqual([27, 37]);
  });
});
