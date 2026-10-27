import { TestBed } from '@angular/core/testing';
import { NIGHT_LENGTH_MS, NightService, TOKENS_PER_NIGHT } from './night.service';
import { NOW } from './tokens';

describe('NightService', () => {
  let now: number;

  const create = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: NOW, useValue: () => now }] });
    return TestBed.inject(NightService);
  };

  beforeEach(() => {
    localStorage.clear();
    now = Date.UTC(2026, 9, 26, 18, 0);
  });

  it('starts a night with 3 tokens and a free first spin', () => {
    const night = create();
    expect(night.tokens()).toBe(TOKENS_PER_NIGHT);
    expect(night.spinCost()).toBe(0);
    expect(night.canSpin()).toBe(true);
  });

  it('charges one token per spin once a result has been shown', () => {
    const night = create();
    night.markSeen(550);
    expect(night.spinCost()).toBe(1);
    expect(night.trySpend(1)).toBe(true);
    expect(night.trySpend(1)).toBe(true);
    expect(night.trySpend(1)).toBe(true);
    expect(night.tokens()).toBe(0);
    expect(night.trySpend(1)).toBe(false);
    expect(night.tokens()).toBe(0);
    expect(night.canSpin()).toBe(false);
  });

  it('survives a reload', () => {
    const first = create();
    first.markSeen(550);
    first.trySpend(1);
    const second = create();
    expect(second.tokens()).toBe(2);
    expect(second.night().seenIds).toEqual([550]);
    expect(second.lastSeenId()).toBe(550);
  });

  it('resets after 6 hours, not before', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);

    now += NIGHT_LENGTH_MS - 60_000;
    night.refresh();
    expect(night.tokens()).toBe(2);

    now += 60_000;
    night.refresh();
    expect(night.tokens()).toBe(3);
    expect(night.night().seenIds).toEqual([]);
    expect(night.night().startedAt).toBe(now);
  });

  it('starts a fresh night on load when the stored one is older than 6 hours', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    now += NIGHT_LENGTH_MS + 1;
    expect(create().tokens()).toBe(3);
  });

  it('checks the 6-hour limit when spending', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    night.trySpend(1);
    night.trySpend(1);
    now += NIGHT_LENGTH_MS;
    expect(night.trySpend(1)).toBe(true);
    expect(night.tokens()).toBe(2);
  });

  it('"Seară nouă" resets tokens and tonight\'s movies', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    night.reset();
    expect(night.tokens()).toBe(3);
    expect(night.spinCost()).toBe(0);
  });
});
