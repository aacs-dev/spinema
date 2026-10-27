import { TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, SCHEMA_VERSION, StorageService } from './storage.service';

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    localStorage.clear();
    storage = TestBed.inject(StorageService);
  });

  it('round-trips values with a schema version', () => {
    storage.write('settings', { maxRuntime: 120, region: 'PL', sound: true });
    expect(JSON.parse(localStorage.getItem('spinema:settings')!).v).toBe(SCHEMA_VERSION);
    expect(storage.read('settings')).toEqual({ maxRuntime: 120, region: 'PL', sound: true });
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
    localStorage.setItem('spinema:settings', JSON.stringify({ v: SCHEMA_VERSION, data: { maxRuntime: 45, region: 'US', sound: 'yes' } }));
    expect(storage.read('settings')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the valid history entries and drops the broken ones', () => {
    const good = { id: 550, title: 'Fight Club', year: '1999', posterPath: '/p.jpg', at: 1 };
    localStorage.setItem(
      'spinema:history',
      JSON.stringify({ v: SCHEMA_VERSION, data: [good, { id: 'x' }, null, { ...good, id: 551, at: 'later' }] }),
    );
    expect(storage.read('history')).toEqual([good]);
  });

  it('sanitizes the night: no negative tokens, only numeric ids', () => {
    localStorage.setItem(
      'spinema:night',
      JSON.stringify({ v: SCHEMA_VERSION, data: { tokens: -2, startedAt: 5, seenIds: [1, 'two', 3] } }),
    );
    expect(storage.read('night')).toEqual({ tokens: 0, startedAt: 5, seenIds: [1, 3] });
  });
});
