import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';
import { TIME_ZONE } from './tokens';

describe('SettingsService', () => {
  beforeEach(() => localStorage.clear());

  it('filters by platform only once some are ticked, and only for the current region', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.filters().platforms).toBeNull();

    settings.update({ platforms: { RO: [8, 1899], PL: [505] } });
    expect(settings.filters().platforms).toEqual({ region: 'RO', ids: [8, 1899] });

    settings.update({ region: 'PL' });
    expect(settings.filters().platforms).toEqual({ region: 'PL', ids: [505] });

    settings.update({ platforms: { RO: [8, 1899], PL: [] } });
    expect(settings.filters().platforms).toBeNull();
  });

  it('passes the decade and the minimum rating to the search', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.filters()).toMatchObject({ decade: null, minRating: null });
    settings.update({ decade: 1990, minRating: 7 });
    expect(settings.filters()).toMatchObject({ decade: 1990, minRating: 7 });
  });

  it('follows the time zone until a country is picked, and can go back to it', () => {
    TestBed.configureTestingModule({ providers: [{ provide: TIME_ZONE, useValue: 'Europe/Warsaw' }] });
    const settings = TestBed.inject(SettingsService);
    expect(settings.region()).toBe('PL');
    expect(settings.regionIsAuto()).toBe(true);
    expect(settings.detectedRegion).toEqual({ region: 'PL', matched: true });

    settings.update({ region: 'RO' });
    expect(settings.region()).toBe('RO');
    expect(settings.regionIsAuto()).toBe(false);

    settings.update({ region: null });
    expect(settings.region()).toBe('PL');
  });

  it('searches and keeps platforms for the detected country', () => {
    TestBed.configureTestingModule({ providers: [{ provide: TIME_ZONE, useValue: 'Europe/Warsaw' }] });
    const settings = TestBed.inject(SettingsService);
    settings.update({ platforms: { RO: [8], PL: [505] } });
    expect(settings.platformIds()).toEqual([505]);
    expect(settings.filters().platforms).toEqual({ region: 'PL', ids: [505] });
  });

  it('remembers the platforms after a reload', () => {
    TestBed.inject(SettingsService).update({ platforms: { RO: [337], PL: [] } });
    TestBed.resetTestingModule();
    expect(TestBed.inject(SettingsService).platformIds()).toEqual([337]);
  });
});
