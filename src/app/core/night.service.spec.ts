import { TestBed } from '@angular/core/testing';
import { NightService, TOKENS_PER_NIGHT, nightStartBefore } from './night.service';
import { NOW } from './tokens';

/** Local time, so the tests read the same in any time zone. Months are 0-based: 9 is October. */
const at = (day: number, hour: number, minute = 0, month = 9) => new Date(2026, month, day, hour, minute).getTime();

describe('nightStartBefore', () => {
  it('is the latest 06:00 at or before the given time', () => {
    expect(nightStartBefore(at(26, 20))).toBe(at(26, 6));
    expect(nightStartBefore(at(26, 6))).toBe(at(26, 6));
    expect(nightStartBefore(at(27, 1, 30))).toBe(at(26, 6));
    expect(nightStartBefore(at(27, 5, 59))).toBe(at(26, 6));
  });

  it('keeps 06:00 across the end of daylight saving time (25 October 2026)', () => {
    expect(nightStartBefore(at(25, 5, 59))).toBe(at(24, 6));
    expect(nightStartBefore(at(25, 6))).toBe(at(25, 6));
  });

  it('crosses month ends', () => {
    expect(nightStartBefore(new Date(2026, 10, 1, 2).getTime())).toBe(at(31, 6));
  });
});

describe('NightService', () => {
  let now: number;

  const create = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: NOW, useValue: () => now }] });
    return TestBed.inject(NightService);
  };

  beforeEach(() => {
    localStorage.clear();
    now = at(26, 20);
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

  it('lasts past midnight and resets at 06:00 the next morning', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);

    now = at(27, 0, 30);
    night.refresh();
    expect(night.tokens()).toBe(2);

    now = at(27, 5, 59);
    night.refresh();
    expect(night.tokens()).toBe(2);

    now = at(27, 6);
    night.refresh();
    expect(night.tokens()).toBe(3);
    expect(night.night().seenIds).toEqual([]);
    expect(night.night().startedAt).toBe(now);
  });

  it('a night opened after midnight belongs to the evening before', () => {
    now = at(27, 1, 30);
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    now = at(27, 5, 59);
    night.refresh();
    expect(night.tokens()).toBe(2);
    now = at(27, 6);
    night.refresh();
    expect(night.tokens()).toBe(3);
  });

  it('a night opened in the morning lasts the whole day', () => {
    now = at(26, 7);
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    now = at(26, 23, 59);
    night.refresh();
    expect(night.tokens()).toBe(2);
  });

  it('starts a fresh night on load when the stored one is from an earlier night', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    now = at(27, 21);
    expect(create().tokens()).toBe(3);
  });

  it('checks the night when spending', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    night.trySpend(1);
    night.trySpend(1);
    now = at(27, 6);
    expect(night.trySpend(1)).toBe(true);
    expect(night.tokens()).toBe(2);
  });

  it('starts a fresh night when the clock moved backwards', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    now = at(26, 19);
    night.refresh();
    expect(night.tokens()).toBe(3);
  });

  it('"Seară nouă" resets tokens, tonight\'s movies and the veto', () => {
    const night = create();
    night.markSeen(1);
    night.trySpend(1);
    night.setVetoes([27]);
    night.reset();
    expect(night.tokens()).toBe(3);
    expect(night.spinCost()).toBe(0);
    expect(night.vetoedGenreIds()).toEqual([]);
  });

  it('keeps the veto through a reload and drops it at 06:00', () => {
    create().setVetoes([27, 37, 27]);
    expect(create().vetoedGenreIds()).toEqual([27, 37]);
    now = at(27, 6);
    expect(create().vetoedGenreIds()).toEqual([]);
  });
});
